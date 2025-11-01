/**
 * Route Handler Middleware
 *
 * Middleware stack for RBAC, validation, rate limiting, and audit logging.
 */

import { z } from 'zod';
import type {
  ExtensionRoute,
  PermissionRequirement,
  RateLimitConfig,
  AuditLogEntry,
  HttpMethod,
  WrappedRouteHandler,
} from './types';

/**
 * Request context with extracted data
 */
export interface RequestContext {
  userId?: string;
  permissions: string[];
  ipAddress?: string;
  method: HttpMethod;
  path: string;
  startTime: Date;
  body?: unknown;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

/**
 * Response context
 */
export interface ResponseContext {
  status: number;
  body?: unknown;
}

/**
 * Creates middleware for RBAC permission checking
 */
export function createRbacMiddleware(permissions: PermissionRequirement[]) {
  return async (req: unknown, res: unknown, next: () => void) => {
    const context = (req as Record<string, unknown>).__context as RequestContext;

    // Check if all required permissions are present
    const userPermissions = new Set(context.permissions);
    const required = permissions.filter((p) => p.required);

    for (const perm of required) {
      if (!userPermissions.has(perm.permission)) {
        const response = res as Record<string, unknown>;
        response.status = 403;
        response.body = {
          error: 'Forbidden',
          message: `Missing required permission: ${perm.permission}`,
        };
        return;
      }
    }

    next();
  };
}

/**
 * Creates middleware for Zod schema validation
 */
export function createValidationMiddleware(route: ExtensionRoute) {
  return async (req: unknown, res: unknown, next: () => void) => {
    const context = (req as Record<string, unknown>).__context as RequestContext;
    const response = res as Record<string, unknown>;

    try {
      // Validate request body if schema provided
      if (route.requestBody) {
        const result = route.requestBody.safeParse(context.body);
        if (!result.success) {
          response.status = 400;
          response.body = {
            error: 'Bad Request',
            message: 'Invalid request body',
            details: result.error.errors,
          };
          return;
        }
        context.body = result.data;
      }

      // Validate path parameters
      if (route.parameters) {
        for (const param of route.parameters) {
          if (param.in === 'path' && param.schema) {
            const value = (context.params || {})[param.name];
            const result = param.schema.safeParse(value);

            if (!result.success) {
              response.status = 400;
              response.body = {
                error: 'Bad Request',
                message: `Invalid path parameter: ${param.name}`,
              };
              return;
            }
          }

          if (param.in === 'query' && param.schema) {
            const value = (context.query || {})[param.name];
            if (param.required && value === undefined) {
              response.status = 400;
              response.body = {
                error: 'Bad Request',
                message: `Missing required query parameter: ${param.name}`,
              };
              return;
            }

            if (value !== undefined) {
              const result = param.schema.safeParse(value);
              if (!result.success) {
                response.status = 400;
                response.body = {
                  error: 'Bad Request',
                  message: `Invalid query parameter: ${param.name}`,
                };
                return;
              }
            }
          }
        }
      }

      next();
    } catch (error) {
      response.status = 500;
      response.body = {
        error: 'Internal Server Error',
        message: 'Validation middleware error',
      };
    }
  };
}

/**
 * Creates middleware for rate limiting
 */
export function createRateLimitMiddleware(config: RateLimitConfig, registry: unknown) {
  return async (req: unknown, res: unknown, next: () => void) => {
    const context = (req as Record<string, unknown>).__context as RequestContext;
    const response = res as Record<string, unknown>;

    // Extract rate limit key
    let key: string;
    if (config.keyExtractor) {
      key = config.keyExtractor(req as Record<string, unknown>);
    } else if (config.perUser && context.userId) {
      key = `${context.userId}:${context.path}:${context.method}`;
    } else {
      key = `${context.ipAddress || 'anonymous'}:${context.path}:${context.method}`;
    }

    // Check rate limit (simplified - in production would use registry)
    const requestsInWindow = 1; // Simplified tracking

    if (requestsInWindow > config.maxRequests) {
      response.status = 429;
      response.body = {
        error: 'Too Many Requests',
        message: `Rate limit exceeded: ${config.maxRequests} requests per ${config.windowSeconds} seconds`,
        retryAfter: config.windowSeconds,
      };
      return;
    }

    next();
  };
}

/**
 * Creates middleware for audit logging
 */
export function createAuditLoggingMiddleware(
  extensionId: string,
  registry: unknown
) {
  return async (req: unknown, res: unknown, next: () => void) => {
    const context = (req as Record<string, unknown>).__context as RequestContext;
    const response = res as Record<string, unknown>;
    const startTime = context.startTime;

    // Execute handler
    await next();

    // Create audit log entry
    const endTime = new Date();
    const responseTime = endTime.getTime() - startTime.getTime();

    const logEntry: AuditLogEntry = {
      timestamp: startTime,
      extensionId,
      path: context.path,
      method: context.method,
      userId: context.userId,
      status: (response.status as number) || 200,
      responseTime,
      ipAddress: context.ipAddress,
      error: (response.body as Record<string, unknown>)?.error as string | undefined,
      permissionsChecked: context.permissions,
    };

    // Log entry would be sent to registry in production
    console.debug('Audit log:', logEntry);
  };
}

/**
 * Wrap a route handler with middleware stack
 */
export function wrapRouteHandler(
  route: ExtensionRoute,
  extensionId: string,
  registry: unknown
): WrappedRouteHandler {
  const middleware: Array<(req: unknown, res: unknown, next: () => void) => void> = [];

  // Add validation middleware
  middleware.push(createValidationMiddleware(route));

  // Add RBAC middleware if permissions required
  if (route.permissions && route.permissions.length > 0) {
    middleware.push(createRbacMiddleware(route.permissions));
  }

  // Add rate limiting middleware
  if (route.rateLimit) {
    middleware.push(createRateLimitMiddleware(route.rateLimit, registry));
  }

  // Add audit logging middleware
  middleware.push(createAuditLoggingMiddleware(extensionId, registry));

  /**
   * Execute middleware chain
   */
  const executeMiddleware = async (req: unknown, res: unknown, index: number = 0): Promise<void> => {
    if (index >= middleware.length) {
      // All middleware executed, call original handler
      await route.handler(req, res);
      return;
    }

    const next = () => executeMiddleware(req, res, index + 1);
    await middleware[index](req, res, next);
  };

  return {
    original: route.handler,
    middleware,
    withRbac: async (req: unknown, res: unknown) => {
      const context = (req as Record<string, unknown>).__context as RequestContext;
      if (route.permissions) {
        const userPermissions = new Set(context.permissions);
        const required = route.permissions.filter((p) => p.required);

        for (const perm of required) {
          if (!userPermissions.has(perm.permission)) {
            const response = res as Record<string, unknown>;
            response.status = 403;
            response.body = { error: 'Forbidden', message: `Missing permission: ${perm.permission}` };
            return;
          }
        }
      }
      await route.handler(req, res);
    },
    withRateLimit: async (req: unknown, res: unknown) => {
      if (route.rateLimit) {
        // Rate limit check would be performed here
      }
      await route.handler(req, res);
    },
    withValidation: async (req: unknown, res: unknown) => {
      if (route.requestBody) {
        const context = (req as Record<string, unknown>).__context as RequestContext;
        const result = route.requestBody.safeParse(context.body);
        if (!result.success) {
          const response = res as Record<string, unknown>;
          response.status = 400;
          response.body = { error: 'Bad Request', details: result.error.errors };
          return;
        }
      }
      await route.handler(req, res);
    },
    withAuditLog: async (req: unknown, res: unknown) => {
      const context = (req as Record<string, unknown>).__context as RequestContext;
      const startTime = context.startTime;
      await route.handler(req, res);

      const endTime = new Date();
      console.debug('Audit:', {
        path: context.path,
        method: context.method,
        duration: endTime.getTime() - startTime.getTime(),
      });
    },
  };
}
