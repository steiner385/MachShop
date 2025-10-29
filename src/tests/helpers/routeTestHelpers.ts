import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';

/**
 * Route Testing Framework for MachShop API
 *
 * This module provides systematic utilities for testing API routes with:
 * - Standardized authentication/authorization patterns
 * - Consistent mocking strategies
 * - Request validation testing
 * - Error response testing
 * - Integration test patterns
 */

export interface TestUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
}

export interface TestSite {
  id: string;
  siteCode: string;
  siteName: string;
  location: string;
  isActive: boolean;
}

export interface RouteTestConfig {
  routePath: string;
  routeHandler: any;
  requiresAuth?: boolean;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  mockServices?: Record<string, any>;
}

export interface TestResponse {
  status: number;
  body: any;
  headers: any;
}

/**
 * Authentication Mock Utilities
 */
export class AuthTestHelper {
  static createMockUser(overrides: Partial<TestUser> = {}): TestUser {
    return {
      id: 'test-user-123',
      username: 'testuser',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      roles: ['Production Operator'],
      permissions: ['production.read', 'site.access'],
      isActive: true,
      ...overrides,
    };
  }

  static createAuthMiddleware(user: TestUser | null = null) {
    return (req: any, res: any, next: any) => {
      if (user) {
        req.user = user;
        next();
      } else {
        res.status(401).json({ success: false, error: 'Unauthorized' });
      }
    };
  }

  static createSupervisorUser(): TestUser {
    return this.createMockUser({
      roles: ['Production Supervisor'],
      permissions: [
        'production.read', 'production.write', 'production.execute',
        'quality.read', 'quality.write', 'dashboard.read', 'dashboard.access',
        'site.access'
      ],
    });
  }

  static createManagerUser(): TestUser {
    return this.createMockUser({
      roles: ['Production Manager'],
      permissions: [
        'production.read', 'production.write', 'production.execute', 'production.admin',
        'quality.read', 'quality.write', 'quality.admin',
        'dashboard.read', 'dashboard.access', 'dashboard.admin',
        'admin.read', 'admin.write', 'site.access'
      ],
    });
  }

  static createReadOnlyUser(): TestUser {
    return this.createMockUser({
      roles: ['Production Operator'],
      permissions: ['production.read', 'quality.read', 'dashboard.read', 'site.access'],
    });
  }
}

/**
 * Request Testing Utilities
 */
export class RequestTestHelper {
  static async makeAuthenticatedRequest(
    app: express.Application,
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
    user: TestUser,
    data?: any,
    query?: any
  ): Promise<TestResponse> {
    const token = `Bearer test-token-${user.id}`;
    let req = request(app)[method](path).set('Authorization', token);

    if (query) {
      req = req.query(query);
    }

    if (data && (method === 'post' || method === 'put' || method === 'patch')) {
      req = req.send(data);
    }

    return req;
  }

  static async testUnauthorizedAccess(
    app: express.Application,
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
    data?: any
  ): Promise<void> {
    let req = request(app)[method](path);

    if (data && (method === 'post' || method === 'put' || method === 'patch')) {
      req = req.send(data);
    }

    const response = await req;
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Unauthorized');
  }

  static async testForbiddenAccess(
    app: express.Application,
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
    user: TestUser,
    data?: any
  ): Promise<void> {
    const response = await this.makeAuthenticatedRequest(app, method, path, user, data);
    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Forbidden');
  }
}

/**
 * Service Mocking Utilities
 */
export class ServiceMockHelper {
  static createMockService(serviceName: string, methods: string[]): any {
    const mockService: any = {};
    methods.forEach(method => {
      mockService[method] = vi.fn();
    });
    return mockService;
  }

  static mockServiceSuccess(mockService: any, method: string, returnValue: any): void {
    mockService[method].mockResolvedValue(returnValue);
  }

  static mockServiceError(mockService: any, method: string, error: Error): void {
    mockService[method].mockRejectedValue(error);
  }

  static mockServiceValidationError(mockService: any, method: string): void {
    const error = new Error('Validation failed');
    (error as any).code = 'VALIDATION_ERROR';
    mockService[method].mockRejectedValue(error);
  }

  static mockServiceNotFoundError(mockService: any, method: string): void {
    const error = new Error('Entity not found');
    (error as any).code = 'NOT_FOUND';
    mockService[method].mockRejectedValue(error);
  }
}

/**
 * Validation Testing Utilities
 */
export class ValidationTestHelper {
  static async testRequiredFields(
    app: express.Application,
    method: 'post' | 'put' | 'patch',
    path: string,
    user: TestUser,
    validData: any,
    requiredFields: string[]
  ): Promise<void> {
    for (const field of requiredFields) {
      const invalidData = { ...validData };
      delete invalidData[field];

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, method, path, user, invalidData
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors || response.body.error).toBeDefined();
    }
  }

  static async testInvalidFieldTypes(
    app: express.Application,
    method: 'post' | 'put' | 'patch',
    path: string,
    user: TestUser,
    validData: any,
    fieldTests: Record<string, any>
  ): Promise<void> {
    for (const [field, invalidValue] of Object.entries(fieldTests)) {
      const invalidData = { ...validData, [field]: invalidValue };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, method, path, user, invalidData
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    }
  }

  static async testFieldLimits(
    app: express.Application,
    method: 'post' | 'put' | 'patch',
    path: string,
    user: TestUser,
    validData: any,
    fieldLimits: Record<string, { min?: number; max?: number }>
  ): Promise<void> {
    for (const [field, limits] of Object.entries(fieldLimits)) {
      if (limits.min !== undefined) {
        const invalidData = { ...validData, [field]: 'x'.repeat(limits.min - 1) };
        const response = await RequestTestHelper.makeAuthenticatedRequest(
          app, method, path, user, invalidData
        );
        expect(response.status).toBe(400);
      }

      if (limits.max !== undefined) {
        const invalidData = { ...validData, [field]: 'x'.repeat(limits.max + 1) };
        const response = await RequestTestHelper.makeAuthenticatedRequest(
          app, method, path, user, invalidData
        );
        expect(response.status).toBe(400);
      }
    }
  }
}

/**
 * Route Test Suite Generator
 */
export class RouteTestSuite {
  private config: RouteTestConfig;
  private app: express.Application;
  private mockServices: Record<string, any> = {};

  constructor(config: RouteTestConfig) {
    this.config = config;
    this.app = express();
    this.setupApp();
  }

  private setupApp(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Setup authentication middleware
    if (this.config.requiresAuth) {
      this.app.use((req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        // Mock authentication
        const token = authHeader.split(' ')[1];
        if (token.startsWith('test-token-')) {
          const userId = token.replace('test-token-', '');
          req.user = AuthTestHelper.createMockUser({ id: userId });
        } else {
          return res.status(401).json({ success: false, error: 'Invalid token' });
        }

        next();
      });
    }

    // Mount the route handler
    this.app.use(this.config.routePath, this.config.routeHandler);
  }

  setupMockServices(services: Record<string, any>): void {
    this.mockServices = services;
    Object.entries(services).forEach(([name, service]) => {
      vi.mock(`../../services/${name}`, () => ({
        [name]: vi.fn().mockImplementation(() => service),
      }));
    });
  }

  generateStandardTests(): void {
    describe(`${this.config.routePath} Route Tests`, () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      afterEach(() => {
        vi.restoreAllMocks();
      });

      if (this.config.requiresAuth) {
        it('should return 401 for unauthenticated requests', async () => {
          const response = await request(this.app).get(this.config.routePath);
          expect(response.status).toBe(401);
          expect(response.body.success).toBe(false);
        });

        it('should return 401 for invalid token', async () => {
          const response = await request(this.app)
            .get(this.config.routePath)
            .set('Authorization', 'Bearer invalid-token');
          expect(response.status).toBe(401);
          expect(response.body.success).toBe(false);
        });
      }

      // Additional permission tests
      if (this.config.requiredPermissions?.length) {
        it('should return 403 for users without required permissions', async () => {
          const user = AuthTestHelper.createReadOnlyUser();
          const response = await RequestTestHelper.makeAuthenticatedRequest(
            this.app, 'get', this.config.routePath, user
          );

          if (this.config.requiredPermissions.some(perm => !user.permissions.includes(perm))) {
            expect(response.status).toBe(403);
          }
        });
      }
    });
  }

  getApp(): express.Application {
    return this.app;
  }
}

/**
 * Database Test Utilities
 */
export class DatabaseTestHelper {
  static createTestSite(overrides: Partial<TestSite> = {}): TestSite {
    return {
      id: 'test-site-123',
      siteCode: 'TEST-SITE',
      siteName: 'Test Manufacturing Site',
      location: 'Test Location',
      isActive: true,
      ...overrides,
    };
  }

  static async cleanupTestData(db: PrismaClient, tables: string[] = []): Promise<void> {
    const defaultTables = [
      'qualityInspection',
      'nCR',
      'workOrder',
      'equipment',
      'part',
      'qualityPlan',
      'user',
      'site',
    ];

    const tablesToClean = tables.length > 0 ? tables : defaultTables;

    for (const table of tablesToClean) {
      try {
        await (db as any)[table].deleteMany({
          where: {
            id: {
              startsWith: 'test-',
            },
          },
        });
      } catch (error) {
        // Table might not exist or constraint issues
        console.warn(`Warning cleaning table ${table}:`, error);
      }
    }
  }
}

/**
 * Response Testing Utilities
 */
export class ResponseTestHelper {
  static expectSuccessResponse(response: any, expectedData?: any): void {
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    if (expectedData) {
      expect(response.body.data).toEqual(expectedData);
    }
  }

  static expectCreatedResponse(response: any, expectedData?: any): void {
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('success', true);
    if (expectedData) {
      expect(response.body.data).toEqual(expectedData);
    }
  }

  static expectErrorResponse(response: any, expectedStatus: number, expectedError?: string): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', false);
    if (expectedError) {
      expect(response.body.error).toContain(expectedError);
    }
  }

  static expectValidationError(response: any): void {
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body.errors || response.body.error).toBeDefined();
  }

  static expectPaginatedResponse(response: any): void {
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');
    expect(response.body.pagination).toHaveProperty('page');
    expect(response.body.pagination).toHaveProperty('limit');
    expect(response.body.pagination).toHaveProperty('total');
    expect(response.body.pagination).toHaveProperty('totalPages');
  }
}