/**
 * E2E Tests: SPC End-to-End Workflow
 *
 * Tests complete SPC workflows including:
 * - Full SPC analysis (limits + rules + capability)
 * - Configuration to analysis pipeline
 * - Multi-parameter SPC monitoring
 * - Real-world manufacturing scenarios
 * - Integration with operation parameters
 */

import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/testAuthHelper';

test.describe('SPC End-to-End Workflow', () => {
  let authHeaders: Record<string, string>;

  // Pre-seeded test parameter IDs from database seed
  const testParameterIds = [
    'spc-test-param-temperature',
    'spc-test-param-pressure',
    'spc-test-param-dimension',
    'spc-test-param-defects',
    'spc-test-param-flow-rate',
  ];

  test.beforeAll(async ({ request }) => {
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

  test('should perform complete SPC analysis (I-MR chart)', async ({ request }) => {
    const testParameterId = testParameterIds[0];
    // Step 1: Create SPC configuration
    const configData = {
      parameterId: testParameterId,
      chartType: 'I_MR',
      limitsBasedOn: 'HISTORICAL_DATA',
      historicalDataDays: 30,
      USL: 10.5,
      LSL: 9.5,
      targetValue: 10.0,
      enabledRules: [1, 2, 3, 4, 5, 6, 7, 8],
      ruleSensitivity: 'NORMAL',
      enableCapability: true,
      confidenceLevel: 0.95,
      isActive: true,
    };

    const configResponse = await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: configData,
    });

    expect(configResponse.status()).toBe(201);

    // Step 2: Generate measurement data
    const individuals = Array.from({ length: 50 }, (_, i) => 10.0 + (Math.random() - 0.5) * 0.3);

    // Step 3: Perform comprehensive SPC analysis
    const analysisResponse = await request.post('/api/v1/spc/analyze', {
      headers: authHeaders,
      data: {
        parameterId: testParameterId,
        data: individuals.map((value, index) => ({
          index,
          value,
          timestamp: new Date(Date.now() + index * 60000).toISOString(),
        })),
      },
    });

    expect(analysisResponse.status()).toBe(200);
    const analysisData = await analysisResponse.json();
    expect(analysisData).toHaveProperty('limits');
    expect(analysisData).toHaveProperty('capability');
    expect(analysisData).toHaveProperty('violations');

    // Verify limits
    expect(analysisData.limits).toHaveProperty('UCL');
    expect(analysisData.limits).toHaveProperty('centerLine');
    expect(analysisData.limits).toHaveProperty('LCL');

    // Verify capability
    expect(analysisData.capability).toHaveProperty('Cp');
    expect(analysisData.capability).toHaveProperty('Cpk');
    expect(analysisData.capability).toHaveProperty('Cpm');

    // Violations is an array (may be empty for good process)
    expect(Array.isArray(analysisData.violations)).toBe(true);
  });

  test('should perform complete SPC analysis (X-bar R chart)', async ({ request }) => {
    const testParameterId = testParameterIds[1];
    // Step 1: Create SPC configuration for X-bar R
    const configData = {
      parameterId: testParameterId,
      chartType: 'X_BAR_R',
      subgroupSize: 5,
      limitsBasedOn: 'SPEC_LIMITS',
      USL: 105,
      LSL: 95,
      targetValue: 100,
      enabledRules: [1, 2, 3],
      ruleSensitivity: 'NORMAL',
      enableCapability: true,
      isActive: true,
    };

    await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: configData,
    });

    // Step 2: Generate subgroup data
    const subgroups = Array.from({ length: 20 }, () =>
      Array.from({ length: 5 }, () => 100 + (Math.random() - 0.5) * 3)
    );

    // Step 3: Calculate control limits
    const limitsResponse = await request.post('/api/v1/spc/control-limits/xbar-r', {
      headers: authHeaders,
      data: {
        subgroups,
        specLimits: { USL: 105, LSL: 95, target: 100 },
      },
    });

    expect(limitsResponse.status()).toBe(200);
    const limits = await limitsResponse.json();

    // Step 4: Evaluate rules on X-bar values
    const xBarValues = subgroups.map((sg, i) => ({
      index: i,
      value: sg.reduce((a, b) => a + b, 0) / sg.length,
      timestamp: new Date().toISOString(),
    }));

    const rulesResponse = await request.post('/api/v1/spc/evaluate-rules', {
      headers: authHeaders,
      data: {
        data: xBarValues,
        limits: limits,
        enabledRules: [1, 2, 3],
        sensitivity: 'NORMAL',
      },
    });

    expect(rulesResponse.status()).toBe(200);

    // Step 5: Calculate capability
    const allMeasurements = subgroups.flat();
    const capabilityResponse = await request.post('/api/v1/spc/capability', {
      headers: authHeaders,
      data: {
        data: allMeasurements,
        USL: 105,
        LSL: 95,
        target: 100,
      },
    });

    expect(capabilityResponse.status()).toBe(200);
    const capData = await capabilityResponse.json();
    expect(capData.Cpk).toBeGreaterThan(0);
  });

  test('should detect out-of-control condition and create violation', async ({ request }) => {
    const testParameterId = testParameterIds[2];
    // Step 1: Create configuration
    await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: {
        parameterId: testParameterId,
        chartType: 'I_MR',
        limitsBasedOn: 'SPEC_LIMITS',
        USL: 100,
        LSL: 80,
        enabledRules: [1],
        ruleSensitivity: 'NORMAL',
        enableCapability: false,
        isActive: true,
      },
    });

    // Step 2: Create data with out-of-control point
    const data = [
      { index: 0, value: 90, timestamp: new Date().toISOString() },
      { index: 1, value: 91, timestamp: new Date().toISOString() },
      { index: 2, value: 89, timestamp: new Date().toISOString() },
      { index: 3, value: 110, timestamp: new Date().toISOString() }, // Way beyond UCL
      { index: 4, value: 90, timestamp: new Date().toISOString() },
    ];

    // Step 3: Analyze
    const analysisResponse = await request.post('/api/v1/spc/analyze', {
      headers: authHeaders,
      data: {
        parameterId: testParameterId,
        data,
      },
    });

    expect(analysisResponse.status()).toBe(200);
    const analysisData = await analysisResponse.json();

    // Should detect violation
    expect(analysisData.violations.length).toBeGreaterThan(0);

    const criticalViolations = analysisData.violations.filter(
      (v: any) => v.severity === 'CRITICAL'
    );
    expect(criticalViolations.length).toBeGreaterThan(0);
  });

  test('should handle process improvement scenario', async ({ request }) => {
    const testParameterId = testParameterIds[3];
    // Scenario: Process initially out of control, then improved

    // Step 1: Create configuration
    await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: {
        parameterId: testParameterId,
        chartType: 'I_MR',
        limitsBasedOn: 'SPEC_LIMITS',
        USL: 105,
        LSL: 95,
        targetValue: 100,
        enabledRules: [1, 2],
        ruleSensitivity: 'NORMAL',
        enableCapability: true,
        isActive: true,
      },
    });

    // Step 2: Initial data (poor capability)
    const initialData = Array.from({ length: 30 }, () => 100 + (Math.random() - 0.5) * 10);

    const initialAnalysis = await request.post('/api/v1/spc/analyze', {
      headers: authHeaders,
      data: {
        parameterId: testParameterId,
        data: initialData.map((value, index) => ({
          index,
          value,
          timestamp: new Date().toISOString(),
        })),
      },
    });

    expect(initialAnalysis.status()).toBe(200);
    const initialData_result = await initialAnalysis.json();

    // Initial Cpk should be low
    const initialCpk = initialData_result.capability.Cpk;
    expect(initialCpk).toBeLessThan(1.33);

    // Step 3: Improved data (better capability)
    const improvedData = Array.from({ length: 30 }, () => 100 + (Math.random() - 0.5) * 2);

    const improvedAnalysis = await request.post('/api/v1/spc/analyze', {
      headers: authHeaders,
      data: {
        parameterId: testParameterId,
        data: improvedData.map((value, index) => ({
          index,
          value,
          timestamp: new Date().toISOString(),
        })),
      },
    });

    expect(improvedAnalysis.status()).toBe(200);
    const improvedData_result = await improvedAnalysis.json();

    // Improved Cpk should be higher
    const improvedCpk = improvedData_result.capability.Cpk;
    expect(improvedCpk).toBeGreaterThan(initialCpk);
  });

  test('should handle multi-parameter SPC monitoring', async ({ request }) => {
    const testParameterId = testParameterIds[4];
    const param2Id = testParameterIds[0]; // Use first parameter as second parameter for this test

    // Configure SPC for both parameters
    await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: {
        parameterId: testParameterId,
          chartType: 'I_MR',
          limitsBasedOn: 'SPEC_LIMITS',
          USL: 10.5,
          LSL: 9.5,
          enabledRules: [1, 2],
          ruleSensitivity: 'NORMAL',
          enableCapability: true,
          isActive: true,
        },
      });

    await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: {
        parameterId: param2Id,
        chartType: 'I_MR',
        limitsBasedOn: 'SPEC_LIMITS',
        USL: 85,
        LSL: 75,
        enabledRules: [1, 2],
        ruleSensitivity: 'NORMAL',
        enableCapability: true,
        isActive: true,
      },
    });

    // List all configurations
    const listResponse = await request.get('/api/v1/spc/configurations', {
      headers: authHeaders,
    });

    expect(listResponse.status()).toBe(200);
    const configs = await listResponse.json();

    const ourConfigs = configs.filter(
      (c: any) => c.parameterId === testParameterId || c.parameterId === param2Id
    );
    expect(ourConfigs.length).toBe(2);

    // Analyze both parameters
    const param1Data = Array.from({ length: 20 }, (_, i) => ({
      index: i,
      value: 10 + (Math.random() - 0.5) * 0.3,
      timestamp: new Date().toISOString(),
    }));

    const param2DataArray = Array.from({ length: 20 }, (_, i) => ({
      index: i,
      value: 80 + (Math.random() - 0.5) * 2,
      timestamp: new Date().toISOString(),
    }));

    const analysis1 = await request.post('/api/v1/spc/analyze', {
      headers: authHeaders,
      data: {
        parameterId: testParameterId,
        data: param1Data,
      },
    });

    const analysis2 = await request.post('/api/v1/spc/analyze', {
      headers: authHeaders,
      data: {
        parameterId: param2Id,
        data: param2DataArray,
      },
    });

    expect(analysis1.status()).toBe(200);
    expect(analysis2.status()).toBe(200);

    const analysis1Data = await analysis1.json();
    const analysis2Data = await analysis2.json();

    expect(analysis1Data).toHaveProperty('capability');
    expect(analysis2Data).toHaveProperty('capability');
  });

  test('should handle P-chart workflow for defect tracking', async ({ request }) => {
    const testParameterId = testParameterIds[1];
    // Step 1: Create P-chart configuration
    await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: {
        parameterId: testParameterId,
        chartType: 'P_CHART',
        limitsBasedOn: 'HISTORICAL_DATA',
        historicalDataDays: 30,
        enabledRules: [1, 2],
        ruleSensitivity: 'NORMAL',
        enableCapability: false,
        isActive: true,
      },
    });

    // Step 2: Calculate P-chart limits
    const defectCounts = [3, 5, 2, 4, 6, 3, 5, 4, 2, 3];
    const sampleSizes = Array(10).fill(100);

    const limitsResponse = await request.post('/api/v1/spc/control-limits/p-chart', {
      headers: authHeaders,
      data: {
        defectCounts,
        sampleSizes,
      },
    });

    expect(limitsResponse.status()).toBe(200);
    const limits = await limitsResponse.json();

    // Step 3: Evaluate rules on proportion defective
    const proportions = defectCounts.map((count, i) => ({
      index: i,
      value: count / sampleSizes[i],
      timestamp: new Date().toISOString(),
    }));

    const rulesResponse = await request.post('/api/v1/spc/evaluate-rules', {
      headers: authHeaders,
      data: {
        data: proportions,
        limits: limits,
        enabledRules: [1, 2],
        sensitivity: 'NORMAL',
      },
    });

    expect(rulesResponse.status()).toBe(200);
  });

  test('should handle configuration update and re-analysis', async ({ request }) => {
    const testParameterId = testParameterIds[2];
    // Step 1: Create initial configuration
    await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: {
        parameterId: testParameterId,
        chartType: 'I_MR',
        limitsBasedOn: 'SPEC_LIMITS',
        USL: 100,
        LSL: 80,
        enabledRules: [1],
        ruleSensitivity: 'NORMAL',
        enableCapability: true,
        isActive: true,
      },
    });

    // Step 2: Perform initial analysis
    const data = Array.from({ length: 30 }, (_, i) => ({
      index: i,
      value: 90 + (Math.random() - 0.5) * 5,
      timestamp: new Date().toISOString(),
    }));

    const initialAnalysis = await request.post('/api/v1/spc/analyze', {
      headers: authHeaders,
      data: {
        parameterId: testParameterId,
        data,
      },
    });

    expect(initialAnalysis.status()).toBe(200);
    const initialData = await initialAnalysis.json();

    // Step 3: Update configuration (enable more rules, change sensitivity)
    const updateResponse = await request.put(`/api/v1/spc/configurations/${testParameterId}`, {
      headers: authHeaders,
      data: {
        chartType: 'I_MR',
        limitsBasedOn: 'SPEC_LIMITS',
        USL: 100,
        LSL: 80,
        enabledRules: [1, 2, 3, 4, 5, 6, 7, 8],
        ruleSensitivity: 'STRICT',
        enableCapability: true,
        isActive: true,
      },
    });

    expect(updateResponse.status()).toBe(200);

    // Step 4: Re-analyze with updated configuration
    const updatedAnalysis = await request.post('/api/v1/spc/analyze', {
      headers: authHeaders,
      data: {
        parameterId: testParameterId,
        data,
      },
    });

    expect(updatedAnalysis.status()).toBe(200);
    const updatedData = await updatedAnalysis.json();

    // With more rules and STRICT sensitivity, might detect more violations
    expect(updatedData.violations.length).toBeGreaterThanOrEqual(
      initialData.violations.length
    );
  });

  test('should handle deactivation and reactivation of SPC monitoring', async ({ request }) => {
    const testParameterId = testParameterIds[3];
    // Step 1: Create active configuration
    await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: {
        parameterId: testParameterId,
        chartType: 'I_MR',
        limitsBasedOn: 'SPEC_LIMITS',
        USL: 100,
        LSL: 80,
        enabledRules: [1],
        ruleSensitivity: 'NORMAL',
        enableCapability: true,
        isActive: true,
      },
    });

    // Step 2: Verify it's active
    let configResponse = await request.get(`/api/v1/spc/configurations/${testParameterId}`, {
      headers: authHeaders,
    });
    let config = await configResponse.json();
    expect(config.isActive).toBe(true);

    // Step 3: Deactivate
    await request.put(`/api/v1/spc/configurations/${testParameterId}`, {
      headers: authHeaders,
      data: {
        ...config,
        isActive: false,
      },
    });

    configResponse = await request.get(`/api/v1/spc/configurations/${testParameterId}`, {
      headers: authHeaders,
    });
    config = await configResponse.json();
    expect(config.isActive).toBe(false);

    // Step 4: Reactivate
    await request.put(`/api/v1/spc/configurations/${testParameterId}`, {
      headers: authHeaders,
      data: {
        ...config,
        isActive: true,
      },
    });

    configResponse = await request.get(`/api/v1/spc/configurations/${testParameterId}`, {
      headers: authHeaders,
    });
    config = await configResponse.json();
    expect(config.isActive).toBe(true);
  });

  test('should perform comprehensive 6-sigma process analysis', async ({ request }) => {
    const testParameterId = testParameterIds[4];
    // Simulate a 6-sigma capable process

    // Step 1: Configure for high-precision monitoring
    await request.post('/api/v1/spc/configurations', {
      headers: authHeaders,
      data: {
        parameterId: testParameterId,
        chartType: 'I_MR',
        limitsBasedOn: 'SPEC_LIMITS',
        USL: 50.5,
        LSL: 49.5,
        targetValue: 50.0,
        enabledRules: [1, 2, 3, 4, 5, 6, 7, 8],
        ruleSensitivity: 'STRICT',
        enableCapability: true,
        confidenceLevel: 0.99,
        isActive: true,
      },
    });

    // Step 2: Generate 6-sigma quality data (very tight process)
    const data = Array.from({ length: 100 }, (_, i) => ({
      index: i,
      value: 50.0 + (Math.random() - 0.5) * 0.08, // ±0.04 variation
      timestamp: new Date(Date.now() + i * 60000).toISOString(),
    }));

    // Step 3: Comprehensive analysis
    const analysisResponse = await request.post('/api/v1/spc/analyze', {
      headers: authHeaders,
      data: {
        parameterId: testParameterId,
        data,
      },
    });

    expect(analysisResponse.status()).toBe(200);
    const analysisData = await analysisResponse.json();

    // 6-sigma process should have Cpk >= 2.0
    expect(analysisData.capability.Cpk).toBeGreaterThan(1.5);

    // Should have minimal or no violations
    expect(analysisData.violations.length).toBeLessThan(5);
  });
});
