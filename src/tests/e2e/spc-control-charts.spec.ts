/**
 * E2E Tests: SPC Control Chart Calculations
 *
 * Tests control limit calculations for different chart types:
 * - X-bar and R charts
 * - X-bar and S charts
 * - I-MR (Individual and Moving Range) charts
 * - P-charts (proportion defective)
 * - C-charts (count of defects)
 * - Validation of statistical calculations
 */

import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/testAuthHelper';

test.describe('SPC Control Chart Calculations', () => {
  let authHeaders: Record<string, string>;

  test.beforeAll(async ({ request }) => {
    authHeaders = await loginAsTestUser(request, 'productionSupervisor');
  });

  test('should calculate X-bar and R control limits correctly', async ({ request }) => {
    // Sample data: 10 subgroups of size 5
    const subgroups = [
      [50.2, 50.5, 50.3, 50.4, 50.6],
      [50.1, 50.3, 50.2, 50.4, 50.5],
      [50.3, 50.6, 50.4, 50.5, 50.7],
      [50.2, 50.4, 50.3, 50.5, 50.6],
      [50.4, 50.5, 50.6, 50.7, 50.8],
      [50.3, 50.4, 50.5, 50.6, 50.5],
      [50.2, 50.3, 50.4, 50.5, 50.4],
      [50.5, 50.6, 50.7, 50.8, 50.7],
      [50.3, 50.4, 50.5, 50.6, 50.5],
      [50.4, 50.5, 50.6, 50.7, 50.6],
    ];

    const response = await request.post('/api/v1/spc/control-limits/xbar-r', {
      headers: authHeaders,
      data: {
        subgroups,
        specLimits: {
          USL: 51.0,
          LSL: 49.5,
          target: 50.5,
        },
      },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('UCL');
    expect(data).toHaveProperty('centerLine');
    expect(data).toHaveProperty('LCL');
    expect(data).toHaveProperty('rangeUCL');
    expect(data).toHaveProperty('rangeCL');
    expect(data).toHaveProperty('rangeLCL');
    expect(data).toHaveProperty('sigma');

    // Verify center line is reasonable (around 50.5)
    expect(data.centerLine).toBeGreaterThan(50.0);
    expect(data.centerLine).toBeLessThan(51.0);

    // Verify limits make sense
    expect(data.UCL).toBeGreaterThan(data.centerLine);
    expect(data.LCL).toBeLessThan(data.centerLine);

    // Verify range limits
    expect(data.rangeUCL).toBeGreaterThan(0);
    expect(data.rangeCL).toBeGreaterThan(0);
  });

  test('should calculate X-bar and S control limits for larger subgroups', async ({ request }) => {
    // Sample data: 8 subgroups of size 12
    const subgroups = Array.from({ length: 8 }, (_, i) =>
      Array.from({ length: 12 }, (_, j) => 100 + Math.random() * 10 + i * 0.5)
    );

    const response = await request.post('/api/v1/spc/control-limits/xbar-s', {
      headers: authHeaders,
      data: { subgroups },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('UCL');
    expect(data).toHaveProperty('centerLine');
    expect(data).toHaveProperty('LCL');
    expect(data).toHaveProperty('sigma');

    // Verify center line is in expected range
    expect(data.centerLine).toBeGreaterThan(100);
    expect(data.centerLine).toBeLessThan(115);
  });

  test('should calculate I-MR (Individual and Moving Range) control limits', async ({ request }) => {
    // Individual measurements
    const individuals = [
      85.2, 85.5, 85.3, 85.6, 85.4, 85.7, 85.5, 85.8,
      85.6, 85.4, 85.7, 85.5, 85.9, 85.6, 85.8, 85.7,
      85.5, 85.6, 85.8, 85.7, 85.9, 85.8, 86.0, 85.9,
      85.7, 85.8, 86.1, 85.9, 86.0, 85.8,
    ];

    const response = await request.post('/api/v1/spc/control-limits/imr', {
      headers: authHeaders,
      data: {
        individuals,
        specLimits: {
          USL: 87.0,
          LSL: 84.0,
          target: 85.5,
        },
      },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('UCL');
    expect(data).toHaveProperty('centerLine');
    expect(data).toHaveProperty('LCL');
    expect(data).toHaveProperty('movingRangeUCL');
    expect(data).toHaveProperty('movingRangeCL');
    expect(data).toHaveProperty('sigma');

    // Verify center line is around 85.5-86
    expect(data.centerLine).toBeGreaterThan(85.0);
    expect(data.centerLine).toBeLessThan(87.0);

    // Verify moving range limits
    expect(data.movingRangeUCL).toBeGreaterThan(0);
    expect(data.movingRangeCL).toBeGreaterThan(0);
  });

  test('should calculate P-chart control limits for attribute data', async ({ request }) => {
    // Defect counts and sample sizes
    const defectCounts = [3, 5, 2, 4, 6, 3, 5, 4, 2, 3, 4, 5, 3, 6, 4];
    const sampleSizes = Array(15).fill(100); // 100 items per sample

    const response = await request.post('/api/v1/spc/control-limits/p-chart', {
      headers: authHeaders,
      data: {
        defectCounts,
        sampleSizes,
      },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('UCL');
    expect(data).toHaveProperty('centerLine');
    expect(data).toHaveProperty('LCL');

    // Verify center line is a proportion (0-1)
    expect(data.centerLine).toBeGreaterThanOrEqual(0);
    expect(data.centerLine).toBeLessThanOrEqual(1);

    // Verify UCL is less than or equal to 1
    expect(data.UCL).toBeLessThanOrEqual(1);

    // LCL might be 0 for low defect rates
    expect(data.LCL).toBeGreaterThanOrEqual(0);
  });

  test('should calculate P-chart limits with variable sample sizes', async ({ request }) => {
    const defectCounts = [2, 4, 3, 5, 2, 4, 3];
    const sampleSizes = [50, 75, 100, 80, 60, 90, 70];

    const response = await request.post('/api/v1/spc/control-limits/p-chart', {
      headers: authHeaders,
      data: {
        defectCounts,
        sampleSizes,
      },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('UCL');
    expect(data).toHaveProperty('centerLine');
    expect(data).toHaveProperty('LCL');
  });

  test('should calculate C-chart control limits for defect counts', async ({ request }) => {
    // Count of defects per unit
    const defectCounts = [5, 7, 6, 8, 5, 9, 7, 6, 8, 7, 6, 9, 8, 7, 6];

    const response = await request.post('/api/v1/spc/control-limits/c-chart', {
      headers: authHeaders,
      data: { defectCounts },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('UCL');
    expect(data).toHaveProperty('centerLine');
    expect(data).toHaveProperty('LCL');

    // Verify center line equals average defect count
    const avgDefects = defectCounts.reduce((a, b) => a + b, 0) / defectCounts.length;
    expect(data.centerLine).toBeCloseTo(avgDefects, 2);

    // LCL might be 0 for low defect counts
    expect(data.LCL).toBeGreaterThanOrEqual(0);
  });

  test('should reject X-bar R calculation with inconsistent subgroup sizes', async ({ request }) => {
    const invalidSubgroups = [
      [50.2, 50.5, 50.3, 50.4, 50.6],
      [50.1, 50.3, 50.2], // Different size!
      [50.3, 50.6, 50.4, 50.5, 50.7],
    ];

    const response = await request.post('/api/v1/spc/control-limits/xbar-r', {
      headers: authHeaders,
      data: { subgroups: invalidSubgroups },
    });

    expect(response.status()).toBe(400);
    const errorData = await response.json();
    expect(errorData.error).toContain('subgroup');
  });

  test('should reject X-bar R calculation with too few subgroups', async ({ request }) => {
    const tooFewSubgroups = [
      [50.2, 50.5, 50.3, 50.4, 50.6],
    ];

    const response = await request.post('/api/v1/spc/control-limits/xbar-r', {
      headers: authHeaders,
      data: { subgroups: tooFewSubgroups },
    });

    expect(response.status()).toBe(400);
    const errorData = await response.json();
    expect(errorData.error).toContain('at least');
  });

  test('should reject I-MR calculation with too few data points', async ({ request }) => {
    const tooFewPoints = [85.2, 85.5];

    const response = await request.post('/api/v1/spc/control-limits/imr', {
      headers: authHeaders,
      data: { individuals: tooFewPoints },
    });

    expect(response.status()).toBe(400);
  });

  test('should reject P-chart with mismatched array lengths', async ({ request }) => {
    const defectCounts = [3, 5, 2, 4];
    const sampleSizes = [100, 100]; // Different length!

    const response = await request.post('/api/v1/spc/control-limits/p-chart', {
      headers: authHeaders,
      data: { defectCounts, sampleSizes },
    });

    expect(response.status()).toBe(400);

    // ✅ GITHUB ISSUE #13 TEST: Verify enhanced error message format
    const errorData = await response.json();
    expect(errorData.error).toBe('VALIDATION_ERROR');
    expect(errorData.message).toContain('Array length mismatch');
    expect(errorData.message).toContain('defectCounts has 4 values but sampleSizes has 2 values');
    expect(errorData.details).toMatchObject({
      defectCountsLength: 4,
      sampleSizesLength: 2,
      suggestion: 'Ensure each defect count has a corresponding sample size value'
    });
  });

  // ✅ GITHUB ISSUE #13 ADDITIONAL TESTS: Comprehensive P-chart validation coverage
  test('should reject P-chart with missing defectCounts', async ({ request }) => {
    const response = await request.post('/api/v1/spc/control-limits/p-chart', {
      headers: authHeaders,
      data: { sampleSizes: [100, 100, 100] },
    });

    expect(response.status()).toBe(400);
    const errorData = await response.json();
    expect(errorData.error).toBe('VALIDATION_ERROR');
    expect(errorData.message).toContain('Both defectCounts and sampleSizes arrays are required');
  });

  test('should reject P-chart with non-array input', async ({ request }) => {
    const response = await request.post('/api/v1/spc/control-limits/p-chart', {
      headers: authHeaders,
      data: {
        defectCounts: "not an array",
        sampleSizes: [100, 100, 100]
      },
    });

    expect(response.status()).toBe(400);
    const errorData = await response.json();
    expect(errorData.error).toBe('VALIDATION_ERROR');
    expect(errorData.message).toContain('Both defectCounts and sampleSizes must be arrays');
  });

  test('should reject P-chart with empty arrays', async ({ request }) => {
    const response = await request.post('/api/v1/spc/control-limits/p-chart', {
      headers: authHeaders,
      data: {
        defectCounts: [],
        sampleSizes: []
      },
    });

    expect(response.status()).toBe(400);
    const errorData = await response.json();
    expect(errorData.error).toBe('VALIDATION_ERROR');
    expect(errorData.message).toContain('Both defectCounts and sampleSizes arrays must contain at least one value');
  });

  test('should reject P-chart with invalid number values', async ({ request }) => {
    const response = await request.post('/api/v1/spc/control-limits/p-chart', {
      headers: authHeaders,
      data: {
        defectCounts: [3, "invalid", 2],
        sampleSizes: [100, 100, 100]
      },
    });

    expect(response.status()).toBe(400);
    const errorData = await response.json();
    expect(errorData.error).toBe('VALIDATION_ERROR');
    expect(errorData.message).toContain('All defect count values must be valid numbers');
  });

  test('should handle X-bar R calculation with specification limits', async ({ request }) => {
    const subgroups = Array.from({ length: 10 }, () =>
      Array.from({ length: 5 }, () => 90 + Math.random() * 10)
    );

    const response = await request.post('/api/v1/spc/control-limits/xbar-r', {
      headers: authHeaders,
      data: {
        subgroups,
        specLimits: {
          USL: 105,
          LSL: 85,
          target: 95,
        },
      },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('UCL');
    expect(data).toHaveProperty('centerLine');
    expect(data).toHaveProperty('LCL');
  });

  test('should calculate limits for process with high variation', async ({ request }) => {
    const subgroups = [
      [40, 50, 45, 60, 55],
      [45, 55, 50, 65, 60],
      [35, 45, 40, 55, 50],
      [50, 60, 55, 70, 65],
      [40, 50, 45, 60, 55],
    ];

    const response = await request.post('/api/v1/spc/control-limits/xbar-r', {
      headers: authHeaders,
      data: { subgroups },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    // High variation should result in wide control limits
    const spread = data.UCL - data.LCL;
    expect(spread).toBeGreaterThan(10);
  });

  test('should calculate limits for process with low variation', async ({ request }) => {
    const subgroups = Array.from({ length: 10 }, () =>
      Array.from({ length: 5 }, () => 100 + (Math.random() - 0.5) * 0.2)
    );

    const response = await request.post('/api/v1/spc/control-limits/xbar-r', {
      headers: authHeaders,
      data: { subgroups },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    // Low variation should result in narrow control limits
    const spread = data.UCL - data.LCL;
    expect(spread).toBeLessThan(1);
  });

  test('should handle C-chart with zero defects in some samples', async ({ request }) => {
    const defectCounts = [0, 1, 0, 2, 1, 0, 3, 1, 0, 2];

    const response = await request.post('/api/v1/spc/control-limits/c-chart', {
      headers: authHeaders,
      data: { defectCounts },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.LCL).toBeGreaterThanOrEqual(0);
  });

  test('should calculate X-bar S limits with subgroup size 15', async ({ request }) => {
    const subgroups = Array.from({ length: 10 }, () =>
      Array.from({ length: 15 }, () => 200 + Math.random() * 20)
    );

    const response = await request.post('/api/v1/spc/control-limits/xbar-s', {
      headers: authHeaders,
      data: { subgroups },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('UCL');
    expect(data).toHaveProperty('centerLine');
    expect(data).toHaveProperty('LCL');
    expect(data).toHaveProperty('sigma');
  });
});
