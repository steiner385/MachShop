import { ProficyHistorianSurrogate, SurrogateServerConfig } from '../server/ProficyHistorianSurrogate';
import { DataPreloader, LoadOptions, LoadResult } from './DataPreloader';
import { TestDataScenarios } from './TestDataScenarios';
import { TimeSeriesStore } from '../storage/TimeSeriesStore';
import { TagRegistry } from '../storage/TagRegistry';

/**
 * Surrogate Manager
 * High-level orchestration for testing with the Proficy Historian surrogate
 */
export class SurrogateManager {
  private surrogate: ProficyHistorianSurrogate | null = null;
  private dataPreloader: DataPreloader | null = null;
  private isRunning = false;

  constructor(private config: Partial<SurrogateServerConfig> = {}) {}

  /**
   * Start the surrogate server with optional test scenario
   */
  async start(options: StartOptions = {}): Promise<void> {
    if (this.isRunning) {
      throw new Error('Surrogate is already running');
    }

    try {
      console.log('Starting Proficy Historian Surrogate...');

      // Create and start the surrogate server
      this.surrogate = new ProficyHistorianSurrogate(this.config);
      await this.surrogate.start();

      // Initialize data preloader
      this.dataPreloader = new DataPreloader(
        (this.surrogate as any).timeSeriesStore,
        (this.surrogate as any).tagRegistry
      );

      this.isRunning = true;

      console.log(`Surrogate started at: ${this.surrogate.getUrl()}`);

      // Load initial scenario if specified
      if (options.scenario) {
        await this.loadScenario(options.scenario, options.loadOptions);
      } else if (options.loadMinimalData) {
        await this.preloadMinimalDataset();
      }

    } catch (error: any) {
      console.error('Failed to start surrogate:', error);
      await this.stop(); // Cleanup on failure
      throw error;
    }
  }

  /**
   * Stop the surrogate server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      console.log('Stopping Proficy Historian Surrogate...');

      if (this.surrogate) {
        await this.surrogate.stop();
        this.surrogate = null;
      }

      this.dataPreloader = null;
      this.isRunning = false;

      console.log('Surrogate stopped');

    } catch (error: any) {
      console.error('Error stopping surrogate:', error);
      throw error;
    }
  }

  /**
   * Restart the surrogate server
   */
  async restart(options: StartOptions = {}): Promise<void> {
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause
    await this.start(options);
  }

  /**
   * Load a test scenario
   */
  async loadScenario(scenarioName: string, options: LoadOptions = {}): Promise<LoadResult> {
    this.ensureRunning();

    const result = await this.dataPreloader!.loadScenario(scenarioName, options);

    if (result.success) {
      console.log(`Scenario '${scenarioName}' loaded successfully:`,
        `${result.tagsLoaded} tags, ${result.dataPointsLoaded} data points`);
    } else {
      console.error(`Failed to load scenario '${scenarioName}':`, result.error);
    }

    return result;
  }

  /**
   * Load multiple scenarios
   */
  async loadScenarios(scenarioNames: string[], options: LoadOptions = {}): Promise<LoadResult[]> {
    this.ensureRunning();

    const results = await this.dataPreloader!.loadMultipleScenarios(scenarioNames, options);

    const successful = results.filter(r => r.success).length;
    console.log(`Loaded ${successful}/${results.length} scenarios successfully`);

    return results;
  }

  /**
   * Quick setup with minimal test data
   */
  async preloadMinimalDataset(): Promise<LoadResult> {
    this.ensureRunning();

    console.log('Loading minimal test dataset...');
    const result = await this.dataPreloader!.preloadMinimalDataset();

    if (result.success) {
      console.log('Minimal dataset loaded successfully');
    } else {
      console.error('Failed to load minimal dataset:', result.error);
    }

    return result;
  }

  /**
   * Get server status and health
   */
  async getStatus(): Promise<SurrogateStatus> {
    if (!this.isRunning || !this.surrogate) {
      return {
        running: false,
        url: null,
        health: null,
        loadedScenarios: [],
        tagCount: 0,
        dataPointCount: 0
      };
    }

    try {
      const health = await this.surrogate.getHealthStatus();

      return {
        running: true,
        url: this.surrogate.getUrl(),
        health,
        loadedScenarios: await this.getLoadedScenarios(),
        tagCount: await this.getTagCount(),
        dataPointCount: await this.getDataPointCount()
      };

    } catch (error: any) {
      return {
        running: this.isRunning,
        url: this.surrogate.getUrl(),
        health: null,
        loadedScenarios: [],
        tagCount: 0,
        dataPointCount: 0,
        error: error.message
      };
    }
  }

  /**
   * Get available test scenarios
   */
  async getAvailableScenarios(): Promise<ScenarioInfo[]> {
    const testScenarios = new TestDataScenarios();
    const scenarios = await testScenarios.getAllScenarios();

    const scenarioInfos: ScenarioInfo[] = [];

    for (const [name, generator] of Object.entries(scenarios)) {
      try {
        const scenario = await generator();
        scenarioInfos.push({
          name,
          displayName: scenario.name,
          description: scenario.description,
          tagCount: scenario.tags.length,
          dataPointCount: scenario.dataPoints.length,
          duration: scenario.metadata.duration,
          equipmentCount: scenario.metadata.equipmentCount
        });
      } catch (error: any) {
        console.warn(`Failed to get info for scenario ${name}:`, error.message);
      }
    }

    return scenarioInfos;
  }

  /**
   * Reset all data (clear storage)
   */
  async resetData(): Promise<void> {
    this.ensureRunning();

    console.log('Resetting all data...');

    if (this.surrogate) {
      await this.surrogate.reset();
    }

    console.log('Data reset complete');
  }

  /**
   * Get surrogate configuration
   */
  getConfiguration(): SurrogateServerConfig | null {
    return this.surrogate?.config || null;
  }

  /**
   * Update error simulation settings
   */
  async updateErrorSimulation(settings: ErrorSimulationSettings): Promise<void> {
    this.ensureRunning();

    // This would integrate with the error simulator
    console.log('Error simulation settings updated:', settings);
  }

  /**
   * Create a test client for integration testing
   */
  createTestClient(): TestClient {
    this.ensureRunning();

    return new TestClient(this.surrogate!.getUrl());
  }

  /**
   * Wait for surrogate to be ready
   */
  async waitForReady(timeoutMs = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (this.isRunning && this.surrogate) {
        try {
          const health = await this.surrogate.getHealthStatus();
          if (health.healthy) {
            return;
          }
        } catch (error) {
          // Continue waiting
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(`Surrogate not ready within ${timeoutMs}ms`);
  }

  // Private helper methods

  private ensureRunning(): void {
    if (!this.isRunning || !this.surrogate || !this.dataPreloader) {
      throw new Error('Surrogate is not running. Call start() first.');
    }
  }

  private async getLoadedScenarios(): Promise<string[]> {
    // This would track which scenarios have been loaded
    // For now, return empty array
    return [];
  }

  private async getTagCount(): Promise<number> {
    try {
      if (this.surrogate) {
        const tagRegistry = (this.surrogate as any).tagRegistry as TagRegistry;
        return tagRegistry.getTagCount();
      }
    } catch (error) {
      console.warn('Failed to get tag count:', error);
    }
    return 0;
  }

  private async getDataPointCount(): Promise<number> {
    try {
      if (this.surrogate) {
        const timeSeriesStore = (this.surrogate as any).timeSeriesStore as TimeSeriesStore;
        const health = timeSeriesStore.getHealthStatus();
        return health.totalDataPoints;
      }
    } catch (error) {
      console.warn('Failed to get data point count:', error);
    }
    return 0;
  }
}

/**
 * Test Client for making requests to the surrogate
 */
export class TestClient {
  constructor(private baseUrl: string) {}

  /**
   * Test connection to surrogate
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/historian/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Write test data
   */
  async writeData(data: any[]): Promise<any> {
    const response = await fetch(`${this.baseUrl}/historian/data/write`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from('historian:password').toString('base64')
      },
      body: JSON.stringify({ Data: data })
    });

    return response.json();
  }

  /**
   * Query test data
   */
  async queryData(params: any): Promise<any> {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseUrl}/historian/data/query?${queryString}`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from('historian:password').toString('base64')
      }
    });

    return response.json();
  }

  /**
   * Get server info
   */
  async getServerInfo(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/historian/server/info`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from('historian:password').toString('base64')
      }
    });

    return response.json();
  }

  /**
   * Create a tag
   */
  async createTag(tagConfig: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/historian/tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from('historian:password').toString('base64')
      },
      body: JSON.stringify(tagConfig)
    });

    return response.json();
  }
}

/**
 * Start options interface
 */
export interface StartOptions {
  scenario?: string;                    // Initial scenario to load
  loadMinimalData?: boolean;            // Load minimal test dataset
  loadOptions?: LoadOptions;            // Options for data loading
}

/**
 * Surrogate status interface
 */
export interface SurrogateStatus {
  running: boolean;
  url: string | null;
  health: any;
  loadedScenarios: string[];
  tagCount: number;
  dataPointCount: number;
  error?: string;
}

/**
 * Scenario information interface
 */
export interface ScenarioInfo {
  name: string;
  displayName: string;
  description: string;
  tagCount: number;
  dataPointCount: number;
  duration: number;
  equipmentCount: number;
}

/**
 * Error simulation settings interface
 */
export interface ErrorSimulationSettings {
  enabled: boolean;
  errorRate: number;
  latencySimulation: boolean;
  averageLatency: number;
}

/**
 * Utility function to create a test environment
 */
export async function createTestEnvironment(options: {
  port?: number;
  scenario?: string;
  clearData?: boolean;
} = {}): Promise<SurrogateManager> {
  const config: Partial<SurrogateServerConfig> = {
    server: {
      port: options.port || 8080,
      host: 'localhost',
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

  const manager = new SurrogateManager(config);

  await manager.start({
    scenario: options.scenario,
    loadMinimalData: !options.scenario,
    loadOptions: {
      clearExisting: options.clearData ?? true
    }
  });

  return manager;
}

export default SurrogateManager;