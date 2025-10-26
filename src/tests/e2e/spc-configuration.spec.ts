/**
 * E2E Tests: SPC Configuration Management
 *
 * Tests CRUD operations for SPC configurations including:
 * - Creating SPC configurations for different chart types
 * - Retrieving configurations
 * - Updating configurations
 * - Deleting configurations
 * - Validation and error handling
 */

import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/testAuthHelper';

test.describe('SPC Configuration Management', () => {
  let authHeaders: Record<string, string>;
  let configurationId: string;

  // Pre-seeded test parameter IDs from database seed
  const testParameterIds = [
    'spc-test-param-temperature',
    'spc-test-param-pressure',
    'spc-test-param-dimension',
    'spc-test-param-defects',
    'spc-test-param-flow-rate',
  ];

  test.beforeAll(async ({ request }) => {
    // Get authentication headers
    authHeaders = await loginAsTestUser(request, 'productionSupervisor');
  });

  test.afterEach(async ({ request }) => {
    // Clean up: delete all SPC configurations for test parameters
    for (const testParameterId of testParameterIds) {
      try {
        await request.delete(`/api/v1/spc/configurations/${testParameterId}`, {
          headers: authHeaders,
        });
      } catch (error) {
        // Ignore errors - configuration might not exist
      }
    }
  });

  test('should create an I-MR chart configuration', async ({ request }) => {
    const testParameterId = testParameterIds[0];
    const configData = {
      parameterId: testParameterId,
      chartType: 'I_MR',
      limitsBasedOn: 'HISTORICAL_DATA',
      historicalDataDays: 30,
      USL: 100,
      LSL: 80,
      targetValue: 90,
      enabledRules: [1, 2, 3, 4, 5, 6, 7, 8],
      ruleSensitivity: 'NORMAL',
      enableCapability: true,
      confidenceLevel: 0.95,
      isActive: true,
    };

    const response = await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: configData,
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data.parameterId).toBe(testParameterId);
    expect(data.chartType).toBe('I_MR');
    expect(data.enabledRules).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(data.isActive).toBe(true);

    configurationId = data.id;
  });

  test('should create an X-bar R chart configuration with subgroup size', async ({ request }) => {
    const testParameterId = testParameterIds[1];
    const configData = {
      parameterId: testParameterId,
      chartType: 'X_BAR_R',
      subgroupSize: 5,
      limitsBasedOn: 'HISTORICAL_DATA',
      historicalDataDays: 30,
      USL: 100,
      LSL: 80,
      targetValue: 90,
      enabledRules: [1, 2, 3],
      ruleSensitivity: 'STRICT',
      enableCapability: true,
      confidenceLevel: 0.99,
      isActive: true,
    };

    const response = await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: configData,
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.chartType).toBe('X_BAR_R');
    expect(data.subgroupSize).toBe(5);
    expect(data.ruleSensitivity).toBe('STRICT');
    expect(data.confidenceLevel).toBe(0.99);
  });

  test('should create a P-chart configuration for attribute data', async ({ request }) => {
    const testParameterId = testParameterIds[2];
    const configData = {
      parameterId: testParameterId,
      chartType: 'P_CHART',
      limitsBasedOn: 'HISTORICAL_DATA',
      historicalDataDays: 60,
      enabledRules: [1, 2],
      ruleSensitivity: 'NORMAL',
      enableCapability: false,
      isActive: true,
    };

    const response = await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: configData,
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.chartType).toBe('P_CHART');
    expect(data.enableCapability).toBe(false);
  });

  test('should retrieve an SPC configuration by parameter ID', async ({ request }) => {
    const testParameterId = testParameterIds[3];
    // First create a configuration
    const configData = {
      parameterId: testParameterId,
      chartType: 'I_MR',
      limitsBasedOn: 'SPEC_LIMITS',
      USL: 100,
      LSL: 80,
      enabledRules: [1, 2, 3],
      ruleSensitivity: 'NORMAL',
      enableCapability: true,
      isActive: true,
    };

    await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: configData,
    });

    // Retrieve the configuration
    const response = await request.get(`/api/v1/spc/configurations/${testParameterId}`, {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.parameterId).toBe(testParameterId);
    expect(data.chartType).toBe('I_MR');
    expect(data.USL).toBe(100);
    expect(data.LSL).toBe(80);
  });

  test('should list all SPC configurations', async ({ request }) => {
    const testParameterId = testParameterIds[4];
    // Create a configuration
    const configData = {
      parameterId: testParameterId,
      chartType: 'X_BAR_S',
      subgroupSize: 12,
      limitsBasedOn: 'HISTORICAL_DATA',
      historicalDataDays: 30,
      enabledRules: [1, 2, 3, 4],
      ruleSensitivity: 'NORMAL',
      enableCapability: true,
      isActive: true,
    };

    await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: configData,
    });

    // List all configurations
    const response = await request.get('/api/v1/spc/configurations', {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const ourConfig = data.find((c: any) => c.parameterId === testParameterId);
    expect(ourConfig).toBeDefined();
    expect(ourConfig.chartType).toBe('X_BAR_S');
  });

  test('should update an existing SPC configuration', async ({ request }) => {
    const testParameterId = testParameterIds[0];
    // Create initial configuration
    const initialConfig = {
      parameterId: testParameterId,
      chartType: 'I_MR',
      limitsBasedOn: 'HISTORICAL_DATA',
      historicalDataDays: 30,
      enabledRules: [1, 2, 3],
      ruleSensitivity: 'NORMAL',
      enableCapability: true,
      isActive: true,
    };

    await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: initialConfig,
    });

    // Update the configuration
    const updatedConfig = {
      chartType: 'I_MR',
      limitsBasedOn: 'SPEC_LIMITS',
      USL: 110,
      LSL: 70,
      targetValue: 90,
      enabledRules: [1, 2, 3, 4, 5, 6, 7, 8],
      ruleSensitivity: 'STRICT',
      enableCapability: true,
      confidenceLevel: 0.99,
      isActive: true,
    };

    const response = await request.put(`/api/v1/spc/configurations/${testParameterId}`, {
      headers: authHeaders,
      data: updatedConfig,
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.USL).toBe(110);
    expect(data.LSL).toBe(70);
    expect(data.targetValue).toBe(90);
    expect(data.ruleSensitivity).toBe('STRICT');
    expect(data.enabledRules).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  test('should deactivate an SPC configuration', async ({ request }) => {
    const testParameterId = testParameterIds[1];
    // Create active configuration
    const configData = {
      parameterId: testParameterId,
      chartType: 'C_CHART',
      limitsBasedOn: 'HISTORICAL_DATA',
      historicalDataDays: 30,
      enabledRules: [1],
      ruleSensitivity: 'NORMAL',
      enableCapability: false,
      isActive: true,
    };

    await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: configData,
    });

    // Deactivate it
    const response = await request.put(`/api/v1/spc/configurations/${testParameterId}`, {
      headers: authHeaders,
      data: { ...configData, isActive: false },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.isActive).toBe(false);
  });

  test('should delete an SPC configuration', async ({ request }) => {
    const testParameterId = testParameterIds[2];
    // Create configuration
    const configData = {
      parameterId: testParameterId,
      chartType: 'EWMA',
      limitsBasedOn: 'HISTORICAL_DATA',
      historicalDataDays: 30,
      enabledRules: [1, 2],
      ruleSensitivity: 'RELAXED',
      enableCapability: false,
      isActive: true,
    };

    await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: configData,
    });

    // Delete it
    const deleteResponse = await request.delete(`/api/v1/spc/configurations/${testParameterId}`, {
      headers: authHeaders,
    });

    expect(deleteResponse.status()).toBe(200);

    // Verify it's gone
    const getResponse = await request.get(`/api/v1/spc/configurations/${testParameterId}`, {
      headers: authHeaders,
    });
    expect(getResponse.status()).toBe(404);
  });

  test('should reject configuration with invalid chart type', async ({ request }) => {
    const testParameterId = testParameterIds[3];
    const invalidConfig = {
      parameterId: testParameterId,
      chartType: 'INVALID_CHART',
      limitsBasedOn: 'HISTORICAL_DATA',
      enabledRules: [1, 2],
      ruleSensitivity: 'NORMAL',
      enableCapability: true,
      isActive: true,
    };

    const response = await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: invalidConfig,
    });

    expect(response.status()).toBe(400);
  });

  test('should reject X-bar R configuration without subgroup size', async ({ request }) => {
    const testParameterId = testParameterIds[4];
    const invalidConfig = {
      parameterId: testParameterId,
      chartType: 'X_BAR_R',
      // Missing subgroupSize
      limitsBasedOn: 'HISTORICAL_DATA',
      historicalDataDays: 30,
      enabledRules: [1, 2],
      ruleSensitivity: 'NORMAL',
      enableCapability: true,
      isActive: true,
    };

    const response = await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: invalidConfig,
    });

    expect(response.status()).toBe(400);
    const errorData = await response.json();
    expect(errorData.error).toContain('subgroup');
  });

  test('should reject configuration with invalid rule numbers', async ({ request }) => {
    const testParameterId = testParameterIds[0];
    const invalidConfig = {
      parameterId: testParameterId,
      chartType: 'I_MR',
      limitsBasedOn: 'HISTORICAL_DATA',
      historicalDataDays: 30,
      enabledRules: [1, 2, 9, 10], // Rules 9 and 10 don't exist
      ruleSensitivity: 'NORMAL',
      enableCapability: true,
      isActive: true,
    };

    const response = await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: invalidConfig,
    });

    expect(response.status()).toBe(400);
  });

  test('should prevent duplicate configurations for same parameter', async ({ request }) => {
    const testParameterId = testParameterIds[1];
    // Create first configuration
    const configData = {
      parameterId: testParameterId,
      chartType: 'I_MR',
      limitsBasedOn: 'HISTORICAL_DATA',
      historicalDataDays: 30,
      enabledRules: [1, 2],
      ruleSensitivity: 'NORMAL',
      enableCapability: true,
      isActive: true,
    };

    await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: configData,
    });

    // Try to create duplicate
    const response = await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: configData,
    });

    expect(response.status()).toBe(409);
  });

  test('should create CUSUM chart configuration', async ({ request }) => {
    const testParameterId = testParameterIds[2];
    const configData = {
      parameterId: testParameterId,
      chartType: 'CUSUM',
      limitsBasedOn: 'MANUAL',
      targetValue: 90,
      enabledRules: [1, 2, 3],
      ruleSensitivity: 'NORMAL',
      enableCapability: true,
      isActive: true,
    };

    const response = await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: configData,
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.chartType).toBe('CUSUM');
    expect(data.limitsBasedOn).toBe('MANUAL');
  });

  test('should handle configuration with relaxed sensitivity', async ({ request }) => {
    const testParameterId = testParameterIds[3];
    const configData = {
      parameterId: testParameterId,
      chartType: 'I_MR',
      limitsBasedOn: 'HISTORICAL_DATA',
      historicalDataDays: 30,
      enabledRules: [1, 2, 3, 4],
      ruleSensitivity: 'RELAXED',
      enableCapability: true,
      confidenceLevel: 0.90,
      isActive: true,
    };

    const response = await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: configData,
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.ruleSensitivity).toBe('RELAXED');
    expect(data.confidenceLevel).toBe(0.90);
  });
});
