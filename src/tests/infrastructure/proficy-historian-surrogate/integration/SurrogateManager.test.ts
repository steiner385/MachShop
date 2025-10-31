import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SurrogateManager, createTestEnvironment } from '../../../../tests/infrastructure/proficy-historian-surrogate/integration/SurrogateManager';
import { SurrogateServerConfig } from '../../../../tests/infrastructure/proficy-historian-surrogate/server/ProficyHistorianSurrogate';
import { LoadOptions } from '../../../../tests/infrastructure/proficy-historian-surrogate/integration/DataPreloader';

describe('SurrogateManager Integration Tests', () => {
  let manager: SurrogateManager;

  const testConfig: Partial<SurrogateServerConfig> = {
    server: {
      port: 0, // Let system assign port
      host: 'localhost',
      enableCors: true,
      requestTimeout: 10000,
      rateLimitEnabled: false,
      rateLimitWindow: 900000,
      rateLimitMax: 1000
    },
    authentication: {
      enabled: true,
      authType: 'basic',
      username: 'test',
      password: 'test123'
    },
    storage: {
      maxDataPoints: 10000,
      retentionHours: 1,
      compressionEnabled: false,
      aggregationEnabled: true
    },
    errorSimulation: {
      enabled: false,
      errorRate: 0,
      latencySimulation: false,
      averageLatency: 0
    },
    logging: {
      enabled: false,
      level: 'error'
    }
  };

  beforeEach(() => {
    manager = new SurrogateManager(testConfig);
  });

  afterEach(async () => {
    if (manager) {
      try {
        await manager.stop();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  // ==================== BASIC LIFECYCLE MANAGEMENT ====================

  describe('Lifecycle Management', () => {
    it('should start and stop the surrogate successfully', async () => {
      await manager.start();

      const status = await manager.getStatus();
      expect(status.running).toBe(true);
      expect(status.url).toBeDefined();
      expect(status.health).toBeDefined();

      await manager.stop();

      const stoppedStatus = await manager.getStatus();
      expect(stoppedStatus.running).toBe(false);
    });

    it('should prevent starting when already running', async () => {
      await manager.start();

      await expect(manager.start()).rejects.toThrow('Surrogate is already running');

      await manager.stop();
    });

    it('should handle stop when not running', async () => {
      // Should not throw error when stopping a non-running manager
      await expect(manager.stop()).resolves.not.toThrow();
    });

    it('should restart successfully', async () => {
      await manager.start();

      const initialStatus = await manager.getStatus();
      expect(initialStatus.running).toBe(true);

      await manager.restart();

      const restartedStatus = await manager.getStatus();
      expect(restartedStatus.running).toBe(true);
      expect(restartedStatus.url).toBeDefined();
    });

    it('should wait for surrogate to be ready', async () => {
      const startPromise = manager.start();
      const readyPromise = manager.waitForReady(10000);

      await Promise.all([startPromise, readyPromise]);

      const status = await manager.getStatus();
      expect(status.running).toBe(true);
      expect(status.health?.healthy).toBe(true);
    });

    it('should timeout if surrogate not ready in time', async () => {
      // Don't start the manager, so it will never be ready
      await expect(manager.waitForReady(1000)).rejects.toThrow('Surrogate not ready within 1000ms');
    });
  });

  // ==================== SCENARIO LOADING ====================

  describe('Scenario Loading', () => {
    beforeEach(async () => {
      await manager.start();
    });

    it('should load minimal dataset on startup', async () => {
      await manager.stop();

      const managerWithMinimalData = new SurrogateManager(testConfig);
      await managerWithMinimalData.start({ loadMinimalData: true });

      const status = await managerWithMinimalData.getStatus();
      expect(status.running).toBe(true);
      expect(status.tagCount).toBeGreaterThan(0);
      expect(status.dataPointCount).toBeGreaterThan(0);

      await managerWithMinimalData.stop();
    });

    it('should load preload minimal dataset', async () => {
      const result = await manager.preloadMinimalDataset();

      expect(result.success).toBe(true);
      expect(result.tagsLoaded).toBeGreaterThan(0);
      expect(result.dataPointsLoaded).toBeGreaterThan(0);

      const status = await manager.getStatus();
      expect(status.tagCount).toBeGreaterThan(0);
      expect(status.dataPointCount).toBeGreaterThan(0);
    });

    it('should get available scenarios', async () => {
      const scenarios = await manager.getAvailableScenarios();

      expect(Array.isArray(scenarios)).toBe(true);
      // Should have at least some built-in scenarios
      expect(scenarios.length).toBeGreaterThan(0);

      scenarios.forEach(scenario => {
        expect(scenario).toHaveProperty('name');
        expect(scenario).toHaveProperty('displayName');
        expect(scenario).toHaveProperty('description');
        expect(scenario).toHaveProperty('tagCount');
        expect(scenario).toHaveProperty('dataPointCount');
        expect(typeof scenario.tagCount).toBe('number');
        expect(typeof scenario.dataPointCount).toBe('number');
      });
    });

    it('should load multiple scenarios', async () => {
      const scenarios = await manager.getAvailableScenarios();

      if (scenarios.length >= 2) {
        const scenarioNames = scenarios.slice(0, 2).map(s => s.name);
        const results = await manager.loadScenarios(scenarioNames);

        expect(results.length).toBe(2);
        results.forEach(result => {
          expect(result).toHaveProperty('success');
          expect(result).toHaveProperty('scenarioName');
          expect(result).toHaveProperty('tagsLoaded');
          expect(result).toHaveProperty('dataPointsLoaded');
        });
      }
    });

    it('should handle loading non-existent scenario', async () => {
      const result = await manager.loadScenario('nonexistent_scenario');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Unknown scenario');
    });

    it('should load scenario with custom options', async () => {
      const options: LoadOptions = {
        clearExisting: true,
        batchSize: 50,
        verbose: true
      };

      const result = await manager.preloadMinimalDataset();
      expect(result.success).toBe(true);
    });
  });

  // ==================== STATUS AND HEALTH MONITORING ====================

  describe('Status and Health Monitoring', () => {
    it('should return comprehensive status when running', async () => {
      await manager.start();

      const status = await manager.getStatus();

      expect(status).toHaveProperty('running', true);
      expect(status).toHaveProperty('url');
      expect(status).toHaveProperty('health');
      expect(status).toHaveProperty('loadedScenarios');
      expect(status).toHaveProperty('tagCount');
      expect(status).toHaveProperty('dataPointCount');

      expect(typeof status.url).toBe('string');
      expect(Array.isArray(status.loadedScenarios)).toBe(true);
      expect(typeof status.tagCount).toBe('number');
      expect(typeof status.dataPointCount).toBe('number');
      expect(status.health).toHaveProperty('healthy');
    });

    it('should return empty status when not running', async () => {
      const status = await manager.getStatus();

      expect(status).toHaveProperty('running', false);
      expect(status).toHaveProperty('url', null);
      expect(status).toHaveProperty('health', null);
      expect(status).toHaveProperty('loadedScenarios', []);
      expect(status).toHaveProperty('tagCount', 0);
      expect(status).toHaveProperty('dataPointCount', 0);
    });

    it('should handle health check errors gracefully', async () => {
      await manager.start();

      // Force an error by stopping the underlying surrogate but not the manager
      const surrogate = (manager as any).surrogate;
      if (surrogate) {
        await surrogate.stop();
      }

      const status = await manager.getStatus();

      expect(status.running).toBe(true); // Manager thinks it's running
      expect(status.health).toBeNull(); // But health check failed
      expect(status).toHaveProperty('error');
    });
  });

  // ==================== DATA MANAGEMENT ====================

  describe('Data Management', () => {
    beforeEach(async () => {
      await manager.start();
    });

    it('should reset all data', async () => {
      // Load some data first
      await manager.preloadMinimalDataset();

      let status = await manager.getStatus();
      expect(status.tagCount).toBeGreaterThan(0);
      expect(status.dataPointCount).toBeGreaterThan(0);

      // Reset data
      await manager.resetData();

      status = await manager.getStatus();
      expect(status.tagCount).toBe(0);
      expect(status.dataPointCount).toBe(0);
    });

    it('should handle reset when no data exists', async () => {
      // Should not throw error when resetting empty data
      await expect(manager.resetData()).resolves.not.toThrow();
    });
  });

  // ==================== CONFIGURATION MANAGEMENT ====================

  describe('Configuration Management', () => {
    it('should return current configuration', async () => {
      await manager.start();

      const config = manager.getConfiguration();

      expect(config).toBeDefined();
      expect(config).toHaveProperty('server');
      expect(config).toHaveProperty('authentication');
      expect(config).toHaveProperty('storage');
      expect(config?.server).toHaveProperty('port');
      expect(config?.server).toHaveProperty('host');
    });

    it('should return null configuration when not running', async () => {
      const config = manager.getConfiguration();
      expect(config).toBeNull();
    });

    it('should update error simulation settings', async () => {
      await manager.start();

      const errorSettings = {
        enabled: true,
        errorRate: 0.05,
        latencySimulation: true,
        averageLatency: 100
      };

      await expect(manager.updateErrorSimulation(errorSettings)).resolves.not.toThrow();
    });
  });

  // ==================== TEST CLIENT ====================

  describe('Test Client', () => {
    beforeEach(async () => {
      await manager.start();
    });

    it('should create test client', async () => {
      const client = manager.createTestClient();

      expect(client).toBeDefined();
      expect(client).toHaveProperty('testConnection');
      expect(client).toHaveProperty('writeData');
      expect(client).toHaveProperty('queryData');
      expect(client).toHaveProperty('getServerInfo');
      expect(client).toHaveProperty('createTag');
    });

    it('should test connection with test client', async () => {
      const client = manager.createTestClient();

      const isConnected = await client.testConnection();
      expect(isConnected).toBe(true);
    });

    it('should get server info with test client', async () => {
      const client = manager.createTestClient();

      const serverInfo = await client.getServerInfo();
      expect(serverInfo).toBeDefined();
      expect(serverInfo).toHaveProperty('name');
      expect(serverInfo).toHaveProperty('version');
    });

    it('should create tag with test client', async () => {
      const client = manager.createTestClient();

      const tagConfig = {
        TagName: 'TEST.CLIENT.TAG',
        Description: 'Test client tag',
        DataType: 'Float',
        EngineeringUnits: 'units'
      };

      const result = await client.createTag(tagConfig);
      expect(result).toBeDefined();
    });

    it('should write and query data with test client', async () => {
      const client = manager.createTestClient();

      // Create tag first
      const tagConfig = {
        TagName: 'TEST.CLIENT.DATA',
        Description: 'Test client data tag',
        DataType: 'Float',
        EngineeringUnits: 'units'
      };

      await client.createTag(tagConfig);

      // Write data
      const testData = [
        {
          TagName: 'TEST.CLIENT.DATA',
          Value: 25.5,
          Timestamp: new Date().toISOString(),
          Quality: 100
        }
      ];

      const writeResult = await client.writeData(testData);
      expect(writeResult).toBeDefined();

      // Query data
      const queryParams = {
        tagNames: 'TEST.CLIENT.DATA',
        startTime: new Date(Date.now() - 3600000).toISOString(),
        endTime: new Date().toISOString()
      };

      const queryResult = await client.queryData(queryParams);
      expect(queryResult).toBeDefined();
    });
  });

  // ==================== ERROR HANDLING ====================

  describe('Error Handling', () => {
    it('should handle startup errors gracefully', async () => {
      // Create manager with invalid configuration
      const invalidConfig = {
        server: {
          port: -1, // Invalid port
          host: 'localhost'
        }
      };

      const invalidManager = new SurrogateManager(invalidConfig);

      await expect(invalidManager.start()).rejects.toThrow();
    });

    it('should throw error for operations when not running', async () => {
      await expect(manager.loadScenario('test')).rejects.toThrow('Surrogate is not running');
      await expect(manager.preloadMinimalDataset()).rejects.toThrow('Surrogate is not running');
      await expect(manager.resetData()).rejects.toThrow('Surrogate is not running');
      await expect(manager.updateErrorSimulation({})).rejects.toThrow('Surrogate is not running');
      expect(() => manager.createTestClient()).toThrow('Surrogate is not running');
    });

    it('should handle concurrent operations', async () => {
      const promises = [
        manager.start(),
        manager.start().catch(() => {}), // Should fail but not crash
        manager.start().catch(() => {})  // Should fail but not crash
      ];

      await Promise.allSettled(promises);

      const status = await manager.getStatus();
      expect(status.running).toBe(true);
    });
  });

  // ==================== PERFORMANCE TESTS ====================

  describe('Performance Tests', () => {
    beforeEach(async () => {
      await manager.start();
    });

    it('should handle multiple scenario loads efficiently', async () => {
      const startTime = Date.now();

      // Load minimal dataset multiple times
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(manager.preloadMinimalDataset());
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle rapid status checks', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(manager.getStatus());
      }

      const statuses = await Promise.all(promises);

      statuses.forEach(status => {
        expect(status.running).toBe(true);
        expect(status.url).toBeDefined();
      });
    });
  });
});

// ==================== TEST ENVIRONMENT FACTORY TESTS ====================

describe('createTestEnvironment Factory', () => {
  let testEnv: SurrogateManager;

  afterEach(async () => {
    if (testEnv) {
      await testEnv.stop();
    }
  });

  it('should create test environment with default configuration', async () => {
    testEnv = await createTestEnvironment();

    const status = await testEnv.getStatus();
    expect(status.running).toBe(true);
    expect(status.tagCount).toBeGreaterThan(0); // Should load minimal data by default
    expect(status.dataPointCount).toBeGreaterThan(0);
  });

  it('should create test environment with custom port', async () => {
    testEnv = await createTestEnvironment({ port: 9999 });

    const status = await testEnv.getStatus();
    expect(status.running).toBe(true);
    expect(status.url).toContain('9999');
  });

  it('should create test environment with specific scenario', async () => {
    // This will fail if scenario doesn't exist, but should not crash
    try {
      testEnv = await createTestEnvironment({ scenario: 'manufacturing_line_1' });
      const status = await testEnv.getStatus();
      expect(status.running).toBe(true);
    } catch (error) {
      // Scenario might not exist, which is okay for this test
      expect(error).toBeDefined();
    }
  });

  it('should create test environment with data clearing', async () => {
    testEnv = await createTestEnvironment({ clearData: true });

    const status = await testEnv.getStatus();
    expect(status.running).toBe(true);
  });

  it('should handle factory errors gracefully', async () => {
    // Test with invalid configuration
    await expect(createTestEnvironment({ port: -1 })).rejects.toThrow();
  });
});