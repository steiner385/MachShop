#!/usr/bin/env ts-node

/**
 * GE Proficy Historian Surrogate Startup Script
 * Command-line interface for starting the surrogate server
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { ProficyHistorianSurrogate, SurrogateServerConfig } from '../server/ProficyHistorianSurrogate';
import { SurrogateManager, createTestEnvironment } from '../integration/SurrogateManager';

// Default configuration
const DEFAULT_CONFIG: SurrogateServerConfig = {
  server: {
    port: 8080,
    host: '0.0.0.0',
    enableCors: true,
    requestTimeout: 30000,
    rateLimitEnabled: false,
    rateLimitWindow: 900000,
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

/**
 * Load configuration from file
 */
function loadConfig(configPath: string): SurrogateServerConfig {
  try {
    if (!fs.existsSync(configPath)) {
      console.warn(`Config file not found: ${configPath}, using defaults`);
      return DEFAULT_CONFIG;
    }

    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);

    // Merge with defaults
    return {
      ...DEFAULT_CONFIG,
      ...config,
      server: { ...DEFAULT_CONFIG.server, ...config.server },
      authentication: { ...DEFAULT_CONFIG.authentication, ...config.authentication },
      storage: { ...DEFAULT_CONFIG.storage, ...config.storage },
      errorSimulation: { ...DEFAULT_CONFIG.errorSimulation, ...config.errorSimulation },
      logging: { ...DEFAULT_CONFIG.logging, ...config.logging }
    };
  } catch (error: any) {
    console.error(`Failed to load config from ${configPath}:`, error.message);
    console.warn('Using default configuration');
    return DEFAULT_CONFIG;
  }
}

/**
 * Load configuration from environment variables
 */
function loadConfigFromEnv(): Partial<SurrogateServerConfig> {
  const envConfig: Partial<SurrogateServerConfig> = {};

  // Server configuration
  if (process.env.SURROGATE_PORT) {
    envConfig.server = { ...envConfig.server, port: parseInt(process.env.SURROGATE_PORT) };
  }
  if (process.env.SURROGATE_HOST) {
    envConfig.server = { ...envConfig.server, host: process.env.SURROGATE_HOST };
  }
  if (process.env.SURROGATE_CORS_ENABLED) {
    envConfig.server = { ...envConfig.server, enableCors: process.env.SURROGATE_CORS_ENABLED === 'true' };
  }
  if (process.env.SURROGATE_RATE_LIMIT_ENABLED) {
    envConfig.server = { ...envConfig.server, rateLimitEnabled: process.env.SURROGATE_RATE_LIMIT_ENABLED === 'true' };
  }

  // Authentication configuration
  if (process.env.SURROGATE_AUTH_ENABLED) {
    envConfig.authentication = { ...envConfig.authentication, enabled: process.env.SURROGATE_AUTH_ENABLED === 'true' };
  }
  if (process.env.SURROGATE_AUTH_USERNAME) {
    envConfig.authentication = { ...envConfig.authentication, username: process.env.SURROGATE_AUTH_USERNAME };
  }
  if (process.env.SURROGATE_AUTH_PASSWORD) {
    envConfig.authentication = { ...envConfig.authentication, password: process.env.SURROGATE_AUTH_PASSWORD };
  }

  // Storage configuration
  if (process.env.SURROGATE_MAX_DATA_POINTS) {
    envConfig.storage = { ...envConfig.storage, maxDataPoints: parseInt(process.env.SURROGATE_MAX_DATA_POINTS) };
  }
  if (process.env.SURROGATE_RETENTION_HOURS) {
    envConfig.storage = { ...envConfig.storage, retentionHours: parseInt(process.env.SURROGATE_RETENTION_HOURS) };
  }
  if (process.env.SURROGATE_COMPRESSION_ENABLED) {
    envConfig.storage = { ...envConfig.storage, compressionEnabled: process.env.SURROGATE_COMPRESSION_ENABLED === 'true' };
  }

  // Error simulation configuration
  if (process.env.SURROGATE_ERROR_SIMULATION) {
    envConfig.errorSimulation = { ...envConfig.errorSimulation, enabled: process.env.SURROGATE_ERROR_SIMULATION === 'true' };
  }

  // Logging configuration
  if (process.env.SURROGATE_LOG_LEVEL) {
    envConfig.logging = { ...envConfig.logging, level: process.env.SURROGATE_LOG_LEVEL as any };
  }

  return envConfig;
}

/**
 * Merge configurations in priority order
 */
function mergeConfigs(baseConfig: SurrogateServerConfig, ...configs: Partial<SurrogateServerConfig>[]): SurrogateServerConfig {
  let merged = { ...baseConfig };

  for (const config of configs) {
    merged = {
      ...merged,
      ...config,
      server: { ...merged.server, ...config.server },
      authentication: { ...merged.authentication, ...config.authentication },
      storage: { ...merged.storage, ...config.storage },
      errorSimulation: { ...merged.errorSimulation, ...config.errorSimulation },
      logging: { ...merged.logging, ...config.logging }
    };
  }

  return merged;
}

/**
 * Setup graceful shutdown
 */
function setupGracefulShutdown(manager: SurrogateManager | ProficyHistorianSurrogate) {
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, gracefully shutting down...`);

    try {
      await manager.stop();
      console.log('Surrogate server stopped gracefully');
      process.exit(0);
    } catch (error: any) {
      console.error('Error during shutdown:', error.message);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });
}

/**
 * Main startup function
 */
async function main() {
  const program = new Command();

  program
    .name('start-surrogate')
    .description('Start the GE Proficy Historian Surrogate Server')
    .version('1.0.0')
    .option('-c, --config <path>', 'Configuration file path')
    .option('-p, --port <number>', 'Server port', '8080')
    .option('-h, --host <address>', 'Server host', '0.0.0.0')
    .option('--scenario <name>', 'Load test scenario on startup')
    .option('--load-minimal-data', 'Load minimal test dataset on startup')
    .option('--no-auth', 'Disable authentication')
    .option('--enable-error-simulation', 'Enable error simulation')
    .option('--log-level <level>', 'Log level (debug, info, warn, error)', 'info')
    .option('--use-manager', 'Use SurrogateManager instead of direct server')
    .option('--custom-scenarios <path>', 'Path to custom scenario files')
    .parse();

  const options = program.opts();

  try {
    console.log('='.repeat(60));
    console.log('GE Proficy Historian Surrogate Server');
    console.log('='.repeat(60));

    // Load configuration from multiple sources
    let config = DEFAULT_CONFIG;

    // 1. Load from config file if specified
    if (options.config) {
      config = loadConfig(options.config);
    }

    // 2. Override with environment variables
    const envConfig = loadConfigFromEnv();
    config = mergeConfigs(config, envConfig);

    // 3. Override with command line options
    const cliConfig: Partial<SurrogateServerConfig> = {};

    if (options.port) {
      cliConfig.server = { ...cliConfig.server, port: parseInt(options.port) };
    }
    if (options.host) {
      cliConfig.server = { ...cliConfig.server, host: options.host };
    }
    if (options.noAuth) {
      cliConfig.authentication = { ...cliConfig.authentication, enabled: false };
    }
    if (options.enableErrorSimulation) {
      cliConfig.errorSimulation = { ...cliConfig.errorSimulation, enabled: true };
    }
    if (options.logLevel) {
      cliConfig.logging = { ...cliConfig.logging, level: options.logLevel };
    }

    config = mergeConfigs(config, cliConfig);

    // Validate configuration
    if (config.server.port < 1024 || config.server.port > 65535) {
      throw new Error(`Invalid port: ${config.server.port}. Must be between 1024 and 65535`);
    }

    console.log('Configuration:');
    console.log(`  Port: ${config.server.port}`);
    console.log(`  Host: ${config.server.host}`);
    console.log(`  Authentication: ${config.authentication.enabled}`);
    console.log(`  Error Simulation: ${config.errorSimulation.enabled}`);
    console.log(`  Log Level: ${config.logging.level}`);
    console.log(`  Max Data Points: ${config.storage.maxDataPoints}`);
    console.log(`  Retention Hours: ${config.storage.retentionHours}`);

    if (options.scenario) {
      console.log(`  Initial Scenario: ${options.scenario}`);
    }
    if (options.loadMinimalData) {
      console.log(`  Load Minimal Data: true`);
    }

    console.log('');

    // Start the server
    if (options.useManager) {
      // Use SurrogateManager for advanced features
      console.log('Starting with SurrogateManager...');

      const manager = new SurrogateManager(config);
      await manager.start({
        scenario: options.scenario,
        loadMinimalData: options.loadMinimalData && !options.scenario
      });

      setupGracefulShutdown(manager);

      const status = await manager.getStatus();
      console.log(`Surrogate Manager started successfully at: ${status.url}`);
      console.log(`Loaded scenarios: ${status.loadedScenarios.join(', ') || 'none'}`);
      console.log(`Tags: ${status.tagCount}, Data Points: ${status.dataPointCount}`);

    } else {
      // Use direct server for simpler deployment
      console.log('Starting direct server...');

      const surrogate = new ProficyHistorianSurrogate(config);
      await surrogate.start();

      setupGracefulShutdown(surrogate);

      console.log(`Surrogate server started successfully at: ${surrogate.getUrl()}`);
    }

    console.log('\nServer is ready to accept connections');
    console.log('Press Ctrl+C to stop the server');

  } catch (error: any) {
    console.error('Failed to start surrogate server:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    console.error('Startup error:', error);
    process.exit(1);
  });
}

export default main;