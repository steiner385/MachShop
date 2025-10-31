import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { ProficyHistorianSurrogate } from '../../../../tests/infrastructure/proficy-historian-surrogate/server/ProficyHistorianSurrogate';
import { SurrogateServerConfig } from '../../../../tests/infrastructure/proficy-historian-surrogate/server/ProficyHistorianSurrogate';
import { SurrogateTag, TagDataType } from '../../../../tests/infrastructure/proficy-historian-surrogate/storage/schemas';

describe('Proficy Historian Surrogate API Integration Tests', () => {
  let surrogate: ProficyHistorianSurrogate;
  let app: Express;
  let serverPort: number;

  const testConfig: SurrogateServerConfig = {
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

  beforeEach(async () => {
    surrogate = new ProficyHistorianSurrogate(testConfig);
    await surrogate.start();
    app = (surrogate as any).app; // Access internal Express app
    serverPort = (surrogate as any).server.address()?.port;
  });

  afterEach(async () => {
    if (surrogate) {
      await surrogate.stop();
    }
  });

  // ==================== AUTHENTICATION TESTS ====================

  describe('Authentication', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/historian/health')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Unauthorized');
    });

    it('should accept requests with valid authentication', async () => {
      const response = await request(app)
        .get('/historian/health')
        .auth('test', 'test123')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('healthy');
    });

    it('should reject requests with invalid credentials', async () => {
      const response = await request(app)
        .get('/historian/health')
        .auth('test', 'wrongpassword')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  // ==================== HEALTH AND STATUS ENDPOINTS ====================

  describe('Health and Status Endpoints', () => {
    it('GET /historian/health should return health status', async () => {
      const response = await request(app)
        .get('/historian/health')
        .auth('test', 'test123')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
      expect(response.body.status).toBe('healthy');
    });

    it('GET /historian/server/info should return server information', async () => {
      const response = await request(app)
        .get('/historian/server/info')
        .auth('test', 'test123')
        .expect(200);

      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('capabilities');
      expect(Array.isArray(response.body.capabilities)).toBe(true);
    });

    it('GET /historian/server/status should return detailed status', async () => {
      const response = await request(app)
        .get('/historian/server/status')
        .auth('test', 'test123')
        .expect(200);

      expect(response.body).toHaveProperty('server');
      expect(response.body).toHaveProperty('storage');
      expect(response.body).toHaveProperty('performance');
      expect(response.body.server).toHaveProperty('status');
      expect(response.body.storage).toHaveProperty('totalDataPoints');
      expect(response.body.performance).toHaveProperty('requestsPerSecond');
    });
  });

  // ==================== TAG MANAGEMENT ENDPOINTS ====================

  describe('Tag Management Endpoints', () => {
    const sampleTag: SurrogateTag = {
      id: 'test-tag-1',
      tagName: 'TEST.INTEGRATION.SENSOR1',
      description: 'Integration test sensor 1',
      dataType: TagDataType.Float,
      engineeringUnits: '°C',
      collector: 'TEST',
      compressionType: 'None',
      compressionDeviation: 0,
      storageType: 'Normal',
      retentionHours: 24,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'integration-test',
      isActive: true,
      defaultQuality: 100,
      qualityThreshold: 50
    };

    it('POST /historian/tags should create a new tag', async () => {
      const response = await request(app)
        .post('/historian/tags')
        .auth('test', 'test123')
        .send(sampleTag)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('tag');
      expect(response.body.tag.tagName).toBe(sampleTag.tagName);
      expect(response.body.tag.description).toBe(sampleTag.description);
    });

    it('GET /historian/tags should return all tags', async () => {
      // Create a tag first
      await request(app)
        .post('/historian/tags')
        .auth('test', 'test123')
        .send(sampleTag);

      const response = await request(app)
        .get('/historian/tags')
        .auth('test', 'test123')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('tags');
      expect(Array.isArray(response.body.tags)).toBe(true);
      expect(response.body.tags.length).toBeGreaterThan(0);
    });

    it('GET /historian/tags/:tagName should return specific tag', async () => {
      // Create a tag first
      await request(app)
        .post('/historian/tags')
        .auth('test', 'test123')
        .send(sampleTag);

      const response = await request(app)
        .get('/historian/tags/TEST.INTEGRATION.SENSOR1')
        .auth('test', 'test123')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('tag');
      expect(response.body.tag.tagName).toBe('TEST.INTEGRATION.SENSOR1');
    });

    it('PUT /historian/tags/:tagName should update tag', async () => {
      // Create a tag first
      await request(app)
        .post('/historian/tags')
        .auth('test', 'test123')
        .send(sampleTag);

      const updates = {
        description: 'Updated integration test sensor',
        engineeringUnits: 'K'
      };

      const response = await request(app)
        .put('/historian/tags/TEST.INTEGRATION.SENSOR1')
        .auth('test', 'test123')
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.tag.description).toBe('Updated integration test sensor');
      expect(response.body.tag.engineeringUnits).toBe('K');
    });

    it('DELETE /historian/tags/:tagName should delete tag', async () => {
      // Create a tag first
      await request(app)
        .post('/historian/tags')
        .auth('test', 'test123')
        .send(sampleTag);

      const response = await request(app)
        .delete('/historian/tags/TEST.INTEGRATION.SENSOR1')
        .auth('test', 'test123')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify tag is deleted
      await request(app)
        .get('/historian/tags/TEST.INTEGRATION.SENSOR1')
        .auth('test', 'test123')
        .expect(404);
    });

    it('should validate tag data on creation', async () => {
      const invalidTag = {
        tagName: '', // Invalid empty name
        description: 'Invalid tag',
        dataType: 'InvalidType'
      };

      const response = await request(app)
        .post('/historian/tags')
        .auth('test', 'test123')
        .send(invalidTag)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  // ==================== DATA WRITE ENDPOINTS ====================

  describe('Data Write Endpoints', () => {
    beforeEach(async () => {
      // Create a test tag for data writing
      const testTag: SurrogateTag = {
        id: 'test-tag-1',
        tagName: 'TEST.DATA.SENSOR1',
        description: 'Test data sensor 1',
        dataType: TagDataType.Float,
        engineeringUnits: '°C',
        collector: 'TEST',
        compressionType: 'None',
        compressionDeviation: 0,
        storageType: 'Normal',
        retentionHours: 24,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test',
        isActive: true,
        defaultQuality: 100,
        qualityThreshold: 50
      };

      await request(app)
        .post('/historian/tags')
        .auth('test', 'test123')
        .send(testTag);
    });

    it('POST /historian/data/write should write data points', async () => {
      const dataPoints = {
        Data: [
          {
            TagName: 'TEST.DATA.SENSOR1',
            Value: 25.5,
            Timestamp: new Date().toISOString(),
            Quality: 100
          },
          {
            TagName: 'TEST.DATA.SENSOR1',
            Value: 26.0,
            Timestamp: new Date(Date.now() + 1000).toISOString(),
            Quality: 100
          }
        ]
      };

      const response = await request(app)
        .post('/historian/data/write')
        .auth('test', 'test123')
        .send(dataPoints)
        .expect(200);

      expect(response.body).toHaveProperty('Success', true);
      expect(response.body).toHaveProperty('PointsWritten', 2);
      expect(response.body).toHaveProperty('PointsFailed', 0);
    });

    it('POST /historian/data/write/single should write single data point', async () => {
      const dataPoint = {
        TagName: 'TEST.DATA.SENSOR1',
        Value: 25.5,
        Timestamp: new Date().toISOString(),
        Quality: 100
      };

      const response = await request(app)
        .post('/historian/data/write/single')
        .auth('test', 'test123')
        .send(dataPoint)
        .expect(200);

      expect(response.body).toHaveProperty('Success', true);
      expect(response.body).toHaveProperty('Message');
    });

    it('POST /historian/data/write/buffered should write buffered data', async () => {
      const bufferedData = {
        Data: [
          {
            TagName: 'TEST.DATA.SENSOR1',
            Value: 25.5,
            Timestamp: new Date().toISOString(),
            Quality: 100
          }
        ],
        BufferSize: 100,
        FlushInterval: 5000
      };

      const response = await request(app)
        .post('/historian/data/write/buffered')
        .auth('test', 'test123')
        .send(bufferedData)
        .expect(200);

      expect(response.body).toHaveProperty('Success', true);
      expect(response.body).toHaveProperty('BufferStatus');
    });

    it('should validate data points on write', async () => {
      const invalidData = {
        Data: [
          {
            TagName: 'NONEXISTENT.TAG',
            Value: 25.5,
            Timestamp: new Date().toISOString(),
            Quality: 100
          }
        ]
      };

      const response = await request(app)
        .post('/historian/data/write')
        .auth('test', 'test123')
        .send(invalidData)
        .expect(200); // Should return 200 but with errors

      expect(response.body).toHaveProperty('Success', false);
      expect(response.body).toHaveProperty('PointsFailed', 1);
      expect(response.body).toHaveProperty('Errors');
    });

    it('should handle malformed requests', async () => {
      const malformedData = {
        NotData: 'invalid'
      };

      const response = await request(app)
        .post('/historian/data/write')
        .auth('test', 'test123')
        .send(malformedData)
        .expect(400);

      expect(response.body).toHaveProperty('Success', false);
      expect(response.body).toHaveProperty('Error');
    });
  });

  // ==================== DATA QUERY ENDPOINTS ====================

  describe('Data Query Endpoints', () => {
    beforeEach(async () => {
      // Create test tag and data
      const testTag: SurrogateTag = {
        id: 'test-tag-1',
        tagName: 'TEST.QUERY.SENSOR1',
        description: 'Test query sensor 1',
        dataType: TagDataType.Float,
        engineeringUnits: '°C',
        collector: 'TEST',
        compressionType: 'None',
        compressionDeviation: 0,
        storageType: 'Normal',
        retentionHours: 24,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test',
        isActive: true,
        defaultQuality: 100,
        qualityThreshold: 50
      };

      await request(app)
        .post('/historian/tags')
        .auth('test', 'test123')
        .send(testTag);

      // Write test data
      const testData = {
        Data: []
      };

      for (let i = 0; i < 10; i++) {
        testData.Data.push({
          TagName: 'TEST.QUERY.SENSOR1',
          Value: 20 + i,
          Timestamp: new Date(Date.now() + i * 60000).toISOString(), // 1 minute intervals
          Quality: 100
        });
      }

      await request(app)
        .post('/historian/data/write')
        .auth('test', 'test123')
        .send(testData);
    });

    it('GET /historian/data/query should query data points', async () => {
      const startTime = new Date(Date.now() - 300000).toISOString(); // 5 minutes ago
      const endTime = new Date(Date.now() + 900000).toISOString();   // 15 minutes from now

      const response = await request(app)
        .get('/historian/data/query')
        .auth('test', 'test123')
        .query({
          tagNames: 'TEST.QUERY.SENSOR1',
          startTime,
          endTime
        })
        .expect(200);

      expect(response.body).toHaveProperty('Success', true);
      expect(response.body).toHaveProperty('Data');
      expect(Array.isArray(response.body.Data)).toBe(true);
      expect(response.body.Data.length).toBeGreaterThan(0);
    });

    it('GET /historian/data/recent should get recent data', async () => {
      const response = await request(app)
        .get('/historian/data/recent')
        .auth('test', 'test123')
        .query({
          tagName: 'TEST.QUERY.SENSOR1',
          count: 5
        })
        .expect(200);

      expect(response.body).toHaveProperty('Success', true);
      expect(response.body).toHaveProperty('Data');
      expect(Array.isArray(response.body.Data)).toBe(true);
      expect(response.body.Data.length).toBeLessThanOrEqual(5);
    });

    it('POST /historian/data/aggregate should calculate aggregations', async () => {
      const aggregationRequest = {
        TagName: 'TEST.QUERY.SENSOR1',
        AggregationType: 'Average',
        StartTime: new Date(Date.now() - 300000).toISOString(),
        EndTime: new Date(Date.now() + 900000).toISOString()
      };

      const response = await request(app)
        .post('/historian/data/aggregate')
        .auth('test', 'test123')
        .send(aggregationRequest)
        .expect(200);

      expect(response.body).toHaveProperty('Success', true);
      expect(response.body).toHaveProperty('Value');
      expect(response.body).toHaveProperty('Count');
      expect(typeof response.body.Value).toBe('number');
    });

    it('should handle query with multiple tags', async () => {
      const startTime = new Date(Date.now() - 300000).toISOString();
      const endTime = new Date(Date.now() + 900000).toISOString();

      const response = await request(app)
        .get('/historian/data/query')
        .auth('test', 'test123')
        .query({
          tagNames: 'TEST.QUERY.SENSOR1,NONEXISTENT.TAG',
          startTime,
          endTime
        })
        .expect(200);

      expect(response.body).toHaveProperty('Success');
      expect(response.body).toHaveProperty('Data');
      // Should return data for valid tags, skip invalid ones
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/historian/data/query')
        .auth('test', 'test123')
        .query({
          // Missing required parameters
        })
        .expect(400);

      expect(response.body).toHaveProperty('Success', false);
      expect(response.body).toHaveProperty('Error');
    });
  });

  // ==================== SCENARIO MANAGEMENT ENDPOINTS ====================

  describe('Scenario Management Endpoints', () => {
    it('GET /historian/scenarios should list available scenarios', async () => {
      const response = await request(app)
        .get('/historian/scenarios')
        .auth('test', 'test123')
        .expect(200);

      expect(response.body).toHaveProperty('Success', true);
      expect(response.body).toHaveProperty('Scenarios');
      expect(Array.isArray(response.body.Scenarios)).toBe(true);
    });

    it('POST /historian/scenarios/:name/load should load test scenario', async () => {
      const response = await request(app)
        .post('/historian/scenarios/manufacturing_line_1/load')
        .auth('test', 'test123')
        .send({
          clearExisting: true,
          options: {}
        })
        .expect(200);

      expect(response.body).toHaveProperty('Success');
      // Note: Success might be false if scenario doesn't exist, but endpoint should respond
    });

    it('POST /historian/scenarios/reset should reset all data', async () => {
      const response = await request(app)
        .post('/historian/scenarios/reset')
        .auth('test', 'test123')
        .expect(200);

      expect(response.body).toHaveProperty('Success', true);
      expect(response.body).toHaveProperty('Message');
    });
  });

  // ==================== ERROR SIMULATION ENDPOINTS ====================

  describe('Error Simulation Endpoints', () => {
    it('POST /historian/simulation/errors/activate should activate error scenario', async () => {
      const response = await request(app)
        .post('/historian/simulation/errors/activate')
        .auth('test', 'test123')
        .send({
          scenario: 'null_values',
          enabled: true
        })
        .expect(200);

      expect(response.body).toHaveProperty('Success', true);
      expect(response.body).toHaveProperty('Message');
    });

    it('GET /historian/simulation/errors/scenarios should list error scenarios', async () => {
      const response = await request(app)
        .get('/historian/simulation/errors/scenarios')
        .auth('test', 'test123')
        .expect(200);

      expect(response.body).toHaveProperty('Success', true);
      expect(response.body).toHaveProperty('Scenarios');
      expect(Array.isArray(response.body.Scenarios)).toBe(true);
    });

    it('GET /historian/simulation/errors/status should get error simulation status', async () => {
      const response = await request(app)
        .get('/historian/simulation/errors/status')
        .auth('test', 'test123')
        .expect(200);

      expect(response.body).toHaveProperty('Success', true);
      expect(response.body).toHaveProperty('ActiveScenarios');
      expect(Array.isArray(response.body.ActiveScenarios)).toBe(true);
    });
  });

  // ==================== CORS AND HEADERS ====================

  describe('CORS and Headers', () => {
    it('should include CORS headers when enabled', async () => {
      const response = await request(app)
        .options('/historian/health')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    it('should include security headers', async () => {
      const response = await request(app)
        .get('/historian/health')
        .auth('test', 'test123')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });

  // ==================== RATE LIMITING ====================

  describe('Rate Limiting (when enabled)', () => {
    it('should handle rate limits gracefully', async () => {
      // This test would require rate limiting to be enabled
      // For now, just verify the endpoint doesn't crash with many requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/historian/health')
            .auth('test', 'test123')
        );
      }

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status); // OK or Too Many Requests
      });
    });
  });

  // ==================== ERROR HANDLING ====================

  describe('Error Handling', () => {
    it('should handle invalid JSON gracefully', async () => {
      const response = await request(app)
        .post('/historian/data/write')
        .auth('test', 'test123')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('Success', false);
      expect(response.body).toHaveProperty('Error');
    });

    it('should handle unsupported content types', async () => {
      const response = await request(app)
        .post('/historian/data/write')
        .auth('test', 'test123')
        .set('Content-Type', 'text/plain')
        .send('plain text')
        .expect(400);

      expect(response.body).toHaveProperty('Success', false);
    });

    it('should handle method not allowed', async () => {
      const response = await request(app)
        .patch('/historian/health') // PATCH not supported
        .auth('test', 'test123')
        .expect(405);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle not found routes', async () => {
      const response = await request(app)
        .get('/historian/nonexistent')
        .auth('test', 'test123')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Not Found');
    });
  });

  // ==================== PERFORMANCE MONITORING ====================

  describe('Performance Monitoring', () => {
    it('GET /historian/performance/metrics should return performance metrics', async () => {
      const response = await request(app)
        .get('/historian/performance/metrics')
        .auth('test', 'test123')
        .expect(200);

      expect(response.body).toHaveProperty('Success', true);
      expect(response.body).toHaveProperty('Metrics');
      expect(response.body.Metrics).toHaveProperty('requestsPerSecond');
      expect(response.body.Metrics).toHaveProperty('averageResponseTime');
      expect(response.body.Metrics).toHaveProperty('memoryUsage');
    });

    it('should track request metrics', async () => {
      // Make several requests
      for (let i = 0; i < 5; i++) {
        await request(app)
          .get('/historian/health')
          .auth('test', 'test123')
          .expect(200);
      }

      const response = await request(app)
        .get('/historian/performance/metrics')
        .auth('test', 'test123')
        .expect(200);

      expect(response.body.Metrics.totalRequests).toBeGreaterThanOrEqual(5);
    });
  });

  // ==================== COMPATIBILITY TESTS ====================

  describe('GE Proficy Historian Compatibility', () => {
    it('should accept data in GE Proficy format', async () => {
      // Create test tag first
      const testTag: SurrogateTag = {
        id: 'compat-tag-1',
        tagName: 'COMPAT.TEST.SENSOR1',
        description: 'Compatibility test sensor',
        dataType: TagDataType.Float,
        engineeringUnits: '°C',
        collector: 'TEST',
        compressionType: 'None',
        compressionDeviation: 0,
        storageType: 'Normal',
        retentionHours: 24,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test',
        isActive: true,
        defaultQuality: 100,
        qualityThreshold: 50
      };

      await request(app)
        .post('/historian/tags')
        .auth('test', 'test123')
        .send(testTag);

      // Test GE Proficy format data submission
      const proficyFormatData = {
        Data: [
          {
            TagName: 'COMPAT.TEST.SENSOR1',
            Value: 25.5,
            Timestamp: '/Date(1640995200000)/', // GE Proficy date format
            Quality: 100
          }
        ]
      };

      const response = await request(app)
        .post('/historian/data/write')
        .auth('test', 'test123')
        .send(proficyFormatData)
        .expect(200);

      expect(response.body).toHaveProperty('Success', true);
      expect(response.body).toHaveProperty('PointsWritten', 1);
    });

    it('should return data in GE Proficy compatible format', async () => {
      // Query data and verify format
      const response = await request(app)
        .get('/historian/data/query')
        .auth('test', 'test123')
        .query({
          tagNames: 'COMPAT.TEST.SENSOR1',
          startTime: new Date(Date.now() - 3600000).toISOString(),
          endTime: new Date().toISOString()
        })
        .expect(200);

      expect(response.body).toHaveProperty('Success', true);
      expect(response.body).toHaveProperty('Data');

      if (response.body.Data.length > 0) {
        const dataPoint = response.body.Data[0];
        expect(dataPoint).toHaveProperty('TagName');
        expect(dataPoint).toHaveProperty('Value');
        expect(dataPoint).toHaveProperty('Timestamp');
        expect(dataPoint).toHaveProperty('Quality');
      }
    });
  });
});