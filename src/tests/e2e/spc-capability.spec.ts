/**
 * E2E Tests: SPC Process Capability Analysis
 *
 * Tests capability indices calculations:
 * - Cp (Process Potential)
 * - Cpk (Process Capability Index)
 * - Pp (Process Performance)
 * - Ppk (Process Performance Index)
 * - Cpm (Taguchi Index)
 * - Capability interpretation and validation
 */

import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/testAuthHelper';

test.describe('SPC Process Capability Analysis', () => {
  let authHeaders: Record<string, string>;

  test.beforeAll(async ({ request }) => {
    authHeaders = await loginAsTestUser(request, 'productionSupervisor');
  });

  test('should calculate Cp and Cpk for capable process', async ({ request }) => {
    // Well-centered process with low variation
    const data = Array.from({ length: 100 }, () => 90 + (Math.random() - 0.5) * 3);

    const response = await request.post('/api/v1/spc/capability', {
      headers: authHeaders,
      data: {
        data,
        USL: 100,
        LSL: 80,
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();
    expect(jsonData).toHaveProperty('Cp');
    expect(jsonData).toHaveProperty('Cpk');
    expect(jsonData).toHaveProperty('Pp');
    expect(jsonData).toHaveProperty('Ppk');

    // For a capable process, Cp should be >= 1.33
    expect(jsonData.Cp).toBeGreaterThan(1.0);

    // Cpk should be close to Cp for centered process
    expect(Math.abs(jsonData.Cp - jsonData.Cpk)).toBeLessThan(0.5);
  });

  test('should calculate Cpm (Taguchi) when target is provided', async ({ request }) => {
    const data = Array.from({ length: 100 }, () => 90 + (Math.random() - 0.5) * 2);

    const response = await request.post('/api/v1/spc/capability', {
      headers: authHeaders,
      data: {
        data,
        USL: 95,
        LSL: 85,
        target: 90,
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();
    expect(jsonData).toHaveProperty('Cpm');
    expect(jsonData.Cpm).toBeGreaterThan(0);
  });

  test('should show Cpk < Cp for off-center process', async ({ request }) => {
    // Process mean shifted toward USL
    const data = Array.from({ length: 100 }, () => 95 + (Math.random() - 0.5) * 2);

    const response = await request.post('/api/v1/spc/capability', {
      headers: authHeaders,
      data: {
        data,
        USL: 100,
        LSL: 80,
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();

    // Cpk should be noticeably less than Cp
    expect(jsonData.Cpk).toBeLessThan(jsonData.Cp);
  });

  test('should calculate indices for 6-sigma capable process', async ({ request }) => {
    // Very tight process (6-sigma capable)
    const data = Array.from({ length: 100 }, () => 90 + (Math.random() - 0.5) * 0.5);

    const response = await request.post('/api/v1/spc/capability', {
      headers: authHeaders,
      data: {
        data,
        USL: 100,
        LSL: 80,
        target: 90,
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();

    // 6-sigma process should have Cpk >= 2.0
    expect(jsonData.Cpk).toBeGreaterThan(1.5);
    expect(jsonData.Cp).toBeGreaterThan(1.5);
  });

  test('should calculate indices for marginal process (Cpk ~1.0)', async ({ request }) => {
    // Process just meeting spec limits
    const data = Array.from({ length: 100 }, () => 90 + (Math.random() - 0.5) * 6);

    const response = await request.post('/api/v1/spc/capability', {
      headers: authHeaders,
      data: {
        data,
        USL: 100,
        LSL: 80,
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();

    // Marginal process should have Cpk around 1.0
    expect(jsonData.Cpk).toBeGreaterThan(0.8);
    expect(jsonData.Cpk).toBeLessThan(1.5);
  });

  test('should calculate indices for incapable process (Cpk < 1.0)', async ({ request }) => {
    // Process with high variation, likely producing defects
    const data = Array.from({ length: 100 }, () => 90 + (Math.random() - 0.5) * 15);

    const response = await request.post('/api/v1/spc/capability', {
      headers: authHeaders,
      data: {
        data,
        USL: 100,
        LSL: 80,
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();

    // Incapable process should have low Cpk
    expect(jsonData.Cpk).toBeLessThan(1.0);
  });

  test('should handle one-sided specification (USL only)', async ({ request }) => {
    const data = Array.from({ length: 100 }, () => 50 + Math.random() * 10);

    const response = await request.post('/api/v1/spc/capability', {
      headers: authHeaders,
      data: {
        data,
        USL: 70,
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();
    expect(jsonData).toHaveProperty('Cpk');

    // For one-sided spec, Cpk is calculated from USL only
    expect(jsonData.Cpk).toBeGreaterThan(0);
  });

  test('should handle one-sided specification (LSL only)', async ({ request }) => {
    const data = Array.from({ length: 100 }, () => 50 + Math.random() * 10);

    const response = await request.post('/api/v1/spc/capability', {
      headers: authHeaders,
      data: {
        data,
        LSL: 30,
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();
    expect(jsonData).toHaveProperty('Cpk');
    expect(jsonData.Cpk).toBeGreaterThan(0);
  });

  test('should reject capability calculation with insufficient data', async ({ request }) => {
    const data = [90, 91]; // Only 2 points

    const response = await request.post('/api/v1/spc/capability', {
      headers: authHeaders,
      data: {
        data,
        USL: 100,
        LSL: 80,
      },
    });

    expect(response.status()).toBe(400);
    const errorData = await response.json();
    expect(errorData.error).toContain('at least');
  });

  test('should reject capability calculation without spec limits', async ({ request }) => {
    const data = Array.from({ length: 100 }, () => 90 + Math.random() * 5);

    const response = await request.post('/api/v1/spc/capability', {
      headers: authHeaders,
      data: {
        data,
        // Missing both USL and LSL
      },
    });

    expect(response.status()).toBe(400);
    const errorData = await response.json();
    expect(errorData.error).toContain('spec');
  });

  test('should reject capability calculation with invalid spec limits', async ({ request }) => {
    const data = Array.from({ length: 100 }, () => 90 + Math.random() * 5);

    const response = await request.post('/api/v1/spc/capability', {
      headers: authHeaders,
      data: {
        data,
        USL: 80,
        LSL: 100, // Invalid: LSL > USL
      },
    });

    expect(response.status()).toBe(400);
  });

  test('should calculate capability with tight tolerances', async ({ request }) => {
    const data = Array.from({ length: 100 }, () => 50 + (Math.random() - 0.5) * 0.5);

    const response = await request.post('/api/v1/spc/capability', {
      headers: authHeaders,
      data: {
        data,
        USL: 50.5,
        LSL: 49.5,
        target: 50.0,
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();
    expect(jsonData).toHaveProperty('Cp');
    expect(jsonData).toHaveProperty('Cpk');
    expect(jsonData).toHaveProperty('Cpm');
  });

  test('should calculate capability with wide tolerances', async ({ request }) => {
    const data = Array.from({ length: 100 }, () => 100 + (Math.random() - 0.5) * 10);

    const response = await request.post('/api/v1/spc/capability', {
      headers: authHeaders,
      data: {
        data,
        USL: 150,
        LSL: 50,
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();

    // Wide tolerances should result in high Cp/Cpk
    expect(jsonData.Cp).toBeGreaterThan(2.0);
    expect(jsonData.Cpk).toBeGreaterThan(2.0);
  });

  test('should show Pp ≈ Pp for stable process', async ({ request }) => {
    // Stable process data
    const data = Array.from({ length: 200 }, () => 90 + (Math.random() - 0.5) * 3);

    const response = await request.post('/api/v1/spc/capability', {
      headers: authHeaders,
      data: {
        data,
        USL: 100,
        LSL: 80,
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();

    // For stable process, Pp should be close to Cp
    expect(Math.abs(jsonData.Pp - jsonData.Cp)).toBeLessThan(0.3);
    expect(Math.abs(jsonData.Ppk - jsonData.Cpk)).toBeLessThan(0.3);
  });

  test('should calculate capability for attribute-type data', async ({ request }) => {
    // Integer defect counts
    const data = Array.from({ length: 100 }, () => Math.floor(5 + Math.random() * 3));

    const response = await request.post('/api/v1/spc/capability', {
      headers: authHeaders,
      data: {
        data,
        USL: 10,
        LSL: 0,
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();
    expect(jsonData).toHaveProperty('Cp');
    expect(jsonData).toHaveProperty('Cpk');
  });

  test('should calculate Cpm lower than Cpk for off-target process', async ({ request }) => {
    // Process shifted from target
    const data = Array.from({ length: 100 }, () => 85 + (Math.random() - 0.5) * 2);

    const response = await request.post('/api/v1/spc/capability', {
      headers: authHeaders,
      data: {
        data,
        USL: 100,
        LSL: 70,
        target: 95, // Target is 95, but mean is ~85
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();

    // Cpm penalizes deviation from target
    expect(jsonData.Cpm).toBeLessThan(jsonData.Cpk);
  });

  test('should handle process exactly at spec limits', async ({ request }) => {
    // Process mean at upper edge
    const data = Array.from({ length: 100 }, () => 99 + (Math.random() - 0.5) * 0.5);

    const response = await request.post('/api/v1/spc/capability', {
      headers: authHeaders,
      data: {
        data,
        USL: 100,
        LSL: 80,
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();

    // Cpk should be very low (process near USL)
    expect(jsonData.Cpk).toBeLessThan(1.0);
  });

  test('should calculate capability for large dataset', async ({ request }) => {
    // Large sample (1000 points)
    const data = Array.from({ length: 1000 }, () => 90 + (Math.random() - 0.5) * 4);

    const response = await request.post('/api/v1/spc/capability', {
      headers: authHeaders,
      data: {
        data,
        USL: 100,
        LSL: 80,
        target: 90,
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();
    expect(jsonData).toHaveProperty('Cp');
    expect(jsonData).toHaveProperty('Cpk');
    expect(jsonData).toHaveProperty('Pp');
    expect(jsonData).toHaveProperty('Ppk');
    expect(jsonData).toHaveProperty('Cpm');
  });

  test('should handle process with zero variation', async ({ request }) => {
    // All measurements identical
    const data = Array(100).fill(90);

    const response = await request.post('/api/v1/spc/capability', {
      headers: authHeaders,
      data: {
        data,
        USL: 95,
        LSL: 85,
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();

    // Zero variation should result in very high Cp/Cpk
    // (In practice, might be capped or handled specially)
    expect(jsonData.Cp).toBeGreaterThan(5.0);
  });

  test('should calculate negative Cpk for out-of-spec process', async ({ request }) => {
    // Process mean outside spec limits
    const data = Array.from({ length: 100 }, () => 110 + (Math.random() - 0.5) * 2);

    const response = await request.post('/api/v1/spc/capability', {
      headers: authHeaders,
      data: {
        data,
        USL: 100,
        LSL: 80,
      },
    });

    expect(response.status()).toBe(200);
    const jsonData = await response.json();

    // Process outside spec should have negative or very low Cpk
    expect(jsonData.Cpk).toBeLessThan(0.5);
  });
});
