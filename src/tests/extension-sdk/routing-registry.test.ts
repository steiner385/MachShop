/**
 * Extension Route Registry Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createExtensionRouteRegistry } from '../../../packages/extension-sdk/src/routing/registry';
import type { ExtensionRoute, RouteRegistrationRequest } from '../../../packages/extension-sdk/src/routing/types';

describe('ExtensionRouteRegistry', () => {
  let registry: ReturnType<typeof createExtensionRouteRegistry>;

  beforeEach(() => {
    registry = createExtensionRouteRegistry();
  });

  describe('register', () => {
    it('should register extension routes successfully', async () => {
      const request: RouteRegistrationRequest = {
        extensionId: 'test-ext',
        version: '1.0.0',
        basePath: '/api/extensions/test-ext',
        routes: [
          {
            path: '/data',
            method: 'GET',
            description: 'Get data',
            handler: async () => {},
          },
        ],
      };

      const response = await registry.register(request);

      expect(response.success).toBe(true);
      expect(response.registeredPaths).toContain('/api/extensions/test-ext/data');
    });

    it('should handle multiple routes', async () => {
      const routes: ExtensionRoute[] = [
        {
          path: '/data',
          method: 'GET',
          handler: async () => {},
        },
        {
          path: '/data',
          method: 'POST',
          handler: async () => {},
        },
        {
          path: '/data/:id',
          method: 'PUT',
          handler: async () => {},
        },
      ];

      const response = await registry.register({
        extensionId: 'test-ext',
        version: '1.0.0',
        basePath: '/api/test',
        routes,
      });

      expect(response.success).toBe(true);
      expect(response.registeredPaths).toHaveLength(3);
    });

    it('should warn on route conflicts', async () => {
      const route: ExtensionRoute = {
        path: '/data',
        method: 'GET',
        handler: async () => {},
      };

      // Register first time
      await registry.register({
        extensionId: 'ext1',
        version: '1.0.0',
        basePath: '/api/ext1',
        routes: [route],
      });

      // Register same route from different extension
      const response = await registry.register({
        extensionId: 'ext2',
        version: '1.0.0',
        basePath: '/api/ext1',
        routes: [route],
      });

      expect(response.warnings).toBeDefined();
      expect(response.warnings?.[0]).toContain('already exists');
    });
  });

  describe('getRoute', () => {
    it('should retrieve registered route', async () => {
      const route: ExtensionRoute = {
        path: '/data',
        method: 'GET',
        description: 'Get data',
        handler: async () => {},
      };

      await registry.register({
        extensionId: 'test-ext',
        version: '1.0.0',
        basePath: '/api/test',
        routes: [route],
      });

      const retrieved = registry.getRoute('/api/test/data', 'GET');
      expect(retrieved).toBeDefined();
      expect(retrieved?.description).toBe('Get data');
    });

    it('should return undefined for non-existent route', () => {
      const route = registry.getRoute('/api/nonexistent', 'GET');
      expect(route).toBeUndefined();
    });
  });

  describe('getExtensionRoutes', () => {
    it('should return all routes for extension', async () => {
      const routes: ExtensionRoute[] = [
        { path: '/data', method: 'GET', handler: async () => {} },
        { path: '/data', method: 'POST', handler: async () => {} },
        { path: '/config', method: 'GET', handler: async () => {} },
      ];

      await registry.register({
        extensionId: 'test-ext',
        version: '1.0.0',
        basePath: '/api/test',
        routes,
      });

      const extRoutes = registry.getExtensionRoutes('test-ext');
      expect(extRoutes).toHaveLength(3);
    });

    it('should return empty array for unknown extension', () => {
      const routes = registry.getExtensionRoutes('unknown-ext');
      expect(routes).toEqual([]);
    });
  });

  describe('unregister', () => {
    it('should remove all extension routes', async () => {
      const routes: ExtensionRoute[] = [
        { path: '/data', method: 'GET', handler: async () => {} },
        { path: '/config', method: 'GET', handler: async () => {} },
      ];

      await registry.register({
        extensionId: 'test-ext',
        version: '1.0.0',
        basePath: '/api/test',
        routes,
      });

      expect(registry.getExtensionRoutes('test-ext')).toHaveLength(2);

      await registry.unregister('test-ext');

      expect(registry.getExtensionRoutes('test-ext')).toHaveLength(0);
    });
  });

  describe('audit logging', () => {
    it('should record audit log entries', async () => {
      const entry = {
        timestamp: new Date(),
        extensionId: 'test-ext',
        path: '/api/test/data',
        method: 'GET' as const,
        status: 200,
        responseTime: 45,
      };

      await registry.addAuditLog(entry);

      const logs = await registry.getAuditLogs({
        extensionId: 'test-ext',
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].status).toBe(200);
    });

    it('should filter audit logs by extension', async () => {
      await registry.addAuditLog({
        timestamp: new Date(),
        extensionId: 'ext1',
        path: '/api/ext1/data',
        method: 'GET',
        status: 200,
        responseTime: 10,
      });

      await registry.addAuditLog({
        timestamp: new Date(),
        extensionId: 'ext2',
        path: '/api/ext2/data',
        method: 'GET',
        status: 200,
        responseTime: 10,
      });

      const logs = await registry.getAuditLogs({
        extensionId: 'ext1',
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].extensionId).toBe('ext1');
    });

    it('should filter audit logs by date range', async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      await registry.addAuditLog({
        timestamp: now,
        extensionId: 'test-ext',
        path: '/api/test/data',
        method: 'GET',
        status: 200,
        responseTime: 10,
      });

      const logs = await registry.getAuditLogs({
        startDate: yesterday,
        endDate: tomorrow,
      });

      expect(logs).toHaveLength(1);
    });
  });

  describe('rate limiting', () => {
    it('should track rate limit state', () => {
      const config = {
        maxRequests: 10,
        windowSeconds: 60,
      };

      const isLimited = registry.isRateLimited('test-key', config);
      expect(isLimited).toBe(false);

      const state = registry.getRateLimitState('test-key');
      expect(state).toBeDefined();
      expect(state?.count).toBe(1);
    });

    it('should detect rate limit exceeded', () => {
      const config = {
        maxRequests: 2,
        windowSeconds: 60,
      };

      const key = 'test-key';

      // First request
      let isLimited = registry.isRateLimited(key, config);
      expect(isLimited).toBe(false);

      // Second request
      isLimited = registry.isRateLimited(key, config);
      expect(isLimited).toBe(false);

      // Third request (exceeds limit)
      isLimited = registry.isRateLimited(key, config);
      expect(isLimited).toBe(true);
    });
  });

  describe('route metadata', () => {
    it('should track route metadata', async () => {
      const route: ExtensionRoute = {
        path: '/data',
        method: 'GET',
        handler: async () => {},
        tags: ['data', 'public'],
      };

      await registry.register({
        extensionId: 'test-ext',
        version: '1.0.0',
        basePath: '/api/test',
        routes: [route],
      });

      const metadata = registry.getRouteMetadata('/api/test/data', 'GET');
      expect(metadata).toBeDefined();
      expect(metadata?.extensionId).toBe('test-ext');
      expect(metadata?.active).toBe(true);
      expect(metadata?.accessCount).toBe(0);
    });

    it('should increment access count on audit log', async () => {
      const route: ExtensionRoute = {
        path: '/data',
        method: 'GET',
        handler: async () => {},
      };

      await registry.register({
        extensionId: 'test-ext',
        version: '1.0.0',
        basePath: '/api/test',
        routes: [route],
      });

      // Add audit logs
      await registry.addAuditLog({
        timestamp: new Date(),
        extensionId: 'test-ext',
        path: '/api/test/data',
        method: 'GET',
        status: 200,
        responseTime: 10,
      });

      await registry.addAuditLog({
        timestamp: new Date(),
        extensionId: 'test-ext',
        path: '/api/test/data',
        method: 'GET',
        status: 200,
        responseTime: 12,
      });

      const metadata = registry.getRouteMetadata('/api/test/data', 'GET');
      expect(metadata?.accessCount).toBe(2);
    });
  });

  describe('getAllRoutes', () => {
    it('should return all registered routes', async () => {
      await registry.register({
        extensionId: 'ext1',
        version: '1.0.0',
        basePath: '/api/ext1',
        routes: [
          { path: '/data', method: 'GET', handler: async () => {} },
          { path: '/config', method: 'POST', handler: async () => {} },
        ],
      });

      await registry.register({
        extensionId: 'ext2',
        version: '1.0.0',
        basePath: '/api/ext2',
        routes: [
          { path: '/info', method: 'GET', handler: async () => {} },
        ],
      });

      const allRoutes = registry.getAllRoutes();
      expect(allRoutes).toHaveLength(3);
    });
  });

  describe('generateOpenApi', () => {
    it('should generate valid OpenAPI spec', async () => {
      const route: ExtensionRoute = {
        path: '/data',
        method: 'GET',
        description: 'Get data',
        handler: async () => {},
        tags: ['data'],
        responses: [
          {
            status: 200,
            description: 'Success',
          },
          {
            status: 404,
            description: 'Not found',
          },
        ],
      };

      await registry.register({
        extensionId: 'test-ext',
        version: '1.0.0',
        basePath: '/api/test',
        routes: [route],
      });

      const openapi = registry.generateOpenApi();

      expect(openapi.openapi).toBe('3.0.0');
      expect(openapi.info.title).toBe('Extension Routes');
      expect(openapi.paths['/api/test/data']).toBeDefined();
      expect(openapi.paths['/api/test/data'].get).toBeDefined();
    });

    it('should include security for protected routes', async () => {
      const route: ExtensionRoute = {
        path: '/admin',
        method: 'GET',
        handler: async () => {},
        permissions: [
          { permission: 'admin:read', required: true },
        ],
      };

      await registry.register({
        extensionId: 'test-ext',
        version: '1.0.0',
        basePath: '/api/test',
        routes: [route],
      });

      const openapi = registry.generateOpenApi();
      const pathItem = openapi.paths['/api/test/admin'].get as Record<string, unknown>;

      expect(pathItem.security).toBeDefined();
    });
  });
});
