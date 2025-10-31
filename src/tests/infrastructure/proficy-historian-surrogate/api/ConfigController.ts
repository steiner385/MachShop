import { Request, Response } from 'express';
import { SurrogateServerConfig } from '../server/ProficyHistorianSurrogate';
import { ErrorSimulator, ErrorSimulationConfig } from '../simulation/ErrorSimulator';

/**
 * Configuration Controller
 * Handles runtime configuration management and simulation controls
 */
export class ConfigController {
  constructor(
    private config: SurrogateServerConfig,
    private errorSimulator: ErrorSimulator
  ) {}

  /**
   * GET /historian/config
   * Get current configuration
   */
  async getConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const configuration = {
        Server: {
          Port: this.config.server.port,
          Host: this.config.server.host,
          EnableCors: this.config.server.enableCors,
          RequestTimeout: this.config.server.requestTimeout,
          RateLimitEnabled: this.config.server.rateLimitEnabled,
          RateLimitWindow: this.config.server.rateLimitWindow,
          RateLimitMax: this.config.server.rateLimitMax
        },
        Authentication: {
          Enabled: this.config.authentication.enabled,
          AuthType: this.config.authentication.authType,
          Username: this.config.authentication.enabled ? '***' : null // Hide password
        },
        Storage: {
          MaxDataPoints: this.config.storage.maxDataPoints,
          RetentionHours: this.config.storage.retentionHours,
          CompressionEnabled: this.config.storage.compressionEnabled,
          AggregationEnabled: this.config.storage.aggregationEnabled
        },
        ErrorSimulation: {
          Enabled: this.config.errorSimulation.enabled,
          ErrorRate: this.config.errorSimulation.errorRate,
          LatencySimulation: this.config.errorSimulation.latencySimulation,
          AverageLatency: this.config.errorSimulation.averageLatency
        },
        Logging: {
          Enabled: this.config.logging.enabled,
          Level: this.config.logging.level
        },
        Timestamp: new Date().toISOString()
      };

      res.status(200).json({
        Success: true,
        Configuration: configuration,
        Timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Failed to get configuration:', error);
      res.status(500).json({
        error: 'Failed to retrieve configuration',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * PUT /historian/config
   * Update configuration (limited subset for runtime changes)
   */
  async updateConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const updates = req.body;
      let hasChanges = false;

      // Update storage configuration
      if (updates.Storage) {
        if (updates.Storage.MaxDataPoints !== undefined) {
          this.config.storage.maxDataPoints = updates.Storage.MaxDataPoints;
          hasChanges = true;
        }
        if (updates.Storage.RetentionHours !== undefined) {
          this.config.storage.retentionHours = updates.Storage.RetentionHours;
          hasChanges = true;
        }
        if (updates.Storage.CompressionEnabled !== undefined) {
          this.config.storage.compressionEnabled = updates.Storage.CompressionEnabled;
          hasChanges = true;
        }
        if (updates.Storage.AggregationEnabled !== undefined) {
          this.config.storage.aggregationEnabled = updates.Storage.AggregationEnabled;
          hasChanges = true;
        }
      }

      // Update error simulation configuration
      if (updates.ErrorSimulation) {
        const errorConfig: Partial<ErrorSimulationConfig> = {};

        if (updates.ErrorSimulation.Enabled !== undefined) {
          errorConfig.enabled = updates.ErrorSimulation.Enabled;
          this.config.errorSimulation.enabled = updates.ErrorSimulation.Enabled;
          hasChanges = true;
        }
        if (updates.ErrorSimulation.ErrorRate !== undefined) {
          errorConfig.globalErrorRate = updates.ErrorSimulation.ErrorRate;
          this.config.errorSimulation.errorRate = updates.ErrorSimulation.ErrorRate;
          hasChanges = true;
        }
        if (updates.ErrorSimulation.LatencySimulation !== undefined) {
          errorConfig.latencySimulation = {
            enabled: updates.ErrorSimulation.LatencySimulation,
            averageLatency: this.config.errorSimulation.averageLatency,
            variance: 20
          };
          this.config.errorSimulation.latencySimulation = updates.ErrorSimulation.LatencySimulation;
          hasChanges = true;
        }
        if (updates.ErrorSimulation.AverageLatency !== undefined) {
          errorConfig.latencySimulation = {
            enabled: this.config.errorSimulation.latencySimulation,
            averageLatency: updates.ErrorSimulation.AverageLatency,
            variance: 20
          };
          this.config.errorSimulation.averageLatency = updates.ErrorSimulation.AverageLatency;
          hasChanges = true;
        }

        // Apply error simulation changes
        if (Object.keys(errorConfig).length > 0) {
          this.errorSimulator.updateConfiguration(errorConfig);
        }
      }

      // Update logging configuration
      if (updates.Logging) {
        if (updates.Logging.Enabled !== undefined) {
          this.config.logging.enabled = updates.Logging.Enabled;
          hasChanges = true;
        }
        if (updates.Logging.Level !== undefined) {
          this.config.logging.level = updates.Logging.Level;
          hasChanges = true;
        }
      }

      if (!hasChanges) {
        res.status(400).json({
          error: 'No valid configuration updates provided',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        Success: true,
        Message: 'Configuration updated successfully',
        UpdatedFields: Object.keys(updates),
        Timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Failed to update configuration:', error);
      res.status(400).json({
        error: 'Failed to update configuration',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /historian/config/reset
   * Reset configuration to defaults
   */
  async resetConfiguration(req: Request, res: Response): Promise<void> {
    try {
      // Reset error simulation
      this.errorSimulator.reset();

      // Reset configuration to defaults (keeping server settings)
      this.config.storage = {
        maxDataPoints: 1000000,
        retentionHours: 24,
        compressionEnabled: true,
        aggregationEnabled: true
      };

      this.config.errorSimulation = {
        enabled: false,
        errorRate: 0.01,
        latencySimulation: false,
        averageLatency: 50
      };

      this.config.logging = {
        enabled: true,
        level: 'info'
      };

      res.status(200).json({
        Success: true,
        Message: 'Configuration reset to defaults',
        Timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Failed to reset configuration:', error);
      res.status(500).json({
        error: 'Failed to reset configuration',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /historian/simulation/status
   * Get error simulation status and statistics
   */
  async getSimulationStatus(req: Request, res: Response): Promise<void> {
    try {
      const statistics = this.errorSimulator.getStatistics();

      const status = {
        Enabled: this.config.errorSimulation.enabled,
        Configuration: {
          ErrorRate: this.config.errorSimulation.errorRate,
          LatencySimulation: this.config.errorSimulation.latencySimulation,
          AverageLatency: this.config.errorSimulation.averageLatency
        },
        Statistics: {
          TotalErrors: statistics.totalErrors,
          RecentErrors: statistics.recentErrors,
          ErrorsByType: statistics.errorsByType,
          ErrorsByEndpoint: statistics.errorsByEndpoint,
          CircuitBreakerStates: statistics.circuitBreakerStates
        },
        Timestamp: new Date().toISOString()
      };

      res.status(200).json({
        Success: true,
        SimulationStatus: status,
        Timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Failed to get simulation status:', error);
      res.status(500).json({
        error: 'Failed to retrieve simulation status',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * PUT /historian/simulation/errors
   * Update error simulation settings
   */
  async updateErrorSimulation(req: Request, res: Response): Promise<void> {
    try {
      const updates = req.body;
      const errorConfig: Partial<ErrorSimulationConfig> = {};

      // Update global settings
      if (updates.Enabled !== undefined) {
        this.errorSimulator.setEnabled(updates.Enabled);
        this.config.errorSimulation.enabled = updates.Enabled;
      }

      if (updates.ErrorRate !== undefined) {
        if (updates.ErrorRate < 0 || updates.ErrorRate > 1) {
          res.status(400).json({
            error: 'ErrorRate must be between 0 and 1',
            timestamp: new Date().toISOString()
          });
          return;
        }
        errorConfig.globalErrorRate = updates.ErrorRate;
        this.config.errorSimulation.errorRate = updates.ErrorRate;
      }

      if (updates.LatencySimulation !== undefined) {
        errorConfig.latencySimulation = {
          enabled: updates.LatencySimulation,
          averageLatency: this.config.errorSimulation.averageLatency,
          variance: 20
        };
        this.config.errorSimulation.latencySimulation = updates.LatencySimulation;
      }

      if (updates.AverageLatency !== undefined) {
        if (updates.AverageLatency < 0) {
          res.status(400).json({
            error: 'AverageLatency must be non-negative',
            timestamp: new Date().toISOString()
          });
          return;
        }
        errorConfig.latencySimulation = {
          enabled: this.config.errorSimulation.latencySimulation,
          averageLatency: updates.AverageLatency,
          variance: 20
        };
        this.config.errorSimulation.averageLatency = updates.AverageLatency;
      }

      // Update pattern simulation
      if (updates.Patterns) {
        errorConfig.patterns = {
          simulateTimeouts: updates.Patterns.SimulateTimeouts ?? true,
          simulateAuthFailures: updates.Patterns.SimulateAuthFailures ?? true,
          simulateRateLimiting: updates.Patterns.SimulateRateLimiting ?? true,
          simulateNetworkIssues: updates.Patterns.SimulateNetworkIssues ?? true
        };
      }

      // Apply configuration updates
      if (Object.keys(errorConfig).length > 0) {
        this.errorSimulator.updateConfiguration(errorConfig);
      }

      res.status(200).json({
        Success: true,
        Message: 'Error simulation updated successfully',
        UpdatedSettings: Object.keys(updates),
        Timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Failed to update error simulation:', error);
      res.status(400).json({
        error: 'Failed to update error simulation',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /historian/simulation/reset
   * Reset error simulation state
   */
  async resetSimulation(req: Request, res: Response): Promise<void> {
    try {
      this.errorSimulator.reset();

      res.status(200).json({
        Success: true,
        Message: 'Error simulation state reset',
        Timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Failed to reset simulation:', error);
      res.status(500).json({
        error: 'Failed to reset simulation',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /historian/config/schema
   * Get configuration schema for validation
   */
  async getConfigurationSchema(req: Request, res: Response): Promise<void> {
    try {
      const schema = {
        type: 'object',
        properties: {
          Storage: {
            type: 'object',
            properties: {
              MaxDataPoints: {
                type: 'integer',
                minimum: 1000,
                maximum: 10000000,
                description: 'Maximum number of data points to store'
              },
              RetentionHours: {
                type: 'integer',
                minimum: 1,
                maximum: 8760,
                description: 'Data retention period in hours'
              },
              CompressionEnabled: {
                type: 'boolean',
                description: 'Enable data compression'
              },
              AggregationEnabled: {
                type: 'boolean',
                description: 'Enable automatic aggregation'
              }
            }
          },
          ErrorSimulation: {
            type: 'object',
            properties: {
              Enabled: {
                type: 'boolean',
                description: 'Enable error simulation'
              },
              ErrorRate: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: 'Global error rate (0.0 to 1.0)'
              },
              LatencySimulation: {
                type: 'boolean',
                description: 'Enable latency simulation'
              },
              AverageLatency: {
                type: 'integer',
                minimum: 0,
                maximum: 10000,
                description: 'Average latency in milliseconds'
              }
            }
          },
          Logging: {
            type: 'object',
            properties: {
              Enabled: {
                type: 'boolean',
                description: 'Enable logging'
              },
              Level: {
                type: 'string',
                enum: ['error', 'warn', 'info', 'debug'],
                description: 'Logging level'
              }
            }
          }
        },
        additionalProperties: false
      };

      res.status(200).json({
        Success: true,
        Schema: schema,
        Timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Failed to get configuration schema:', error);
      res.status(500).json({
        error: 'Failed to retrieve configuration schema',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /historian/config/validate
   * Validate configuration without applying changes
   */
  async validateConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const config = req.body;
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate storage configuration
      if (config.Storage) {
        if (config.Storage.MaxDataPoints !== undefined) {
          if (config.Storage.MaxDataPoints < 1000 || config.Storage.MaxDataPoints > 10000000) {
            errors.push('MaxDataPoints must be between 1,000 and 10,000,000');
          }
        }
        if (config.Storage.RetentionHours !== undefined) {
          if (config.Storage.RetentionHours < 1 || config.Storage.RetentionHours > 8760) {
            errors.push('RetentionHours must be between 1 and 8,760 (1 year)');
          }
        }
      }

      // Validate error simulation configuration
      if (config.ErrorSimulation) {
        if (config.ErrorSimulation.ErrorRate !== undefined) {
          if (config.ErrorSimulation.ErrorRate < 0 || config.ErrorSimulation.ErrorRate > 1) {
            errors.push('ErrorRate must be between 0.0 and 1.0');
          } else if (config.ErrorSimulation.ErrorRate > 0.1) {
            warnings.push('ErrorRate above 0.1 (10%) may cause excessive failures');
          }
        }
        if (config.ErrorSimulation.AverageLatency !== undefined) {
          if (config.ErrorSimulation.AverageLatency < 0 || config.ErrorSimulation.AverageLatency > 10000) {
            errors.push('AverageLatency must be between 0 and 10,000 milliseconds');
          } else if (config.ErrorSimulation.AverageLatency > 1000) {
            warnings.push('AverageLatency above 1,000ms may significantly slow down responses');
          }
        }
      }

      // Validate logging configuration
      if (config.Logging?.Level !== undefined) {
        const validLevels = ['error', 'warn', 'info', 'debug'];
        if (!validLevels.includes(config.Logging.Level)) {
          errors.push(`Logging level must be one of: ${validLevels.join(', ')}`);
        }
      }

      const isValid = errors.length === 0;

      res.status(isValid ? 200 : 400).json({
        Success: isValid,
        Valid: isValid,
        Errors: errors,
        Warnings: warnings,
        Timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Configuration validation failed:', error);
      res.status(500).json({
        error: 'Configuration validation failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}