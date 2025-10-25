import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/testAuthHelper';

test.describe('Parameter Limits API', () => {
  let authHeaders: Record<string, string>;

  test.beforeAll(async ({ request }) => {
    // Login as manufacturing engineer (has permission to manage parameters)
    authHeaders = await loginAsTestUser(request, 'manufacturingEngineer');
  });

  test.describe('Limit CRUD Operations', () => {
    test('should create parameter limits with valid hierarchy', async ({ request }) => {
      const limitsData = {
        engineeringMin: 0,
        lowLowAlarm: 10,
        lowAlarm: 20,
        operatingMin: 30,
        LSL: 40,
        nominalValue: 50,
        USL: 60,
        operatingMax: 70,
        highAlarm: 80,
        highHighAlarm: 90,
        engineeringMax: 100,
      };

      const response = await request.post('/api/v1/parameters/test-param-1/limits', {
        headers: authHeaders,
        data: limitsData,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.parameterId).toBe('test-param-1');
      expect(data.engineeringMin).toBe(0);
      expect(data.engineeringMax).toBe(100);
    });

    test('should reject limits with invalid hierarchy', async ({ request }) => {
      const invalidLimits = {
        engineeringMin: 100,
        lowLowAlarm: null,
        lowAlarm: null,
        operatingMin: null,
        LSL: null,
        nominalValue: null,
        USL: null,
        operatingMax: null,
        highAlarm: null,
        highHighAlarm: null,
        engineeringMax: 50, // Invalid: min > max
      };

      const response = await request.post('/api/v1/parameters/test-param-2/limits', {
        headers: authHeaders,
        data: invalidLimits,
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid limit hierarchy');
    });

    test('should retrieve parameter limits', async ({ request }) => {
      // First create limits
      const limitsData = {
        engineeringMin: 0,
        lowLowAlarm: null,
        lowAlarm: null,
        operatingMin: 25,
        LSL: 40,
        nominalValue: 50,
        USL: 60,
        operatingMax: 75,
        highAlarm: null,
        highHighAlarm: null,
        engineeringMax: 100,
      };

      await request.post('/api/v1/parameters/test-param-3/limits', {
        headers: authHeaders,
        data: limitsData,
      });

      // Then retrieve
      const response = await request.get('/api/v1/parameters/test-param-3/limits', {
      headers: authHeaders,
    });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.parameterId).toBe('test-param-3');
      expect(data.nominalValue).toBe(50);
    });

    test('should update existing limits', async ({ request }) => {
      // Create initial limits
      const initialLimits = {
        engineeringMin: 0,
        lowLowAlarm: null,
        lowAlarm: null,
        operatingMin: 30,
        LSL: 40,
        nominalValue: 50,
        USL: 60,
        operatingMax: 70,
        highAlarm: null,
        highHighAlarm: null,
        engineeringMax: 100,
      };

      await request.post('/api/v1/parameters/test-param-4/limits', {
        headers: authHeaders,
        data: initialLimits,
      });

      // Update limits
      const updatedLimits = {
        ...initialLimits,
        nominalValue: 55,
        operatingMin: 35,
      };

      const response = await request.post('/api/v1/parameters/test-param-4/limits', {
        headers: authHeaders,
        data: updatedLimits,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.nominalValue).toBe(55);
      expect(data.operatingMin).toBe(35);
    });

    test('should delete parameter limits', async ({ request }) => {
      // Create limits
      const limitsData = {
        engineeringMin: 0,
        lowLowAlarm: null,
        lowAlarm: null,
        operatingMin: null,
        LSL: 40,
        nominalValue: 50,
        USL: 60,
        operatingMax: null,
        highAlarm: null,
        highHighAlarm: null,
        engineeringMax: 100,
      };

      await request.post('/api/v1/parameters/test-param-5/limits', {
        headers: authHeaders,
        data: limitsData,
      });

      // Delete
      const deleteResponse = await request.delete('/api/v1/parameters/test-param-5/limits', {
      headers: authHeaders,
    });
      expect(deleteResponse.status()).toBe(204);

      // Verify deletion
      const getResponse = await request.get('/api/v1/parameters/test-param-5/limits', {
      headers: authHeaders,
    });
      expect(getResponse.status()).toBe(404);
    });
  });

  test.describe('Limit Validation', () => {
    test('should validate limit hierarchy without saving', async ({ request }) => {
      const validLimits = {
        engineeringMin: 0,
        lowLowAlarm: 10,
        lowAlarm: 20,
        operatingMin: 30,
        LSL: 40,
        nominalValue: 50,
        USL: 60,
        operatingMax: 70,
        highAlarm: 80,
        highHighAlarm: 90,
        engineeringMax: 100,
      };

      const response = await request.post('/api/v1/parameters/validate', {
        headers: authHeaders,
        data: validLimits,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.valid).toBe(true);
      expect(data.errors).toHaveLength(0);
    });

    test('should detect invalid hierarchy during validation', async ({ request }) => {
      const invalidLimits = {
        engineeringMin: null,
        lowLowAlarm: null,
        lowAlarm: null,
        operatingMin: 70,
        LSL: null,
        nominalValue: null,
        USL: null,
        operatingMax: 30, // Invalid: min > max
        highAlarm: null,
        highHighAlarm: null,
        engineeringMax: null,
      };

      const response = await request.post('/api/v1/parameters/validate', {
        headers: authHeaders,
        data: invalidLimits,
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.valid).toBe(false);
      expect(data.errors.length).toBeGreaterThan(0);
    });
  });

  test.describe('Value Evaluation', () => {
    test('should evaluate value within all limits as OK', async ({ request }) => {
      // Create limits
      const limitsData = {
        engineeringMin: 0,
        lowLowAlarm: 10,
        lowAlarm: 20,
        operatingMin: 30,
        LSL: 40,
        nominalValue: 50,
        USL: 60,
        operatingMax: 70,
        highAlarm: 80,
        highHighAlarm: 90,
        engineeringMax: 100,
      };

      await request.post('/api/v1/parameters/test-param-eval-1/limits', {
        headers: authHeaders,
        data: limitsData,
      });

      // Evaluate value within limits
      const response = await request.post('/api/v1/parameters/test-param-eval-1/limits/evaluate', {
        headers: authHeaders,
        data: { value: 50 },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.severity).toBe('OK');
      expect(data.type).toBe('IN_SPEC');
    });

    test('should detect CRITICAL violation for engineering max', async ({ request }) => {
      const limitsData = {
        engineeringMin: 0,
        lowLowAlarm: null,
        lowAlarm: null,
        operatingMin: null,
        LSL: null,
        nominalValue: 50,
        USL: null,
        operatingMax: null,
        highAlarm: null,
        highHighAlarm: null,
        engineeringMax: 100,
      };

      await request.post('/api/v1/parameters/test-param-eval-2/limits', {
        headers: authHeaders,
        data: limitsData,
      });

      const response = await request.post('/api/v1/parameters/test-param-eval-2/limits/evaluate', {
        headers: authHeaders,
        data: { value: 110 },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.severity).toBe('CRITICAL');
      expect(data.type).toBe('ENGINEERING_HIGH');
      expect(data.limit).toBe(100);
    });

    test('should detect WARNING for USL violation', async ({ request }) => {
      const limitsData = {
        engineeringMin: 0,
        lowLowAlarm: null,
        lowAlarm: null,
        operatingMin: null,
        LSL: 40,
        nominalValue: 50,
        USL: 60,
        operatingMax: null,
        highAlarm: null,
        highHighAlarm: null,
        engineeringMax: 100,
      };

      await request.post('/api/v1/parameters/test-param-eval-3/limits', {
        headers: authHeaders,
        data: limitsData,
      });

      const response = await request.post('/api/v1/parameters/test-param-eval-3/limits/evaluate', {
        headers: authHeaders,
        data: { value: 65 },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.severity).toBe('WARNING');
      expect(data.type).toBe('SPEC_HIGH');
    });

    test('should detect INFO for operating range violation', async ({ request }) => {
      const limitsData = {
        engineeringMin: 0,
        lowLowAlarm: null,
        lowAlarm: null,
        operatingMin: 30,
        LSL: null,
        nominalValue: 50,
        USL: null,
        operatingMax: 70,
        highAlarm: null,
        highHighAlarm: null,
        engineeringMax: 100,
      };

      await request.post('/api/v1/parameters/test-param-eval-4/limits', {
        headers: authHeaders,
        data: limitsData,
      });

      const response = await request.post('/api/v1/parameters/test-param-eval-4/limits/evaluate', {
        headers: authHeaders,
        data: { value: 75 },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.severity).toBe('INFO');
      expect(data.type).toBe('OPERATING_HIGH');
    });

    test('should require numeric value for evaluation', async ({ request }) => {
      const response = await request.post('/api/v1/parameters/test-param-eval-5/limits/evaluate', {
        headers: authHeaders,
        data: { value: 'not-a-number' },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('must be a number');
    });
  });

  test.describe('Bulk Operations', () => {
    test('should retrieve all parameters with limits', async ({ request }) => {
      // Create limits for multiple parameters
      const params = ['bulk-1', 'bulk-2', 'bulk-3'];

      for (const param of params) {
        await request.post(`/api/v1/parameters/${param}/limits`, {
          headers: authHeaders,
          data: {
            engineeringMin: 0,
            lowLowAlarm: null,
            lowAlarm: null,
            operatingMin: null,
            LSL: 40,
            nominalValue: 50,
            USL: 60,
            operatingMax: null,
            highAlarm: null,
            highHighAlarm: null,
            engineeringMax: 100,
          },
        });
      }

      const response = await request.get('/api/v1/parameters/limits', {
      headers: authHeaders,
    });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('Authentication & Authorization', () => {
    test('should require authentication', async ({ request }) => {
      const response = await request.get('/api/v1/parameters/test-param/limits', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(response.status()).toBe(401);
    });
  });
});
