import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { Server } from 'http';
import { TimeSeriesStore } from '../storage/TimeSeriesStore';
import { TagRegistry } from '../storage/TagRegistry';
import { ErrorSimulator } from '../simulation/ErrorSimulator';
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor';
import { ServerInfoController } from '../api/ServerInfoController';
import { TagController } from '../api/TagController';
import { DataWriteController } from '../api/DataWriteController';
import { DataQueryController } from '../api/DataQueryController';
import { HealthController } from '../api/HealthController';
import { ConfigController } from '../api/ConfigController';

/**
 * GE Proficy Historian Surrogate Server
 *
 * A comprehensive mock implementation of the GE Proficy Historian REST API
 * designed for integration testing scenarios. Provides realistic behavior,
 * time-series data storage, and configurable error simulation.
 */
export class ProficyHistorianSurrogate {
  private app: Application;
  private server: Server | null = null;
  private timeSeriesStore: TimeSeriesStore;
  private tagRegistry: TagRegistry;
  private errorSimulator: ErrorSimulator;
  private performanceMonitor: PerformanceMonitor;

  // API Controllers
  private serverInfoController: ServerInfoController;
  private tagController: TagController;
  private dataWriteController: DataWriteController;
  private dataQueryController: DataQueryController;
  private healthController: HealthController;
  private configController: ConfigController;

  public readonly config: SurrogateServerConfig;
  public readonly port: number;
  public readonly host: string;

  constructor(config: Partial<SurrogateServerConfig> = {}) {
    this.config = { ...DEFAULT_SERVER_CONFIG, ...config };
    this.port = this.config.server.port;
    this.host = this.config.server.host;

    // Initialize core components
    this.timeSeriesStore = new TimeSeriesStore(this.config.storage);
    this.tagRegistry = new TagRegistry();
    this.errorSimulator = new ErrorSimulator(this.config.errorSimulation);
    this.performanceMonitor = new PerformanceMonitor();

    // Initialize API controllers
    this.serverInfoController = new ServerInfoController(this.config);
    this.tagController = new TagController(this.tagRegistry, this.errorSimulator);
    this.dataWriteController = new DataWriteController(
      this.timeSeriesStore,
      this.tagRegistry,
      this.errorSimulator,
      this.performanceMonitor
    );
    this.dataQueryController = new DataQueryController(
      this.timeSeriesStore,
      this.tagRegistry,
      this.errorSimulator,
      this.performanceMonitor
    );
    this.healthController = new HealthController(
      this.timeSeriesStore,
      this.tagRegistry,
      this.performanceMonitor
    );
    this.configController = new ConfigController(
      this.config,
      this.errorSimulator
    );

    // Initialize Express application
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();

    console.log('Proficy Historian Surrogate initialized');
  }

  /**
   * Setup Express middleware stack
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable for API server
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    if (this.config.server.enableCors) {
      this.app.use(cors({
        origin: this.config.server.corsOrigins || '*',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
      }));
    }

    // Request parsing
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Compression
    this.app.use(compression());

    // Request logging
    if (this.config.logging.enabled) {
      const logFormat = this.config.logging.level === 'debug'
        ? 'combined'
        : 'common';
      this.app.use(morgan(logFormat));
    }

    // Rate limiting
    if (this.config.server.rateLimitEnabled) {
      const limiter = rateLimit({
        windowMs: this.config.server.rateLimitWindow,
        max: this.config.server.rateLimitMax,
        message: {
          error: 'Too many requests',
          retryAfter: Math.ceil(this.config.server.rateLimitWindow / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false
      });
      this.app.use('/historian', limiter);
    }

    // Performance monitoring
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.performanceMonitor.recordRequest(req.method, req.path, res.statusCode, duration);
      });
      next();
    });

    // Authentication middleware
    if (this.config.authentication.enabled) {
      this.app.use('/historian', this.authenticateRequest.bind(this));
    }

    // Error simulation middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      if (this.errorSimulator.shouldSimulateError(req.path, req.method)) {
        const error = this.errorSimulator.generateError(req.path, req.method);
        return res.status(error.statusCode).json({
          error: error.message,
          code: error.code,
          timestamp: new Date().toISOString()
        });
      }
      next();
    });

    // Request timeout
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.setTimeout(this.config.server.requestTimeout, () => {
        res.status(408).json({
          error: 'Request timeout',
          timestamp: new Date().toISOString()
        });
      });
      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check (no authentication required)
    this.app.get('/health', this.healthController.getHealth.bind(this.healthController));
    this.app.get('/historian/health', this.healthController.getHealth.bind(this.healthController));

    // Server information
    this.app.get('/historian/server/info', this.serverInfoController.getServerInfo.bind(this.serverInfoController));
    this.app.get('/historian/server/status', this.serverInfoController.getServerStatus.bind(this.serverInfoController));

    // Tag management
    this.app.post('/historian/tags', this.tagController.createTag.bind(this.tagController));
    this.app.get('/historian/tags', this.tagController.listTags.bind(this.tagController));
    this.app.get('/historian/tags/:tagName', this.tagController.getTag.bind(this.tagController));
    this.app.put('/historian/tags/:tagName', this.tagController.updateTag.bind(this.tagController));
    this.app.delete('/historian/tags/:tagName', this.tagController.deleteTag.bind(this.tagController));

    // Data operations
    this.app.post('/historian/data/write', this.dataWriteController.writeData.bind(this.dataWriteController));
    this.app.get('/historian/data/query', this.dataQueryController.queryData.bind(this.dataQueryController));
    this.app.get('/historian/data/aggregate', this.dataQueryController.queryAggregatedData.bind(this.dataQueryController));
    this.app.get('/historian/data/latest', this.dataQueryController.getLatestValues.bind(this.dataQueryController));

    // Configuration management
    this.app.get('/historian/config', this.configController.getConfiguration.bind(this.configController));
    this.app.put('/historian/config', this.configController.updateConfiguration.bind(this.configController));
    this.app.post('/historian/config/reset', this.configController.resetConfiguration.bind(this.configController));

    // Simulation controls
    this.app.get('/historian/simulation/status', this.configController.getSimulationStatus.bind(this.configController));
    this.app.put('/historian/simulation/errors', this.configController.updateErrorSimulation.bind(this.configController));

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'GE Proficy Historian Surrogate',
        version: '1.0.0',
        description: 'Mock implementation for integration testing',
        endpoints: {
          health: '/health',
          serverInfo: '/historian/server/info',
          tags: '/historian/tags',
          dataWrite: '/historian/data/write',
          dataQuery: '/historian/data/query'
        },
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Setup error handling middleware
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Unhandled error:', error);

      const statusCode = (error as any).statusCode || 500;
      const message = error.message || 'Internal server error';

      res.status(statusCode).json({
        error: message,
        type: error.name,
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString(),
        ...(this.config.logging.level === 'debug' && { stack: error.stack })
      });
    });
  }

  /**
   * Authentication middleware
   */
  private authenticateRequest(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    try {
      if (this.config.authentication.authType === 'basic') {
        const token = authHeader.split(' ')[1];
        const credentials = Buffer.from(token, 'base64').toString('ascii');
        const [username, password] = credentials.split(':');

        if (username !== this.config.authentication.username ||
            password !== this.config.authentication.password) {
          throw new Error('Invalid credentials');
        }
      } else if (this.config.authentication.authType === 'bearer') {
        const token = authHeader.split(' ')[1];
        if (token !== this.config.authentication.token) {
          throw new Error('Invalid token');
        }
      }

      next();
    } catch (error) {
      res.status(401).json({
        error: 'Authentication failed',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, this.host, () => {
          console.log(`Proficy Historian Surrogate listening on ${this.host}:${this.port}`);

          // Start background processes
          this.timeSeriesStore.startMaintenance();
          this.performanceMonitor.start();

          resolve();
        });

        this.server.on('error', (error) => {
          console.error('Server error:', error);
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        // Stop background processes
        this.timeSeriesStore.stopMaintenance();
        this.performanceMonitor.stop();

        this.server.close(() => {
          console.log('Proficy Historian Surrogate stopped');
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get server status
   */
  isRunning(): boolean {
    return this.server !== null && this.server.listening;
  }

  /**
   * Get server URL
   */
  getUrl(): string {
    return `http://${this.host}:${this.port}`;
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<any> {
    return this.healthController.getHealthData();
  }

  /**
   * Reset server state (for testing)
   */
  async reset(): Promise<void> {
    await this.timeSeriesStore.clear();
    await this.tagRegistry.clear();
    this.performanceMonitor.reset();
    this.errorSimulator.reset();
    console.log('Proficy Historian Surrogate state reset');
  }

  /**
   * Preload test data
   */
  async preloadTestData(scenario: string): Promise<void> {
    // This will be implemented when we create the data preloader
    console.log(`Preloading test data for scenario: ${scenario}`);
  }
}

/**
 * Server configuration interface
 */
export interface SurrogateServerConfig {
  server: {
    port: number;
    host: string;
    enableCors: boolean;
    corsOrigins?: string[];
    requestTimeout: number;
    rateLimitEnabled: boolean;
    rateLimitWindow: number;
    rateLimitMax: number;
  };
  authentication: {
    enabled: boolean;
    authType: 'basic' | 'bearer';
    username: string;
    password: string;
    token?: string;
  };
  storage: {
    maxDataPoints: number;
    retentionHours: number;
    compressionEnabled: boolean;
    aggregationEnabled: boolean;
  };
  errorSimulation: {
    enabled: boolean;
    errorRate: number;
    latencySimulation: boolean;
    averageLatency: number;
  };
  logging: {
    enabled: boolean;
    level: 'error' | 'warn' | 'info' | 'debug';
  };
}

/**
 * Default server configuration optimized for testing
 */
export const DEFAULT_SERVER_CONFIG: SurrogateServerConfig = {
  server: {
    port: 8080,
    host: 'localhost',
    enableCors: true,
    requestTimeout: 30000,
    rateLimitEnabled: false,
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 10000
  },
  authentication: {
    enabled: true,
    authType: 'basic',
    username: 'historian',
    password: 'password'
  },
  storage: {
    maxDataPoints: 1000000,
    retentionHours: 24,
    compressionEnabled: true,
    aggregationEnabled: true
  },
  errorSimulation: {
    enabled: false,
    errorRate: 0.01,
    latencySimulation: false,
    averageLatency: 50
  },
  logging: {
    enabled: true,
    level: 'info'
  }
};

export default ProficyHistorianSurrogate;