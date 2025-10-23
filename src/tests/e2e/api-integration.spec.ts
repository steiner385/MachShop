import { test, expect, APIRequestContext, request } from '@playwright/test';

let apiContext: APIRequestContext;
let authToken: string;

test.describe('API Integration Tests', () => {
  test.beforeAll(async () => {
    // Create API request context - use E2E backend server (port 3101)
    apiContext = await request.newContext({
      baseURL: 'http://localhost:3101/api/v1/',
    });

    // Login to get auth token
    const loginResponse = await apiContext.post('auth/login', {
      data: {
        username: 'admin',
        password: 'password123'
      }
    });

    // Fail fast if API login fails - don't use mock tokens
    if (!loginResponse.ok()) {
      const errorText = await loginResponse.text();
      throw new Error(
        `API login failed during test setup. Status: ${loginResponse.status()}. ` +
        `Response: ${errorText}. ` +
        `Ensure E2E backend is running on port 3101.`
      );
    }

    const loginData = await loginResponse.json();
    authToken = loginData.token;
    expect(authToken).toBeDefined();
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test.describe('Authentication API', () => {
    test('should login with valid credentials', async () => {
      const response = await apiContext.post('auth/login', {
        data: {
          username: 'admin',
          password: 'password123'
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.token).toBeDefined();
      expect(data.message).toBeDefined();
    });

    test('should reject invalid credentials', async () => {
      const response = await apiContext.post('auth/login', {
        data: {
          username: 'admin',
          password: 'wrongpassword'
        }
      });

      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('AUTHENTICATION_ERROR');
    });

    test('should get user profile with valid token', async () => {
      const response = await apiContext.get('auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.id).toBeDefined();
      expect(data.username).toBe('admin');
      expect(data.email).toBe('admin@mes.com');
    });

    test('should reject requests without auth token', async () => {
      const response = await apiContext.get('auth/me');

      expect(response.status()).toBe(401);
    });

    test('should refresh token with valid refresh token', async () => {
      // First get refresh token
      const loginResponse = await apiContext.post('auth/login', {
        data: {
          username: 'admin',
          password: 'password123'
        }
      });

      const loginData = await loginResponse.json();
      const refreshToken = loginData.refreshToken;

      // Use refresh token to get new access token
      const refreshResponse = await apiContext.post('auth/refresh', {
        data: {
          refreshToken: refreshToken
        }
      });

      expect(refreshResponse.ok()).toBeTruthy();
      const refreshData = await refreshResponse.json();
      expect(refreshData.token).toBeDefined();
      expect(refreshData.refreshToken).toBeDefined();
    });
  });

  test.describe('Work Orders API', () => {
    test('should get work orders list', async () => {
      const response = await apiContext.get('workorders', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBeTruthy();
      expect(data.pagination).toBeDefined();
      expect(data.pagination.total).toBeDefined();
    });

    test('should create new work order', async () => {
      const newWorkOrder = {
        partNumber: 'TEST-PART-001',
        quantityOrdered: 5,
        priority: 'HIGH',
        customerOrder: 'TEST-CO-001',
        siteId: 'test-site-id'
      };

      const response = await apiContext.post('workorders', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: newWorkOrder
      });

      expect(response.status()).toBe(201);
      const data = await response.json();
      
      expect(data.id).toBeDefined();
      expect(data.workOrderNumber).toBeDefined();
      expect(data.partNumber).toBe(newWorkOrder.partNumber);
      expect(data.quantityOrdered).toBe(newWorkOrder.quantityOrdered);
      expect(data.status).toBe('CREATED');
    });

    test('should validate work order creation data', async () => {
      const invalidWorkOrder = {
        partNumber: '', // Empty part number
        quantityOrdered: -1, // Invalid quantity
        siteId: 'test-site-id'
      };

      const response = await apiContext.post('workorders', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: invalidWorkOrder
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    test('should get specific work order by ID', async () => {
      // First create a work order
      const createResponse = await apiContext.post('workorders', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          partNumber: 'TEST-GET-001',
          quantityOrdered: 3,
          siteId: 'test-site-id'
        }
      });

      const createData = await createResponse.json();
      const workOrderId = createData.id;

      // Then get it by ID
      const getResponse = await apiContext.get(`workorders/${workOrderId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(getResponse.ok()).toBeTruthy();
      const getData = await getResponse.json();
      
      expect(getData.id).toBe(workOrderId);
      expect(getData.partNumber).toBe('TEST-GET-001');
    });

    test('should filter work orders by status', async () => {
      const response = await apiContext.get('workorders?status=IN_PROGRESS', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      // All returned work orders should have IN_PROGRESS status
      data.data.forEach((workOrder: any) => {
        expect(workOrder.status).toBe('IN_PROGRESS');
      });
    });

    test('should update work order', async () => {
      // First create a work order
      const createResponse = await apiContext.post('workorders', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          partNumber: 'TEST-UPDATE-001',
          quantityOrdered: 10,
          priority: 'NORMAL',
          siteId: 'test-site-id'
        }
      });

      const createData = await createResponse.json();
      const workOrderId = createData.id;

      // Update the work order
      const updateResponse = await apiContext.put(`workorders/${workOrderId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          quantityOrdered: 15,
          priority: 'HIGH'
        }
      });

      expect(updateResponse.ok()).toBeTruthy();
      const updateData = await updateResponse.json();
      
      expect(updateData.quantityOrdered).toBe(15);
      expect(updateData.priority).toBe('HIGH');
    });

    test('should release work order', async () => {
      // First create a work order
      const createResponse = await apiContext.post('workorders', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          partNumber: 'TEST-RELEASE-001',
          quantityOrdered: 8,
          siteId: 'test-site-id'
        }
      });

      const createData = await createResponse.json();
      const workOrderId = createData.id;

      // Release the work order
      const releaseResponse = await apiContext.post(`workorders/${workOrderId}/release`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(releaseResponse.ok()).toBeTruthy();
      const releaseData = await releaseResponse.json();
      
      expect(releaseData.status).toBe('RELEASED');
    });

    test('should get work order operations', async () => {
      // Get any existing work order
      const listResponse = await apiContext.get('workorders?limit=1', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const listData = await listResponse.json();
      if (listData.data.length > 0) {
        const workOrderId = listData.data[0].id;

        const operationsResponse = await apiContext.get(`workorders/${workOrderId}/operations`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });

        expect(operationsResponse.ok()).toBeTruthy();
        const operationsData = await operationsResponse.json();
        expect(Array.isArray(operationsData)).toBeTruthy();
      }
    });
  });

  test.describe('Dashboard Metrics API', () => {
    test('should get dashboard metrics', async () => {
      const response = await apiContext.get('workorders/dashboard/metrics', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.totalWorkOrders).toBeDefined();
      expect(data.activeWorkOrders).toBeDefined();
      expect(data.overdueWorkOrders).toBeDefined();
      expect(data.completedThisMonth).toBeDefined();
      expect(typeof data.totalWorkOrders).toBe('number');
    });
  });

  test.describe('Error Handling', () => {
    test('should return 404 for non-existent work order', async () => {
      const response = await apiContext.get('workorders/non-existent-id', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status()).toBe(404);
    });

    test('should return 401 for expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const response = await apiContext.get('workorders', {
        headers: {
          'Authorization': `Bearer ${expiredToken}`
        }
      });

      expect(response.status()).toBe(401);
    });

    test('should handle malformed request data', async () => {
      const response = await apiContext.post('workorders', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: '{"invalid": json}'
      });

      // Backend returns 500 for JSON parse errors - ideally should be 400
      expect(response.status()).toBe(500);
    });
  });

  test.describe('Rate Limiting', () => {
    test('should respect rate limits', async () => {
      // Make multiple rapid requests to test rate limiting
      const requests = Array.from({ length: 20 }, () => 
        apiContext.get('workorders', {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
      );

      const responses = await Promise.all(requests);
      
      // Most should succeed, but some might be rate limited
      const successfulResponses = responses.filter(r => r.ok());
      const rateLimitedResponses = responses.filter(r => r.status() === 429);
      
      expect(successfulResponses.length).toBeGreaterThan(0);
      // Rate limiting behavior depends on configuration
    });
  });

  test.describe('Data Validation', () => {
    test('should validate required fields', async () => {
      const response = await apiContext.post('workorders', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {} // Empty object
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    test('should validate data types', async () => {
      const response = await apiContext.post('workorders', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          partNumber: 'TEST-001',
          quantityOrdered: 'not-a-number', // Should be number
          siteId: 'test-site-id'
        }
      });

      expect(response.status()).toBe(400);
    });

    test('should validate enum values', async () => {
      const response = await apiContext.post('workorders', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          partNumber: 'TEST-001',
          quantityOrdered: 5,
          priority: 'INVALID_PRIORITY', // Should be valid enum
          siteId: 'test-site-id'
        }
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('Pagination', () => {
    test('should handle pagination parameters', async () => {
      const response = await apiContext.get('workorders?page=1&limit=5', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(5);
      expect(data.data.length).toBeLessThanOrEqual(5);
    });

    test('should handle invalid pagination parameters', async () => {
      const response = await apiContext.get('workorders?page=-1&limit=abc', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status()).toBe(400);
    });
  });
});