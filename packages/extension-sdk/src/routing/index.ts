/**
 * Extension Routing Module
 *
 * Comprehensive routing system for dynamic extension endpoints with:
 * - Route registration and unregistration
 * - OpenAPI specification generation
 * - Zod schema validation
 * - RBAC integration
 * - Rate limiting
 * - Audit logging
 */

export {
  createExtensionRouteRegistry,
  ExtensionRouteRegistryImpl,
} from './registry';

export {
  wrapRouteHandler,
  createRbacMiddleware,
  createValidationMiddleware,
  createRateLimitMiddleware,
  createAuditLoggingMiddleware,
  type RequestContext,
  type ResponseContext,
} from './middleware';

export type {
  HttpMethod,
  RouteParameter,
  RouteResponse,
  PermissionRequirement,
  RateLimitConfig,
  ExtensionRoute,
  RouteRegistrationRequest,
  RouteRegistrationResponse,
  WrappedRouteHandler,
  ExtensionOpenApiSpec,
  AuditLogEntry,
  RateLimitState,
  RouteMetadata,
  ExtensionRouteRegistry,
} from './types';

/**
 * Initialize the extension routing system
 *
 * @example
 * ```typescript
 * import { createExtensionRouteRegistry } from '@machshop/extension-sdk/routing';
 *
 * const router = createExtensionRouteRegistry();
 *
 * // Register extension routes
 * const response = await router.register({
 *   extensionId: 'my-extension',
 *   version: '1.0.0',
 *   basePath: '/api/extensions/my-extension',
 *   routes: [
 *     {
 *       path: '/data',
 *       method: 'GET',
 *       description: 'Get extension data',
 *       handler: async (req, res) => {
 *         res.json({ data: [] });
 *       },
 *       permissions: [
 *         { permission: 'extension:read', required: true }
 *       ],
 *       rateLimit: {
 *         maxRequests: 100,
 *         windowSeconds: 60,
 *         perUser: true,
 *       },
 *     }
 *   ]
 * });
 *
 * // Generate OpenAPI specification
 * const openapi = router.generateOpenApi();
 *
 * // Get audit logs
 * const logs = await router.getAuditLogs({ extensionId: 'my-extension' });
 * ```
 */
