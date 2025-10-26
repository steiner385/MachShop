import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/testAuthHelper';

test.describe('Parameter Formulas API', () => {
  let authHeaders: Record<string, string>;

  test.beforeAll(async ({ request }) => {
    // Login as manufacturing engineer
    authHeaders = await loginAsTestUser(request, 'manufacturingEngineer');
  });

  test.afterEach(async ({ request }) => {
    // Clean up all formulas after each test to avoid unique constraint conflicts
    try {
      const listResponse = await request.get('/api/v1/formulas', {
        headers: authHeaders,
      });
      if (listResponse.ok()) {
        const formulas = await listResponse.json();
        for (const formula of formulas) {
          try {
            await request.delete(`/api/v1/formulas/${formula.id}`, {
              headers: authHeaders,
            });
          } catch {
            // Ignore individual deletion errors (formula may already be deleted)
          }
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test.describe('Formula CRUD Operations', () => {
    test('should create a valid formula', async ({ request }) => {
      const formulaData = {
        formulaName: 'Flow Rate Calculation',
        outputParameterId: 'flow-output',
        formulaExpression: 'velocity * area',
        evaluationTrigger: 'ON_CHANGE',
        testCases: [
          { inputs: { velocity: 10, area: 5 }, expectedOutput: 50 },
          { inputs: { velocity: 20, area: 3 }, expectedOutput: 60 },
        ],
        createdBy: 'test-user',
      };

      const response = await request.post('/api/v1/formulas', {
        headers: authHeaders,
        data: formulaData,
      });

      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data.formulaName).toBe('Flow Rate Calculation');
      expect(data.formulaExpression).toBe('velocity * area');
      expect(data.inputParameterIds).toContain('velocity');
      expect(data.inputParameterIds).toContain('area');
    });

    test('should reject invalid formula syntax', async ({ request }) => {
      const formulaData = {
        formulaName: 'Invalid Formula',
        outputParameterId: 'output',
        formulaExpression: 'a +* b', // Invalid syntax
        createdBy: 'test-user',
      };

      const response = await request.post('/api/v1/formulas', {
        headers: authHeaders,
        data: formulaData,
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid formula');
    });

    test('should reject formula with failing test cases', async ({ request }) => {
      const formulaData = {
        formulaName: 'Formula with Wrong Tests',
        outputParameterId: 'output',
        formulaExpression: 'a + b',
        testCases: [
          { inputs: { a: 2, b: 3 }, expectedOutput: 6 }, // Wrong: should be 5
        ],
        createdBy: 'test-user',
      };

      const response = await request.post('/api/v1/formulas', {
        headers: authHeaders,
        data: formulaData,
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('test case(s) failed');
    });

    test('should retrieve formula by ID', async ({ request }) => {
      const createResponse = await request.post('/api/v1/formulas', {
        headers: authHeaders,
        data: {
          formulaName: 'Test Formula',
          outputParameterId: 'output',
          formulaExpression: 'x * 2',
          createdBy: 'test-user',
        },
      });

      const created = await createResponse.json();

      const getResponse = await request.get(`/api/v1/formulas/${created.id}`, {
        headers: authHeaders,
      });

      expect(getResponse.status()).toBe(200);
      const data = await getResponse.json();
      expect(data.id).toBe(created.id);
      expect(data.formulaName).toBe('Test Formula');
    });

    test('should update formula', async ({ request }) => {
      const createResponse = await request.post('/api/v1/formulas', {
        headers: authHeaders,
        data: {
          formulaName: 'Original Formula',
          outputParameterId: 'output',
          formulaExpression: 'a + b',
          createdBy: 'test-user',
        },
      });

      const created = await createResponse.json();

      const updateResponse = await request.put(`/api/v1/formulas/${created.id}`, {
        headers: authHeaders,
        data: {
          formulaName: 'Updated Formula',
          formulaExpression: 'a + b + c',
        },
      });

      expect(updateResponse.status()).toBe(200);
      const updated = await updateResponse.json();
      expect(updated.formulaName).toBe('Updated Formula');
      expect(updated.formulaExpression).toBe('a + b + c');
    });

    test('should delete formula', async ({ request }) => {
      const createResponse = await request.post('/api/v1/formulas', {
        headers: authHeaders,
        data: {
          formulaName: 'Formula To Delete',
          outputParameterId: 'output',
          formulaExpression: 'x * 2',
          createdBy: 'test-user',
        },
      });

      const created = await createResponse.json();

      const deleteResponse = await request.delete(`/api/v1/formulas/${created.id}`, {
        headers: authHeaders,
      });

      expect(deleteResponse.status()).toBe(204);

      // Verify deletion
      const getResponse = await request.get(`/api/v1/formulas/${created.id}`, {
        headers: authHeaders,
      });
      expect(getResponse.status()).toBe(404);
    });

    test('should list all formulas', async ({ request }) => {
      // Create a formula
      await request.post('/api/v1/formulas', {
        headers: authHeaders,
        data: {
          formulaName: 'Listable Formula',
          outputParameterId: 'output',
          formulaExpression: 'a + b',
          createdBy: 'test-user',
        },
      });

      const response = await request.get('/api/v1/formulas', {
      headers: authHeaders,
    });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    test('should filter formulas by active status', async ({ request }) => {
      const response = await request.get('/api/v1/formulas?isActive=true', {
      headers: authHeaders,
    });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.every((f: any) => f.isActive === true)).toBe(true);
    });
  });

  test.describe('Formula Evaluation', () => {
    test('should evaluate formula with given values', async ({ request }) => {
      const createResponse = await request.post('/api/v1/formulas', {
        headers: authHeaders,
        data: {
          formulaName: 'Evaluation Test',
          outputParameterId: 'output',
          formulaExpression: 'a * b + c',
          createdBy: 'test-user',
        },
      });

      const formula = await createResponse.json();

      const evalResponse = await request.post(`/api/v1/formulas/${formula.id}/evaluate`, {
        headers: authHeaders,
        data: {
          parameterValues: { a: 5, b: 3, c: 2 },
        },
      });

      expect(evalResponse.status()).toBe(200);
      const data = await evalResponse.json();
      expect(data.success).toBe(true);
      expect(data.value).toBe(17); // 5 * 3 + 2
    });

    test('should evaluate expression directly', async ({ request }) => {
      const response = await request.post('/api/v1/formulas/evaluate-expression', {
        headers: authHeaders,
        data: {
          expression: 'sqrt(pow(x, 2) + pow(y, 2))',
          scope: { x: 3, y: 4 },
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Number(data.value)).toBeCloseTo(5, 5);
    });

    test('should require parameterValues for formula evaluation', async ({ request }) => {
      const createResponse = await request.post('/api/v1/formulas', {
        headers: authHeaders,
        data: {
          formulaName: 'Test',
          outputParameterId: 'output',
          formulaExpression: 'a + b',
          createdBy: 'test-user',
        },
      });

      const formula = await createResponse.json();

      const response = await request.post(`/api/v1/formulas/${formula.id}/evaluate`, {
        headers: authHeaders,
        data: {},
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });

    test('should reject invalid expression', async ({ request }) => {
      const response = await request.post('/api/v1/formulas/evaluate-expression', {
        headers: authHeaders,
        data: {
          expression: 'invalid +* syntax',
          scope: {},
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  test.describe('Formula Validation', () => {
    test('should validate valid formula expression', async ({ request }) => {
      const response = await request.post('/api/v1/formulas/validate', {
        headers: authHeaders,
        data: {
          expression: 'max(a, b, c)',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.valid).toBe(true);
    });

    test('should reject invalid formula expression', async ({ request }) => {
      const response = await request.post('/api/v1/formulas/validate', {
        headers: authHeaders,
        data: {
          expression: 'a +* b',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.valid).toBe(false);
      expect(data.error).toBeDefined();
    });

    test('should require expression for validation', async ({ request }) => {
      const response = await request.post('/api/v1/formulas/validate', {
        headers: authHeaders,
        data: {},
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });
  });

  test.describe('Formula Testing', () => {
    test('should run test cases', async ({ request }) => {
      const response = await request.post('/api/v1/formulas/test', {
        headers: authHeaders,
        data: {
          expression: 'a + b',
          testCases: [
            { inputs: { a: 2, b: 3 }, expectedOutput: 5 },
            { inputs: { a: 10, b: 5 }, expectedOutput: 15 },
          ],
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
      expect(data.every((r: any) => r.passed === true)).toBe(true);
    });

    test('should detect failing test cases', async ({ request }) => {
      const response = await request.post('/api/v1/formulas/test', {
        headers: authHeaders,
        data: {
          expression: 'a * b',
          testCases: [
            { inputs: { a: 2, b: 3 }, expectedOutput: 5 }, // Wrong: should be 6
          ],
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data[0].passed).toBe(false);
      expect(data[0].error).toBeDefined();
    });

    test('should require test cases array', async ({ request }) => {
      const response = await request.post('/api/v1/formulas/test', {
        headers: authHeaders,
        data: {
          expression: 'a + b',
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });
  });

  test.describe('Dependency Extraction', () => {
    test('should extract dependencies from formula', async ({ request }) => {
      const response = await request.post('/api/v1/formulas/extract-dependencies', {
        headers: authHeaders,
        data: {
          expression: 'sqrt(x^2 + y^2)',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.dependencies).toContain('x');
      expect(data.dependencies).toContain('y');
    });

    test('should filter out math functions from dependencies', async ({ request }) => {
      const response = await request.post('/api/v1/formulas/extract-dependencies', {
        headers: authHeaders,
        data: {
          expression: 'max(a, b) + min(c, d)',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.dependencies).toContain('a');
      expect(data.dependencies).toContain('b');
      expect(data.dependencies).toContain('c');
      expect(data.dependencies).toContain('d');
      expect(data.dependencies).not.toContain('max');
      expect(data.dependencies).not.toContain('min');
    });

    test('should require expression for dependency extraction', async ({ request }) => {
      const response = await request.post('/api/v1/formulas/extract-dependencies', {
        headers: authHeaders,
        data: {},
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });
  });

  test.describe('Formula Activation', () => {
    test('should activate formula', async ({ request }) => {
      const createResponse = await request.post('/api/v1/formulas', {
        headers: authHeaders,
        data: {
          formulaName: 'Activation Test',
          outputParameterId: 'test-param-output',
          formulaExpression: 'a + b',
          createdBy: 'test-user',
        },
      });

      expect(createResponse.status()).toBe(201);
      const formula = await createResponse.json();
      expect(formula.id).toBeDefined();

      // Deactivate
      const deactivateResponse = await request.patch(`/api/v1/formulas/${formula.id}/active`, {
        headers: authHeaders,
        data: { isActive: false },
      });
      expect(deactivateResponse.status()).toBe(200);
      const deactivated = await deactivateResponse.json();
      expect(deactivated.isActive).toBe(false);

      // Reactivate
      const response = await request.patch(`/api/v1/formulas/${formula.id}/active`, {
        headers: authHeaders,
        data: { isActive: true },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.isActive).toBe(true);
    });

    test('should deactivate formula', async ({ request }) => {
      const createResponse = await request.post('/api/v1/formulas', {
        headers: authHeaders,
        data: {
          formulaName: 'Deactivation Test',
          outputParameterId: 'output',
          formulaExpression: 'a + b',
          createdBy: 'test-user',
        },
      });

      const formula = await createResponse.json();

      const response = await request.patch(`/api/v1/formulas/${formula.id}/active`, {
        headers: authHeaders,
        data: { isActive: false },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.isActive).toBe(false);
    });

    test('should require isActive boolean', async ({ request }) => {
      const createResponse = await request.post('/api/v1/formulas', {
        headers: authHeaders,
        data: {
          formulaName: 'Test',
          outputParameterId: 'output',
          formulaExpression: 'a + b',
          createdBy: 'test-user',
        },
      });

      const formula = await createResponse.json();

      const response = await request.patch(`/api/v1/formulas/${formula.id}/active`, {
        headers: authHeaders,
        data: {},
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });

    test('should reject inactive formula evaluation', async ({ request }) => {
      const createResponse = await request.post('/api/v1/formulas', {
        headers: authHeaders,
        data: {
          formulaName: 'Inactive Formula',
          outputParameterId: 'output',
          formulaExpression: 'a + b',
          createdBy: 'test-user',
        },
      });

      const formula = await createResponse.json();

      // Deactivate
      await request.patch(`/api/v1/formulas/${formula.id}/active`, {
        headers: authHeaders,
        data: { isActive: false },
      });

      // Try to evaluate
      const evalResponse = await request.post(`/api/v1/formulas/${formula.id}/evaluate`, {
        headers: authHeaders,
        data: {
          parameterValues: { a: 1, b: 2 },
        },
      });

      expect(evalResponse.status()).toBe(200);
      const data = await evalResponse.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('inactive');
    });
  });

  test.describe('Parameter Relationships', () => {
    test('should get formulas for parameter', async ({ request }) => {
      const createResponse = await request.post('/api/v1/formulas', {
        headers: authHeaders,
        data: {
          formulaName: 'Parameter Formula',
          outputParameterId: 'test-param-output',
          formulaExpression: 'input1 + input2',
          createdBy: 'test-user',
        },
      });

      await createResponse.json();

      const response = await request.get('/api/v1/formulas/parameter/test-param-output', {
      headers: authHeaders,
    });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.asOutput).toBeDefined();
      expect(data.asInput).toBeDefined();
    });

    test('should get triggered formulas', async ({ request }) => {
      const response = await request.get('/api/v1/formulas/triggered/test-input-param', {
      headers: authHeaders,
    });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  test.describe('Authentication & Authorization', () => {
    test('should require authentication', async ({ request }) => {
      const response = await request.get('/api/v1/formulas', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(response.status()).toBe(401);
    });
  });
});
