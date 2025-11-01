/**
 * Extension Routing Types
 *
 * Comprehensive type definitions for dynamic route registration,
 * OpenAPI specification, validation, and access control.
 */

import type { ZodSchema } from 'zod';

/**
 * HTTP Methods supported by extension routes
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Route parameter definition
 */
export interface RouteParameter {
  /** Parameter name */
  name: string;
  /** Parameter location (path, query, header, body) */
  in: 'path' | 'query' | 'header' | 'body';
  /** Parameter description */
  description?: string;
  /** Whether parameter is required */
  required: boolean;
  /** Zod schema for validation */
  schema?: ZodSchema;
  /** Example value */
  example?: unknown;
}

/**
 * Route response definition
 */
export interface RouteResponse {
  /** HTTP status code */
  status: number;
  /** Response description */
  description: string;
  /** Response schema for validation/documentation */
  schema?: ZodSchema;
  /** Response example */
  example?: unknown;
}

/**
 * RBAC permission requirement
 */
export interface PermissionRequirement {
  /** Permission string (e.g., 'extension:read', 'extension:write') */
  permission: string;
  /** Whether this is a required permission (vs optional) */
  required: boolean;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per time window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Whether to track per-user (vs global) */
  perUser?: boolean;
  /** Custom rate limit key extractor */
  keyExtractor?: (req: Record<string, unknown>) => string;
}

/**
 * Extension route definition
 */
export interface ExtensionRoute {
  /** Route path pattern (e.g., '/data', '/data/:id') */
  path: string;
  /** HTTP method */
  method: HttpMethod;
  /** Route handler function */
  handler: (req: unknown, res: unknown) => Promise<void>;
  /** Route description for documentation */
  description?: string;
  /** Route parameters */
  parameters?: RouteParameter[];
  /** Request body schema */
  requestBody?: ZodSchema;
  /** Expected responses */
  responses?: RouteResponse[];
  /** Required permissions */
  permissions?: PermissionRequirement[];
  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig;
  /** Tags for OpenAPI grouping */
  tags?: string[];
  /** Whether this route requires authentication */
  requiresAuth?: boolean;
  /** Custom middleware to apply */
  middleware?: Array<(req: unknown, res: unknown, next: () => void) => void>;
}

/**
 * Extension route registration request
 */
export interface RouteRegistrationRequest {
  /** Extension ID */
  extensionId: string;
  /** Extension version */
  version: string;
  /** Base path prefix for all routes (e.g., '/api/extensions/my-ext') */
  basePath: string;
  /** Routes to register */
  routes: ExtensionRoute[];
  /** Optional metadata */
  metadata?: {
    [key: string]: unknown;
  };
}

/**
 * Route registration response
 */
export interface RouteRegistrationResponse {
  /** Whether registration was successful */
  success: boolean;
  /** Registered route paths */
  registeredPaths: string[];
  /** Error message if registration failed */
  error?: string;
  /** Warnings during registration */
  warnings?: string[];
}

/**
 * Route handler wrapper with middleware
 */
export interface WrappedRouteHandler {
  /** Original handler */
  original: (req: unknown, res: unknown) => Promise<void>;
  /** Applied middleware stack */
  middleware: Array<(req: unknown, res: unknown, next: () => void) => void>;
  /** RBAC wrapper */
  withRbac: (req: unknown, res: unknown) => Promise<void>;
  /** Rate limit wrapper */
  withRateLimit: (req: unknown, res: unknown) => Promise<void>;
  /** Validation wrapper */
  withValidation: (req: unknown, res: unknown) => Promise<void>;
  /** Audit logging wrapper */
  withAuditLog: (req: unknown, res: unknown) => Promise<void>;
}

/**
 * OpenAPI specification for extension routes
 */
export interface ExtensionOpenApiSpec {
  /** OpenAPI version */
  openapi: string;
  /** API info */
  info: {
    title: string;
    version: string;
    description?: string;
  };
  /** API paths */
  paths: Record<string, Record<string, unknown>>;
  /** Schemas (components) */
  components: {
    schemas: Record<string, unknown>;
  };
}

/**
 * Audit log entry for route access
 */
export interface AuditLogEntry {
  /** Timestamp of the request */
  timestamp: Date;
  /** Extension ID */
  extensionId: string;
  /** Route path */
  path: string;
  /** HTTP method */
  method: HttpMethod;
  /** User ID making the request */
  userId?: string;
  /** Request status */
  status: number;
  /** Response time in milliseconds */
  responseTime: number;
  /** User IP address */
  ipAddress?: string;
  /** Error message if request failed */
  error?: string;
  /** Permissions checked */
  permissionsChecked?: string[];
}

/**
 * Rate limit state
 */
export interface RateLimitState {
  /** Request count in current window */
  count: number;
  /** Window start time */
  windowStart: Date;
  /** Window end time */
  windowEnd: Date;
  /** Whether limit exceeded */
  exceeded: boolean;
}

/**
 * Route metadata for registry
 */
export interface RouteMetadata {
  /** Extension ID owning this route */
  extensionId: string;
  /** Route path */
  path: string;
  /** HTTP method */
  method: HttpMethod;
  /** Registration timestamp */
  registeredAt: Date;
  /** Last modified timestamp */
  modifiedAt: Date;
  /** Access count */
  accessCount: number;
  /** Last accessed */
  lastAccessed?: Date;
  /** Is route active */
  active: boolean;
  /** Additional metadata */
  custom?: Record<string, unknown>;
}

/**
 * Extension route registry
 */
export interface ExtensionRouteRegistry {
  /** Register extension routes */
  register(request: RouteRegistrationRequest): Promise<RouteRegistrationResponse>;
  /** Unregister extension routes */
  unregister(extensionId: string): Promise<void>;
  /** Get route by path and method */
  getRoute(path: string, method: HttpMethod): ExtensionRoute | undefined;
  /** Get all routes for an extension */
  getExtensionRoutes(extensionId: string): ExtensionRoute[];
  /** Get all registered routes */
  getAllRoutes(): ExtensionRoute[];
  /** Get route metadata */
  getRouteMetadata(path: string, method: HttpMethod): RouteMetadata | undefined;
  /** Generate OpenAPI specification */
  generateOpenApi(): ExtensionOpenApiSpec;
  /** Add audit log entry */
  addAuditLog(entry: AuditLogEntry): Promise<void>;
  /** Get audit logs */
  getAuditLogs(filters?: {
    extensionId?: string;
    path?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditLogEntry[]>;
  /** Get rate limit state */
  getRateLimitState(key: string): RateLimitState | undefined;
  /** Check if route is rate limited */
  isRateLimited(key: string, config: RateLimitConfig): boolean;
}
