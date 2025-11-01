/**
 * Extension Route Registry
 *
 * Manages dynamic route registration, validation, RBAC integration,
 * rate limiting, and audit logging for extension endpoints.
 */

import type {
  ExtensionRoute,
  RouteRegistrationRequest,
  RouteRegistrationResponse,
  ExtensionOpenApiSpec,
  AuditLogEntry,
  RateLimitState,
  RouteMetadata,
  HttpMethod,
  RateLimitConfig,
  ExtensionRouteRegistry,
} from './types';

/**
 * Extension Route Registry Implementation
 *
 * Provides comprehensive route management for extensions including:
 * - Dynamic route registration and unregistration
 * - OpenAPI specification generation
 * - Zod schema validation
 * - RBAC integration for permission checks
 * - Rate limiting and audit logging
 */
export class ExtensionRouteRegistryImpl implements ExtensionRouteRegistry {
  private routes: Map<string, ExtensionRoute> = new Map();
  private routeMetadata: Map<string, RouteMetadata> = new Map();
  private rateLimitStates: Map<string, RateLimitState> = new Map();
  private auditLogs: AuditLogEntry[] = [];
  private extensionRoutes: Map<string, Set<string>> = new Map();

  /**
   * Generate route key (path + method)
   */
  private getRouteKey(path: string, method: HttpMethod): string {
    return `${method.toUpperCase()} ${path}`;
  }

  /**
   * Register extension routes
   */
  async register(request: RouteRegistrationRequest): Promise<RouteRegistrationResponse> {
    const registeredPaths: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Track extension routes
      if (!this.extensionRoutes.has(request.extensionId)) {
        this.extensionRoutes.set(request.extensionId, new Set());
      }

      const extRoutes = this.extensionRoutes.get(request.extensionId)!;

      for (const route of request.routes) {
        const fullPath = `${request.basePath}${route.path}`;
        const routeKey = this.getRouteKey(fullPath, route.method);

        // Check for conflicts
        if (this.routes.has(routeKey)) {
          warnings.push(`Route ${route.method} ${fullPath} already exists, overwriting`);
        }

        // Store route with full path
        const fullRoute: ExtensionRoute = {
          ...route,
          path: fullPath,
        };

        this.routes.set(routeKey, fullRoute);
        extRoutes.add(routeKey);

        // Create metadata
        const now = new Date();
        this.routeMetadata.set(routeKey, {
          extensionId: request.extensionId,
          path: fullPath,
          method: route.method,
          registeredAt: now,
          modifiedAt: now,
          accessCount: 0,
          active: true,
          custom: route.tags ? { tags: route.tags } : undefined,
        });

        registeredPaths.push(fullPath);
      }

      return {
        success: true,
        registeredPaths,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return {
        success: false,
        registeredPaths: [],
        error: `Failed to register routes: ${String(error)}`,
      };
    }
  }

  /**
   * Unregister extension routes
   */
  async unregister(extensionId: string): Promise<void> {
    const extRoutes = this.extensionRoutes.get(extensionId);
    if (!extRoutes) return;

    for (const routeKey of extRoutes) {
      this.routes.delete(routeKey);
      this.routeMetadata.delete(routeKey);
    }

    this.extensionRoutes.delete(extensionId);
  }

  /**
   * Get route by path and method
   */
  getRoute(path: string, method: HttpMethod): ExtensionRoute | undefined {
    const routeKey = this.getRouteKey(path, method);
    return this.routes.get(routeKey);
  }

  /**
   * Get all routes for an extension
   */
  getExtensionRoutes(extensionId: string): ExtensionRoute[] {
    const extRoutes = this.extensionRoutes.get(extensionId);
    if (!extRoutes) return [];

    const routes: ExtensionRoute[] = [];
    for (const routeKey of extRoutes) {
      const route = this.routes.get(routeKey);
      if (route) routes.push(route);
    }

    return routes;
  }

  /**
   * Get all registered routes
   */
  getAllRoutes(): ExtensionRoute[] {
    return Array.from(this.routes.values());
  }

  /**
   * Get route metadata
   */
  getRouteMetadata(path: string, method: HttpMethod): RouteMetadata | undefined {
    const routeKey = this.getRouteKey(path, method);
    return this.routeMetadata.get(routeKey);
  }

  /**
   * Generate OpenAPI specification
   */
  generateOpenApi(): ExtensionOpenApiSpec {
    const paths: Record<string, Record<string, unknown>> = {};
    const schemas: Record<string, unknown> = {};

    for (const route of this.routes.values()) {
      if (!paths[route.path]) {
        paths[route.path] = {};
      }

      const method = route.method.toLowerCase();
      const pathItem: Record<string, unknown> = {
        summary: route.description || `${route.method} ${route.path}`,
        operationId: `${route.method.toLowerCase()}${route.path.replace(/\//g, '_')}`,
        tags: route.tags || [],
      };

      // Add parameters
      if (route.parameters) {
        pathItem.parameters = route.parameters.map((param) => ({
          name: param.name,
          in: param.in,
          description: param.description,
          required: param.required,
          example: param.example,
        }));
      }

      // Add request body
      if (route.requestBody) {
        pathItem.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: this.zodSchemaToJsonSchema(route.requestBody),
            },
          },
        };
      }

      // Add responses
      if (route.responses) {
        const responses: Record<string, unknown> = {};
        for (const response of route.responses) {
          responses[response.status] = {
            description: response.description,
            content: response.schema
              ? {
                  'application/json': {
                    schema: this.zodSchemaToJsonSchema(response.schema),
                    example: response.example,
                  },
                }
              : undefined,
          };
        }
        pathItem.responses = responses;
      } else {
        pathItem.responses = {
          200: {
            description: 'Success',
          },
        };
      }

      // Add security
      if (route.permissions && route.permissions.length > 0) {
        pathItem.security = [
          {
            bearerAuth: [],
          },
        ];
      }

      paths[route.path][method] = pathItem;
    }

    return {
      openapi: '3.0.0',
      info: {
        title: 'Extension Routes',
        version: '1.0.0',
        description: 'Auto-generated OpenAPI specification for extension routes',
      },
      paths,
      components: {
        schemas,
      },
    };
  }

  /**
   * Convert Zod schema to JSON Schema (simplified)
   */
  private zodSchemaToJsonSchema(schema: unknown): Record<string, unknown> {
    // Simplified conversion - in production, use a proper Zod to JSON Schema converter
    return {
      type: 'object',
      properties: {},
    };
  }

  /**
   * Add audit log entry
   */
  async addAuditLog(entry: AuditLogEntry): Promise<void> {
    this.auditLogs.push(entry);

    // Update route metadata access count
    const routeKey = this.getRouteKey(entry.path, entry.method);
    const metadata = this.routeMetadata.get(routeKey);
    if (metadata) {
      metadata.accessCount += 1;
      metadata.lastAccessed = entry.timestamp;
    }
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filters?: {
    extensionId?: string;
    path?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditLogEntry[]> {
    let logs = [...this.auditLogs];

    if (filters?.extensionId) {
      logs = logs.filter((log) => log.extensionId === filters.extensionId);
    }

    if (filters?.path) {
      logs = logs.filter((log) => log.path === filters.path);
    }

    if (filters?.startDate) {
      logs = logs.filter((log) => log.timestamp >= filters.startDate!);
    }

    if (filters?.endDate) {
      logs = logs.filter((log) => log.timestamp <= filters.endDate!);
    }

    return logs;
  }

  /**
   * Get rate limit state
   */
  getRateLimitState(key: string): RateLimitState | undefined {
    return this.rateLimitStates.get(key);
  }

  /**
   * Check if route is rate limited
   */
  isRateLimited(key: string, config: RateLimitConfig): boolean {
    const now = new Date();
    let state = this.rateLimitStates.get(key);

    if (!state) {
      // First request in this window
      state = {
        count: 1,
        windowStart: now,
        windowEnd: new Date(now.getTime() + config.windowSeconds * 1000),
        exceeded: false,
      };
      this.rateLimitStates.set(key, state);
      return false;
    }

    // Check if we're still in the same window
    if (now > state.windowEnd) {
      // New window
      state = {
        count: 1,
        windowStart: now,
        windowEnd: new Date(now.getTime() + config.windowSeconds * 1000),
        exceeded: false,
      };
      this.rateLimitStates.set(key, state);
      return false;
    }

    // Still in same window
    state.count += 1;
    state.exceeded = state.count > config.maxRequests;

    return state.exceeded;
  }
}

/**
 * Create and return a new ExtensionRouteRegistry instance
 */
export function createExtensionRouteRegistry(): ExtensionRouteRegistry {
  return new ExtensionRouteRegistryImpl();
}
