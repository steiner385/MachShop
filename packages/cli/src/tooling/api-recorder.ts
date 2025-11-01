/**
 * API Call Recorder and Playback System
 * Records actual API responses for replay in tests (VCR-like functionality)
 */

import * as fs from 'fs';
import * as path from 'path';

export interface RecordedCall {
  id: string;
  timestamp: Date;
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
  };
  response: {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
  };
  duration: number;
  tags: string[];
}

export interface RecordingSession {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  calls: RecordedCall[];
  isRecording: boolean;
}

/**
 * APIRecorder class for recording and replaying API calls
 */
export class APIRecorder {
  private session: RecordingSession | null = null;
  private recordingsDir: string;
  private originalFetch?: typeof global.fetch;
  private matcher: CallMatcher;

  constructor(recordingsDir: string = './recordings') {
    this.recordingsDir = recordingsDir;
    this.matcher = new CallMatcher();

    // Create recordings directory if it doesn't exist
    if (!fs.existsSync(this.recordingsDir)) {
      fs.mkdirSync(this.recordingsDir, { recursive: true });
    }
  }

  /**
   * Start recording API calls
   */
  startRecording(name: string, tags: string[] = []): RecordingSession {
    this.session = {
      id: `session_${Date.now()}`,
      name,
      startTime: new Date(),
      calls: [],
      isRecording: true
    };

    // Intercept fetch calls
    this.interceptFetch();

    console.log(`✅ Recording started: ${name}`);
    return this.session;
  }

  /**
   * Stop recording and save
   */
  async stopRecording(): Promise<string> {
    if (!this.session) {
      return '';
    }

    this.session.endTime = new Date();
    this.session.isRecording = false;

    // Restore original fetch
    this.restoreFetch();

    // Save to disk
    const filename = await this.saveSession(this.session);
    console.log(`✅ Recording stopped. Saved to: ${filename}`);

    return filename;
  }

  /**
   * Record a single API call
   */
  recordCall(
    method: string,
    url: string,
    headers: Record<string, string>,
    requestBody: string | undefined,
    statusCode: number,
    responseHeaders: Record<string, string>,
    responseBody: string,
    duration: number,
    tags: string[] = []
  ): RecordedCall {
    if (!this.session) {
      throw new Error('No active recording session');
    }

    const call: RecordedCall = {
      id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      request: {
        method,
        url,
        headers,
        body: requestBody
      },
      response: {
        statusCode,
        headers: responseHeaders,
        body: responseBody
      },
      duration,
      tags: [...tags, ...this.session.call?.tags || []]
    };

    this.session.calls.push(call);
    return call;
  }

  /**
   * Load a recording session
   */
  loadSession(name: string): RecordingSession | null {
    const filename = path.join(this.recordingsDir, `${name}.json`);

    if (!fs.existsSync(filename)) {
      console.error(`Recording not found: ${filename}`);
      return null;
    }

    try {
      const data = JSON.parse(fs.readFileSync(filename, 'utf-8'));
      return data;
    } catch (error) {
      console.error(`Failed to load recording: ${error}`);
      return null;
    }
  }

  /**
   * Find matching call in recording
   */
  findMatchingCall(
    method: string,
    url: string,
    headers?: Record<string, string>,
    body?: string
  ): RecordedCall | null {
    if (!this.session) {
      return null;
    }

    return this.matcher.findMatch(this.session.calls, {
      method,
      url,
      headers,
      body
    });
  }

  /**
   * Get all calls matching criteria
   */
  getCallsByCriteria(criteria: {
    method?: string;
    urlPattern?: RegExp;
    statusCode?: number;
    tags?: string[];
  }): RecordedCall[] {
    if (!this.session) {
      return [];
    }

    return this.session.calls.filter(call => {
      if (criteria.method && call.request.method !== criteria.method) return false;
      if (criteria.urlPattern && !criteria.urlPattern.test(call.request.url)) return false;
      if (criteria.statusCode && call.response.statusCode !== criteria.statusCode) return false;
      if (criteria.tags && !criteria.tags.every(tag => call.tags.includes(tag))) return false;
      return true;
    });
  }

  /**
   * Export session as HAR format
   */
  exportAsHAR(session: RecordingSession): any {
    return {
      log: {
        version: '1.2.0',
        creator: { name: 'MES API Recorder', version: '1.0.0' },
        entries: session.calls.map(call => ({
          startedDateTime: call.timestamp.toISOString(),
          time: call.duration,
          request: {
            method: call.request.method,
            url: call.request.url,
            headers: Object.entries(call.request.headers).map(([name, value]) => ({
              name,
              value
            })),
            queryString: [],
            postData: call.request.body
              ? { mimeType: 'application/json', text: call.request.body }
              : undefined
          },
          response: {
            status: call.response.statusCode,
            statusText: this.getStatusText(call.response.statusCode),
            headers: Object.entries(call.response.headers).map(([name, value]) => ({
              name,
              value
            })),
            content: {
              size: call.response.body.length,
              mimeType: 'application/json',
              text: call.response.body
            }
          },
          cache: {},
          timings: {
            wait: call.duration,
            receive: 0
          }
        }))
      }
    };
  }

  /**
   * Private: Intercept fetch calls
   */
  private interceptFetch(): void {
    this.originalFetch = global.fetch;

    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const startTime = Date.now();
      const url = input instanceof Request ? input.url : String(input);
      const method = init?.method || 'GET';
      const headers = init?.headers as Record<string, string> || {};
      const body = init?.body ? String(init.body) : undefined;

      try {
        const response = await this.originalFetch!(input, init);
        const responseBody = await response.clone().text();
        const responseHeaders = Object.fromEntries(response.headers);
        const duration = Date.now() - startTime;

        // Record the call
        this.recordCall(
          method,
          url,
          headers,
          body,
          response.status,
          responseHeaders,
          responseBody,
          duration
        );

        return response;
      } catch (error) {
        console.error(`Request failed: ${method} ${url}`, error);
        throw error;
      }
    } as any;
  }

  /**
   * Private: Restore original fetch
   */
  private restoreFetch(): void {
    if (this.originalFetch) {
      global.fetch = this.originalFetch;
    }
  }

  /**
   * Private: Save session to disk
   */
  private async saveSession(session: RecordingSession): Promise<string> {
    const filename = path.join(
      this.recordingsDir,
      `${session.name}_${Date.now()}.json`
    );

    const data = JSON.stringify(session, null, 2);
    await fs.promises.writeFile(filename, data, 'utf-8');

    return filename;
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

/**
 * Call matcher for finding recorded calls
 */
class CallMatcher {
  findMatch(
    calls: RecordedCall[],
    criteria: {
      method: string;
      url: string;
      headers?: Record<string, string>;
      body?: string;
    }
  ): RecordedCall | null {
    // Exact match
    let match = calls.find(call =>
      call.request.method === criteria.method &&
      call.request.url === criteria.url &&
      (!criteria.body || call.request.body === criteria.body)
    );

    if (match) return match;

    // URL pattern match
    match = calls.find(call =>
      call.request.method === criteria.method &&
      this.urlMatches(call.request.url, criteria.url)
    );

    return match || null;
  }

  private urlMatches(recorded: string, requested: string): boolean {
    // Simple pattern matching: ignore query parameters
    const recordedBase = recorded.split('?')[0];
    const requestedBase = requested.split('?')[0];
    return recordedBase === requestedBase;
  }
}

export default APIRecorder;
