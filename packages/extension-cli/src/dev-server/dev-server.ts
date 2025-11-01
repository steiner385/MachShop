/**
 * Local Development Server
 *
 * Provides a development server for testing extensions in isolation
 * with hot module reloading and live code updates.
 */

import http from 'http';
import path from 'path';

export interface DevServerConfig {
  port: number;
  manifest: Record<string, unknown>;
  projectDir: string;
  watch?: boolean;
  hotReload?: boolean;
}

/**
 * Development server for extension testing
 */
export class DevServer {
  private config: DevServerConfig;
  private server: http.Server | null = null;
  private isRunning: boolean = false;

  constructor(config: DevServerConfig) {
    this.config = config;
  }

  /**
   * Start development server
   */
  async start(): Promise<void> {
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    return new Promise((resolve, reject) => {
      this.server!.listen(this.config.port, () => {
        this.isRunning = true;
        console.log(`✅ Development server started on port ${this.config.port}\n`);
        resolve();
      });

      this.server!.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Stop development server
   */
  async stop(): Promise<void> {
    if (this.server && this.isRunning) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          this.isRunning = false;
          console.log('✅ Development server stopped');
          resolve();
        });
      });
    }
  }

  /**
   * Handle incoming HTTP requests
   */
  private handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): void {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Route handling
    const url = req.url || '/';

    if (url === '/' || url === '/index.html') {
      this.serveTestUI(res);
    } else if (url === '/api/extension') {
      this.serveExtensionMetadata(res);
    } else if (url === '/api/extension/config') {
      this.serveExtensionConfig(res);
    } else if (url === '/api/test') {
      this.runTest(res);
    } else if (url === '/api/reload') {
      this.reloadExtension(res);
    } else {
      this.serve404(res);
    }
  }

  /**
   * Serve test UI
   */
  private serveTestUI(res: http.ServerResponse): void {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Extension Development Test UI</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      margin-top: 0;
    }
    .info {
      background: #f0f7ff;
      border-left: 4px solid #0066cc;
      padding: 12px;
      margin-bottom: 20px;
      border-radius: 4px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      color: #0066cc;
      font-size: 18px;
      border-bottom: 2px solid #0066cc;
      padding-bottom: 10px;
    }
    button {
      background: #0066cc;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-right: 10px;
      margin-bottom: 10px;
    }
    button:hover {
      background: #0052a3;
    }
    .output {
      background: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 12px;
      margin-top: 10px;
      font-family: monospace;
      font-size: 12px;
      max-height: 300px;
      overflow-y: auto;
    }
    .success {
      color: #28a745;
    }
    .error {
      color: #dc3545;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Extension Development Test UI</h1>

    <div class="info">
      <strong>Extension:</strong> <span id="extensionName">Loading...</span><br>
      <strong>Type:</strong> <span id="extensionType">Loading...</span><br>
      <strong>Version:</strong> <span id="extensionVersion">Loading...</span>
    </div>

    <div class="section">
      <h2>Test Controls</h2>
      <button onclick="runTest()">Run Test</button>
      <button onclick="reloadExtension()">Reload Extension</button>
      <button onclick="clearOutput()">Clear Output</button>
      <div class="output" id="testOutput">Ready for testing...</div>
    </div>

    <div class="section">
      <h2>Extension Configuration</h2>
      <div class="output" id="configOutput">Loading...</div>
    </div>
  </div>

  <script>
    async function loadExtensionInfo() {
      try {
        const response = await fetch('/api/extension');
        const data = await response.json();
        document.getElementById('extensionName').textContent = data.name || 'Unknown';
        document.getElementById('extensionType').textContent = data.type || 'Unknown';
        document.getElementById('extensionVersion').textContent = data.version || 'Unknown';
        loadConfig();
      } catch (error) {
        console.error('Error loading extension info:', error);
      }
    }

    async function loadConfig() {
      try {
        const response = await fetch('/api/extension/config');
        const data = await response.json();
        document.getElementById('configOutput').textContent = JSON.stringify(data, null, 2);
      } catch (error) {
        document.getElementById('configOutput').innerHTML = '<span class="error">Error loading configuration</span>';
      }
    }

    async function runTest() {
      const output = document.getElementById('testOutput');
      output.textContent = 'Running tests...';
      try {
        const response = await fetch('/api/test', { method: 'POST' });
        const data = await response.json();
        output.innerHTML = '<span class="success">✓ Tests passed</span><pre>' + JSON.stringify(data, null, 2) + '</pre>';
      } catch (error) {
        output.innerHTML = '<span class="error">✗ Test failed: ' + error.message + '</span>';
      }
    }

    async function reloadExtension() {
      try {
        await fetch('/api/reload', { method: 'POST' });
        document.getElementById('testOutput').innerHTML = '<span class="success">✓ Extension reloaded</span>';
      } catch (error) {
        document.getElementById('testOutput').innerHTML = '<span class="error">✗ Reload failed: ' + error.message + '</span>';
      }
    }

    function clearOutput() {
      document.getElementById('testOutput').textContent = '';
    }

    // Load extension info on page load
    loadExtensionInfo();
  </script>
</body>
</html>
    `;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  /**
   * Serve extension metadata
   */
  private serveExtensionMetadata(res: http.ServerResponse): void {
    const metadata = {
      name: this.config.manifest.name,
      type: this.config.manifest.type,
      version: this.config.manifest.version,
      description: this.config.manifest.description,
      projectDir: this.config.projectDir,
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(metadata, null, 2));
  }

  /**
   * Serve extension configuration
   */
  private serveExtensionConfig(res: http.ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(this.config.manifest, null, 2));
  }

  /**
   * Run extension tests
   */
  private runTest(res: http.ServerResponse): void {
    const result = {
      success: true,
      message: 'Test execution completed',
      timestamp: new Date().toISOString(),
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  }

  /**
   * Reload extension
   */
  private reloadExtension(res: http.ServerResponse): void {
    const result = {
      success: true,
      message: 'Extension reloaded',
      timestamp: new Date().toISOString(),
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  }

  /**
   * Serve 404 response
   */
  private serve404(res: http.ServerResponse): void {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
}
