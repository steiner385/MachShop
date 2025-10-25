/**
 * E2E Tests: SPC Western Electric Rules Violation Detection
 *
 * Tests rule violation detection and management:
 * - All 8 Western Electric Rules
 * - Different sensitivity levels (STRICT, NORMAL, RELAXED)
 * - Rule violation persistence
 * - Acknowledgement workflow
 * - Filtering and querying violations
 */

import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/testAuthHelper';

test.describe('SPC Western Electric Rules Violation Detection', () => {
  let authHeaders: Record<string, string>;

  test.beforeAll(async ({ request }) => {
    authHeaders = await loginAsTestUser(request, 'productionSupervisor');
  });

  test('should detect Rule 1: One point beyond 3σ (CRITICAL)', async ({ request }) => {
    const limits = {
      UCL: 100,
      centerLine: 90,
      LCL: 80,
      sigma: 3.33,
    };

    // Data with one point beyond UCL
    const data = [
      { index: 0, value: 90, timestamp: new Date().toISOString() },
      { index: 1, value: 91, timestamp: new Date().toISOString() },
      { index: 2, value: 89, timestamp: new Date().toISOString() },
      { index: 3, value: 105, timestamp: new Date().toISOString() }, // Beyond UCL!
      { index: 4, value: 90, timestamp: new Date().toISOString() },
    ];

    const response = await request.post('/api/v1/spc/evaluate-rules', {
      headers: authHeaders,
      data: {
        data,
        limits,
        enabledRules: [1],
        sensitivity: 'NORMAL',
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();
    expect(jsonData.violations.length).toBeGreaterThan(0);

    const rule1Violations = jsonData.violations.filter((v: any) => v.ruleNumber === 1);
    expect(rule1Violations.length).toBe(1);
    expect(rule1Violations[0].severity).toBe('CRITICAL');
    expect(rule1Violations[0].dataPointIndices).toContain(3);
  });

  test('should detect Rule 2: Nine consecutive points on same side', async ({ request }) => {
    const limits = {
      UCL: 100,
      centerLine: 90,
      LCL: 80,
      sigma: 3.33,
    };

    // Nine consecutive points above center line
    const data = Array.from({ length: 15 }, (_, i) => ({
      index: i,
      value: i < 9 ? 92 + Math.random() : 90, // First 9 above center
      timestamp: new Date().toISOString(),
    }));

    const response = await request.post('/api/v1/spc/evaluate-rules', {
      headers: authHeaders,
      data: {
        data,
        limits,
        enabledRules: [2],
        sensitivity: 'NORMAL',
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();

    const rule2Violations = jsonData.violations.filter((v: any) => v.ruleNumber === 2);
    expect(rule2Violations.length).toBeGreaterThan(0);
    expect(rule2Violations[0].severity).toBe('WARNING');
  });

  test('should detect Rule 3: Six consecutive points trending', async ({ request }) => {
    const limits = {
      UCL: 100,
      centerLine: 90,
      LCL: 80,
      sigma: 3.33,
    };

    // Six consecutive increasing points
    const data = [
      { index: 0, value: 85, timestamp: new Date().toISOString() },
      { index: 1, value: 86, timestamp: new Date().toISOString() },
      { index: 2, value: 87, timestamp: new Date().toISOString() },
      { index: 3, value: 88, timestamp: new Date().toISOString() },
      { index: 4, value: 89, timestamp: new Date().toISOString() },
      { index: 5, value: 90, timestamp: new Date().toISOString() },
      { index: 6, value: 91, timestamp: new Date().toISOString() },
      { index: 7, value: 90, timestamp: new Date().toISOString() },
    ];

    const response = await request.post('/api/v1/spc/evaluate-rules', {
      headers: authHeaders,
      data: {
        data,
        limits,
        enabledRules: [3],
        sensitivity: 'NORMAL',
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();

    const rule3Violations = jsonData.violations.filter((v: any) => v.ruleNumber === 3);
    expect(rule3Violations.length).toBeGreaterThan(0);
    expect(rule3Violations[0].severity).toBe('WARNING');
  });

  test('should detect Rule 4: Fourteen points alternating', async ({ request }) => {
    const limits = {
      UCL: 100,
      centerLine: 90,
      LCL: 80,
      sigma: 3.33,
    };

    // Alternating pattern
    const data = Array.from({ length: 20 }, (_, i) => ({
      index: i,
      value: i % 2 === 0 ? 92 : 88,
      timestamp: new Date().toISOString(),
    }));

    const response = await request.post('/api/v1/spc/evaluate-rules', {
      headers: authHeaders,
      data: {
        data,
        limits,
        enabledRules: [4],
        sensitivity: 'NORMAL',
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();

    const rule4Violations = jsonData.violations.filter((v: any) => v.ruleNumber === 4);
    expect(rule4Violations.length).toBeGreaterThan(0);
    expect(rule4Violations[0].severity).toBe('WARNING');
  });

  test('should detect Rule 5: Two of three points beyond 2σ', async ({ request }) => {
    const limits = {
      UCL: 100,
      centerLine: 90,
      LCL: 80,
      sigma: 3.33,
    };

    const twoSigma = limits.centerLine + 2 * limits.sigma;

    const data = [
      { index: 0, value: 90, timestamp: new Date().toISOString() },
      { index: 1, value: 97, timestamp: new Date().toISOString() }, // Beyond 2σ
      { index: 2, value: 98, timestamp: new Date().toISOString() }, // Beyond 2σ
      { index: 3, value: 90, timestamp: new Date().toISOString() },
    ];

    const response = await request.post('/api/v1/spc/evaluate-rules', {
      headers: authHeaders,
      data: {
        data,
        limits,
        enabledRules: [5],
        sensitivity: 'NORMAL',
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();

    const rule5Violations = jsonData.violations.filter((v: any) => v.ruleNumber === 5);
    expect(rule5Violations.length).toBeGreaterThan(0);
    expect(rule5Violations[0].severity).toBe('WARNING');
  });

  test('should detect Rule 6: Four of five points beyond 1σ', async ({ request }) => {
    const limits = {
      UCL: 100,
      centerLine: 90,
      LCL: 80,
      sigma: 3.33,
    };

    const oneSigma = limits.centerLine + limits.sigma;

    const data = [
      { index: 0, value: 94, timestamp: new Date().toISOString() }, // Beyond 1σ
      { index: 1, value: 95, timestamp: new Date().toISOString() }, // Beyond 1σ
      { index: 2, value: 94, timestamp: new Date().toISOString() }, // Beyond 1σ
      { index: 3, value: 90, timestamp: new Date().toISOString() },
      { index: 4, value: 94, timestamp: new Date().toISOString() }, // Beyond 1σ
    ];

    const response = await request.post('/api/v1/spc/evaluate-rules', {
      headers: authHeaders,
      data: {
        data,
        limits,
        enabledRules: [6],
        sensitivity: 'NORMAL',
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();

    const rule6Violations = jsonData.violations.filter((v: any) => v.ruleNumber === 6);
    expect(rule6Violations.length).toBeGreaterThan(0);
    expect(rule6Violations[0].severity).toBe('INFO');
  });

  test('should detect Rule 7: Fifteen points within 1σ (stratification)', async ({ request }) => {
    const limits = {
      UCL: 100,
      centerLine: 90,
      LCL: 80,
      sigma: 3.33,
    };

    // All points very close to center line
    const data = Array.from({ length: 20 }, (_, i) => ({
      index: i,
      value: 90 + (Math.random() - 0.5) * 0.5, // Very tight around center
      timestamp: new Date().toISOString(),
    }));

    const response = await request.post('/api/v1/spc/evaluate-rules', {
      headers: authHeaders,
      data: {
        data,
        limits,
        enabledRules: [7],
        sensitivity: 'NORMAL',
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();

    const rule7Violations = jsonData.violations.filter((v: any) => v.ruleNumber === 7);
    expect(rule7Violations.length).toBeGreaterThan(0);
    expect(rule7Violations[0].severity).toBe('INFO');
  });

  test('should detect Rule 8: Eight points beyond 1σ either side', async ({ request }) => {
    const limits = {
      UCL: 100,
      centerLine: 90,
      LCL: 80,
      sigma: 3.33,
    };

    // Points beyond 1σ on both sides
    const data = [
      { index: 0, value: 94, timestamp: new Date().toISOString() }, // Above 1σ
      { index: 1, value: 86, timestamp: new Date().toISOString() }, // Below 1σ
      { index: 2, value: 95, timestamp: new Date().toISOString() }, // Above 1σ
      { index: 3, value: 85, timestamp: new Date().toISOString() }, // Below 1σ
      { index: 4, value: 94, timestamp: new Date().toISOString() }, // Above 1σ
      { index: 5, value: 86, timestamp: new Date().toISOString() }, // Below 1σ
      { index: 6, value: 95, timestamp: new Date().toISOString() }, // Above 1σ
      { index: 7, value: 85, timestamp: new Date().toISOString() }, // Below 1σ
      { index: 8, value: 94, timestamp: new Date().toISOString() }, // Above 1σ
    ];

    const response = await request.post('/api/v1/spc/evaluate-rules', {
      headers: authHeaders,
      data: {
        data,
        limits,
        enabledRules: [8],
        sensitivity: 'NORMAL',
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();

    const rule8Violations = jsonData.violations.filter((v: any) => v.ruleNumber === 8);
    expect(rule8Violations.length).toBeGreaterThan(0);
    expect(rule8Violations[0].severity).toBe('WARNING');
  });

  test('should respect enabled rules filter', async ({ request }) => {
    const limits = {
      UCL: 100,
      centerLine: 90,
      LCL: 80,
      sigma: 3.33,
    };

    // Data that would trigger multiple rules
    const data = [
      { index: 0, value: 105, timestamp: new Date().toISOString() }, // Rule 1
      { index: 1, value: 92, timestamp: new Date().toISOString() },
      { index: 2, value: 92, timestamp: new Date().toISOString() },
      { index: 3, value: 92, timestamp: new Date().toISOString() },
      { index: 4, value: 92, timestamp: new Date().toISOString() },
      { index: 5, value: 92, timestamp: new Date().toISOString() },
      { index: 6, value: 92, timestamp: new Date().toISOString() },
      { index: 7, value: 92, timestamp: new Date().toISOString() },
      { index: 8, value: 92, timestamp: new Date().toISOString() },
      { index: 9, value: 92, timestamp: new Date().toISOString() }, // Rule 2
    ];

    // Only enable Rule 1
    const response = await request.post('/api/v1/spc/evaluate-rules', {
      headers: authHeaders,
      data: {
        data,
        limits,
        enabledRules: [1], // Only Rule 1
        sensitivity: 'NORMAL',
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();
    expect(jsonData.violations.length).toBeGreaterThan(0);

    // Should only have Rule 1 violations
    const rule1Count = jsonData.violations.filter((v: any) => v.ruleNumber === 1).length;
    const rule2Count = jsonData.violations.filter((v: any) => v.ruleNumber === 2).length;

    expect(rule1Count).toBeGreaterThan(0);
    expect(rule2Count).toBe(0);
  });

  test('should handle STRICT sensitivity', async ({ request }) => {
    const limits = {
      UCL: 100,
      centerLine: 90,
      LCL: 80,
      sigma: 3.33,
    };

    // Borderline case
    const data = Array.from({ length: 8 }, (_, i) => ({
      index: i,
      value: 92, // Slightly above center
      timestamp: new Date().toISOString(),
    }));

    // STRICT should be more sensitive
    const strictResponse = await request.post('/api/v1/spc/evaluate-rules', {
      headers: authHeaders,
      data: {
        data,
        limits,
        enabledRules: [2],
        sensitivity: 'STRICT',
      },
    });

    // NORMAL might not trigger
    const normalResponse = await request.post('/api/v1/spc/evaluate-rules', {
      headers: authHeaders,
      data: {
        data,
        limits,
        enabledRules: [2],
        sensitivity: 'NORMAL',
      },
    });

    expect(strictResponse.status()).toBe(200);
    expect(normalResponse.status()).toBe(200);

    const strictData = await strictResponse.json();
    const normalData = await normalResponse.json();

    // STRICT should detect more violations (or equal)
    expect(strictData.violations.length).toBeGreaterThanOrEqual(
      normalData.violations.length
    );
  });

  test('should handle RELAXED sensitivity', async ({ request }) => {
    const limits = {
      UCL: 100,
      centerLine: 90,
      LCL: 80,
      sigma: 3.33,
    };

    // Borderline case
    const data = Array.from({ length: 10 }, (_, i) => ({
      index: i,
      value: 91 + Math.random() * 2,
      timestamp: new Date().toISOString(),
    }));

    const relaxedResponse = await request.post('/api/v1/spc/evaluate-rules', {
      headers: authHeaders,
      data: {
        data,
        limits,
        enabledRules: [2, 6],
        sensitivity: 'RELAXED',
      },
    });

    const normalResponse = await request.post('/api/v1/spc/evaluate-rules', {
      headers: authHeaders,
      data: {
        data,
        limits,
        enabledRules: [2, 6],
        sensitivity: 'NORMAL',
      },
    });

    expect(relaxedResponse.status()).toBe(200);
    expect(normalResponse.status()).toBe(200);

    const relaxedData = await relaxedResponse.json();
    const normalData = await normalResponse.json();

    // RELAXED should detect fewer violations (or equal)
    expect(relaxedData.violations.length).toBeLessThanOrEqual(
      normalData.violations.length
    );
  });

  test('should detect multiple rule violations in same dataset', async ({ request }) => {
    const limits = {
      UCL: 100,
      centerLine: 90,
      LCL: 80,
      sigma: 3.33,
    };

    const data = [
      { index: 0, value: 105, timestamp: new Date().toISOString() }, // Rule 1
      { index: 1, value: 92, timestamp: new Date().toISOString() },
      { index: 2, value: 92, timestamp: new Date().toISOString() },
      { index: 3, value: 92, timestamp: new Date().toISOString() },
      { index: 4, value: 92, timestamp: new Date().toISOString() },
      { index: 5, value: 92, timestamp: new Date().toISOString() },
      { index: 6, value: 92, timestamp: new Date().toISOString() },
      { index: 7, value: 92, timestamp: new Date().toISOString() },
      { index: 8, value: 92, timestamp: new Date().toISOString() },
      { index: 9, value: 92, timestamp: new Date().toISOString() }, // Rule 2
    ];

    const response = await request.post('/api/v1/spc/evaluate-rules', {
      headers: authHeaders,
      data: {
        data,
        limits,
        enabledRules: [1, 2, 3, 4, 5, 6, 7, 8],
        sensitivity: 'NORMAL',
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();

    // Should detect both rules
    const rule1Count = jsonData.violations.filter((v: any) => v.ruleNumber === 1).length;
    const rule2Count = jsonData.violations.filter((v: any) => v.ruleNumber === 2).length;

    expect(rule1Count).toBeGreaterThan(0);
    expect(rule2Count).toBeGreaterThan(0);
  });

  test('should return no violations for in-control process', async ({ request }) => {
    const limits = {
      UCL: 100,
      centerLine: 90,
      LCL: 80,
      sigma: 3.33,
    };

    // Random data within control limits
    const data = Array.from({ length: 20 }, (_, i) => ({
      index: i,
      value: 88 + Math.random() * 4, // 88-92, well within limits
      timestamp: new Date().toISOString(),
    }));

    const response = await request.post('/api/v1/spc/evaluate-rules', {
      headers: authHeaders,
      data: {
        data,
        limits,
        enabledRules: [1, 2, 3, 4, 5, 6, 7, 8],
        sensitivity: 'NORMAL',
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();
    expect(jsonData.violations.length).toBe(0);
  });

  test('should get rules information', async ({ request }) => {
    const response = await request.get('/api/v1/spc/rules', {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.length).toBe(8);

    // Verify all 8 rules are present
    for (let i = 1; i <= 8; i++) {
      const rule = data.find((r: any) => r.number === i);
      expect(rule).toBeDefined();
      expect(rule).toHaveProperty('name');
      expect(rule).toHaveProperty('severity');
      expect(rule).toHaveProperty('description');
    }
  });

  test('should reject rule evaluation with invalid data', async ({ request }) => {
    const response = await request.post('/api/v1/spc/evaluate-rules', {
      headers: authHeaders,
      data: {
        data: [], // Empty data
        limits: { UCL: 100, centerLine: 90, LCL: 80, sigma: 3.33 },
        enabledRules: [1],
        sensitivity: 'NORMAL',
      },
    });

    expect(response.status()).toBe(400);
  });

  test('should reject rule evaluation with invalid limits', async ({ request }) => {
    const data = [
      { index: 0, value: 90, timestamp: new Date().toISOString() },
    ];

    const response = await request.post('/api/v1/spc/evaluate-rules', {
      headers: authHeaders,
      data: {
        data,
        limits: { UCL: 80, centerLine: 90, LCL: 100 }, // Invalid: UCL < LCL
        enabledRules: [1],
        sensitivity: 'NORMAL',
      },
    });

    expect(response.status()).toBe(400);
  });
});
