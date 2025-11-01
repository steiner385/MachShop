/**
 * Route Handler Middleware Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import {
  wrapRouteHandler,
  createRbacMiddleware,
  createValidationMiddleware,
  type RequestContext,
} from '../../../packages/extension-sdk/src/routing/middleware';
import type { ExtensionRoute, PermissionRequirement } from '../../../packages/extension-sdk/src/routing/types';

describe('Route Middleware', () => {
  describe('createRbacMiddleware', () => {
    it('should allow access with required permission', async () => {
      const permissions: PermissionRequirement[] = [
        { permission: 'extension:read', required: true },
      ];

      const middleware = createRbacMiddleware(permissions);

      const req = {
        __context: {
          permissions: ['extension:read', 'extension:write'],
          userId: 'user1',
        } as RequestContext,
      };

      const res = {} as Record<string, unknown>;
      const next = vi.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access without required permission', async () => {
      const permissions: PermissionRequirement[] = [
        { permission: 'admin:write', required: true },
      ];

      const middleware = createRbacMiddleware(permissions);

      const req = {
        __context: {
          permissions: ['extension:read'],
          userId: 'user1',
        } as RequestContext,
      };

      const res = {} as Record<string, unknown>;
      const next = vi.fn();

      await middleware(req, res, next);

      expect(res.status).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow multiple required permissions', async () => {
      const permissions: PermissionRequirement[] = [
        { permission: 'extension:read', required: true },
        { permission: 'extension:write', required: true },
      ];

      const middleware = createRbacMiddleware(permissions);

      const req = {
        __context: {
          permissions: ['extension:read', 'extension:write', 'admin:read'],
          userId: 'user1',
        } as RequestContext,
      };

      const res = {} as Record<string, unknown>;
      const next = vi.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('createValidationMiddleware', () => {
    it('should validate request body with schema', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const route: ExtensionRoute = {
        path: '/user',
        method: 'POST',
        handler: async () => {},
        requestBody: schema,
      };

      const middleware = createValidationMiddleware(route);

      const req = {
        __context: {
          body: { name: 'John', age: 30 },
          permissions: [],
          method: 'POST',
          path: '/user',
          startTime: new Date(),
        } as RequestContext,
      };

      const res = {} as Record<string, unknown>;
      const next = vi.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid request body', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const route: ExtensionRoute = {
        path: '/user',
        method: 'POST',
        handler: async () => {},
        requestBody: schema,
      };

      const middleware = createValidationMiddleware(route);

      const req = {
        __context: {
          body: { name: 'John', age: 'not a number' },
          permissions: [],
          method: 'POST',
          path: '/user',
          startTime: new Date(),
        } as RequestContext,
      };

      const res = {} as Record<string, unknown>;
      const next = vi.fn();

      await middleware(req, res, next);

      expect(res.status).toBe(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate required query parameters', async () => {
      const route: ExtensionRoute = {
        path: '/search',
        method: 'GET',
        handler: async () => {},
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            schema: z.string().min(3),
          },
        ],
      };

      const middleware = createValidationMiddleware(route);

      const req = {
        __context: {
          query: { q: 'te' },
          permissions: [],
          method: 'GET',
          path: '/search',
          startTime: new Date(),
        } as RequestContext,
      };

      const res = {} as Record<string, unknown>;
      const next = vi.fn();

      await middleware(req, res, next);

      expect(res.status).toBe(400);
    });

    it('should validate path parameters', async () => {
      const route: ExtensionRoute = {
        path: '/user/:id',
        method: 'GET',
        handler: async () => {},
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: z.string().uuid(),
          },
        ],
      };

      const middleware = createValidationMiddleware(route);

      const req = {
        __context: {
          params: { id: 'invalid-uuid' },
          permissions: [],
          method: 'GET',
          path: '/user/:id',
          startTime: new Date(),
        } as RequestContext,
      };

      const res = {} as Record<string, unknown>;
      const next = vi.fn();

      await middleware(req, res, next);

      expect(res.status).toBe(400);
    });
  });

  describe('wrapRouteHandler', () => {
    it('should wrap handler with middleware', () => {
      const handler = vi.fn(async () => {});
      const route: ExtensionRoute = {
        path: '/data',
        method: 'GET',
        handler,
      };

      const wrapped = wrapRouteHandler(route, 'test-ext', {});

      expect(wrapped.original).toBe(handler);
      expect(wrapped.middleware).toBeDefined();
      expect(Array.isArray(wrapped.middleware)).toBe(true);
    });

    it('should include RBAC middleware for protected routes', () => {
      const route: ExtensionRoute = {
        path: '/admin',
        method: 'GET',
        handler: async () => {},
        permissions: [
          { permission: 'admin:read', required: true },
        ],
      };

      const wrapped = wrapRouteHandler(route, 'test-ext', {});

      // Should have middleware for validation, rbac, and audit
      expect(wrapped.middleware.length).toBeGreaterThan(0);
    });

    it('should include rate limit middleware when configured', () => {
      const route: ExtensionRoute = {
        path: '/api',
        method: 'GET',
        handler: async () => {},
        rateLimit: {
          maxRequests: 100,
          windowSeconds: 60,
        },
      };

      const wrapped = wrapRouteHandler(route, 'test-ext', {});

      expect(wrapped.middleware.length).toBeGreaterThan(0);
    });

    it('should provide withRbac method', async () => {
      const handler = vi.fn();
      const route: ExtensionRoute = {
        path: '/data',
        method: 'GET',
        handler: async () => handler(),
        permissions: [
          { permission: 'data:read', required: true },
        ],
      };

      const wrapped = wrapRouteHandler(route, 'test-ext', {});

      const req = {
        __context: {
          permissions: ['data:read'],
          userId: 'user1',
          method: 'GET',
          path: '/data',
          startTime: new Date(),
        } as RequestContext,
      };

      const res = {} as Record<string, unknown>;

      await wrapped.withRbac(req, res);
      expect(handler).toHaveBeenCalled();
    });

    it('should provide withValidation method', async () => {
      const handler = vi.fn();
      const schema = z.object({ id: z.string() });

      const route: ExtensionRoute = {
        path: '/item',
        method: 'POST',
        handler: async () => handler(),
        requestBody: schema,
      };

      const wrapped = wrapRouteHandler(route, 'test-ext', {});

      const req = {
        __context: {
          body: { id: '123' },
          permissions: [],
          method: 'POST',
          path: '/item',
          startTime: new Date(),
        } as RequestContext,
      };

      const res = {} as Record<string, unknown>;

      await wrapped.withValidation(req, res);
      expect(handler).toHaveBeenCalled();
    });

    it('should provide withAuditLog method', async () => {
      const handler = vi.fn();
      const route: ExtensionRoute = {
        path: '/data',
        method: 'GET',
        handler: async () => handler(),
      };

      const wrapped = wrapRouteHandler(route, 'test-ext', {});

      const req = {
        __context: {
          permissions: [],
          method: 'GET',
          path: '/data',
          startTime: new Date(),
        } as RequestContext,
      };

      const res = {} as Record<string, unknown>;

      await wrapped.withAuditLog(req, res);
      expect(handler).toHaveBeenCalled();
    });
  });
});
