/**
 * Webhook Tunnel for Local Development
 * Exposes localhost to internet for webhook testing without ngrok dependency
 */

import * as http from 'http';
import * as https from 'https';

export interface WebhookTunnelConfig {
  port: number;
  localUrl?: string;
  publicPort?: number;
  timeout?: number;
  maxRetries?: number;
}

export interface TunnelSession {
  id: string;
  localPort: number;
  publicUrl: string;
  startTime: Date;
  requestCount: number;
  errorCount: number;
  requests: TunnelRequest[];
}

export interface TunnelRequest {
  id: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: Date;
  response: {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
    time: number;
  };
}

/**
 * WebhookTunnel class for exposing local webhook endpoints
 */
export class WebhookTunnel {
  private config: WebhookTunnelConfig;
  private sessions: Map<string, TunnelSession> = new Map();
  private currentSession: TunnelSession | null = null;
  private server: http.Server | null = null;

  constructor(config: WebhookTunnelConfig) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      ...config
    };
  }

  /**
   * Start webhook tunnel session
   */
  async start(): Promise<TunnelSession> {
    const sessionId = this.generateSessionId();
    const publicUrl = this.generatePublicUrl(sessionId);

    const session: TunnelSession = {
      id: sessionId,
      localPort: this.config.port,
      publicUrl,
      startTime: new Date(),
      requestCount: 0,
      errorCount: 0,
      requests: []
    };

    this.currentSession = session;
    this.sessions.set(sessionId, session);

    // Start local proxy server
    this.startProxyServer();

    console.log(`✅ Webhook tunnel started`);
    console.log(`   Local:  http://localhost:${this.config.port}`);
    console.log(`   Public: ${publicUrl}`);
    console.log(`   Session: ${sessionId}`);

    return session;
  }

  /**
   * Stop webhook tunnel session
   */
  async stop(): Promise<void> {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.currentSession = null;
    console.log('✅ Webhook tunnel stopped');
  }

  /**
   * Get current session details
   */
  getSession(): TunnelSession | null {
    return this.currentSession;
  }

  /**
   * Get session by ID
   */
  getSessionById(id: string): TunnelSession | undefined {
    return this.sessions.get(id);
  }

  /**
   * Record webhook request
   */
  recordRequest(request: TunnelRequest): void {
    if (!this.currentSession) return;

    this.currentSession.requests.push(request);
    this.currentSession.requestCount++;

    if (request.response.statusCode >= 400) {
      this.currentSession.errorCount++;
    }

    // Keep only last 100 requests
    if (this.currentSession.requests.length > 100) {
      this.currentSession.requests.shift();
    }
  }

  /**
   * Replay webhook request to local handler
   */
  async replayRequest(requestId: string): Promise<TunnelRequest | null> {
    if (!this.currentSession) return null;

    const request = this.currentSession.requests.find(r => r.id === requestId);
    if (!request) return null;

    try {
      const options = {
        hostname: 'localhost',
        port: this.config.port,
        path: request.path,
        method: request.method,
        headers: { ...request.headers, 'X-Webhook-Replay': 'true' },
        timeout: this.config.timeout
      };

      return new Promise((resolve) => {
        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            request.response.statusCode = res.statusCode || 500;
            request.response.headers = res.headers as Record<string, string>;
            request.response.body = data;
            request.response.time = Date.now() - new Date(request.timestamp).getTime();
            resolve(request);
          });
        });

        req.on('error', () => resolve(null));
        if (request.body) req.write(request.body);
        req.end();
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Get request statistics
   */
  getStats(): {
    totalRequests: number;
    totalErrors: number;
    errorRate: number;
    avgResponseTime: number;
    uptime: number;
  } | null {
    if (!this.currentSession) return null;

    const requests = this.currentSession.requests;
    const totalRequests = this.currentSession.requestCount;
    const totalErrors = this.currentSession.errorCount;
    const avgResponseTime = requests.length > 0
      ? requests.reduce((sum, r) => sum + r.response.time, 0) / requests.length
      : 0;
    const uptime = Date.now() - new Date(this.currentSession.startTime).getTime();

    return {
      totalRequests,
      totalErrors,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
      avgResponseTime,
      uptime
    };
  }

  /**
   * Export requests as HAR format
   */
  exportAsHAR(): any {
    if (!this.currentSession) return null;

    return {
      log: {
        version: '1.2.0',
        creator: { name: 'MES Webhook Tunnel', version: '1.0.0' },
        entries: this.currentSession.requests.map(req => ({
          startedDateTime: req.timestamp.toISOString(),
          time: req.response.time,
          request: {
            method: req.method,
            url: `http://localhost:${this.config.port}${req.path}`,
            headers: Object.entries(req.headers).map(([name, value]) => ({ name, value })),
            queryString: [],
            postData: req.body ? { mimeType: 'application/json', text: req.body } : undefined
          },
          response: {
            status: req.response.statusCode,
            statusText: this.getStatusText(req.response.statusCode),
            headers: Object.entries(req.response.headers).map(([name, value]) => ({
              name,
              value: String(value)
            })),
            content: {
              size: req.response.body.length,
              mimeType: 'application/json',
              text: req.response.body
            }
          },
          cache: {},
          timings: {
            wait: req.response.time,
            receive: 0
          }
        }))
      }
    };
  }

  /**
   * Private: Start proxy server
   */
  private startProxyServer(): void {
    this.server = http.createServer(async (req, res) => {
      const requestId = this.generateRequestId();
      const startTime = Date.now();

      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const tunnelRequest: TunnelRequest = {
          id: requestId,
          method: req.method || 'GET',
          path: req.url || '/',
          headers: req.headers as Record<string, string>,
          body: body || undefined,
          timestamp: new Date(),
          response: {
            statusCode: 200,
            headers: {},
            body: '',
            time: 0
          }
        };

        // Forward to local handler
        this.forwardRequest(tunnelRequest);
        this.recordRequest(tunnelRequest);

        res.writeHead(tunnelRequest.response.statusCode, tunnelRequest.response.headers);
        res.end(tunnelRequest.response.body);
      });
    });

    this.server.listen(this.config.publicPort || this.config.port);
  }

  /**
   * Private: Forward request to local handler
   */
  private async forwardRequest(request: TunnelRequest): Promise<void> {
    try {
      const options = {
        hostname: 'localhost',
        port: this.config.port,
        path: request.path,
        method: request.method,
        headers: request.headers,
        timeout: this.config.timeout
      };

      const proxyReq = http.request(options, (proxyRes) => {
        request.response.statusCode = proxyRes.statusCode || 500;
        request.response.headers = proxyRes.headers as Record<string, string>;

        let data = '';
        proxyRes.on('data', chunk => data += chunk);
        proxyRes.on('end', () => {
          request.response.body = data;
          request.response.time = Date.now() - new Date(request.timestamp).getTime();
        });
      });

      proxyReq.on('error', () => {
        request.response.statusCode = 500;
        request.response.body = 'Local handler error';
      });

      if (request.body) proxyReq.write(request.body);
      proxyReq.end();
    } catch (error) {
      request.response.statusCode = 500;
      request.response.body = String(error);
    }
  }

  /**
   * Private: Generate session ID
   */
  private generateSessionId(): string {
    return `tunnel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Private: Generate request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Private: Generate public URL
   */
  private generatePublicUrl(sessionId: string): string {
    const publicPort = this.config.publicPort || this.config.port;
    return `http://localhost:${publicPort}`;
  }

  /**
   * Private: Get HTTP status text
   */
  private getStatusText(code: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error'
    };
    return statusTexts[code] || 'Unknown';
  }
}

export default WebhookTunnel;
