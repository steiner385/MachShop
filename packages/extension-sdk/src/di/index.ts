/**
 * Dependency Injection Container Module
 * Service registration, resolution, and lifecycle management for extensions
 * Issue #440: Service Locator & Dependency Injection Container
 */

// Core container
export {
  ExtensionServiceContainer,
  getGlobalServiceContainer,
  resetGlobalServiceContainer,
} from './container';

// Types and errors
export {
  ServiceScope,
  ServiceToken,
  ServiceFactory,
  ServiceConstructor,
  ServiceMetadata,
  ServiceRegistration,
  IServiceContainer,
  IServiceLocator,
  ContainerOptions,
  ResolutionContext,
  CircularDependency,
  DependencyNode,
  ServiceContainerError,
  CircularDependencyError,
  ServiceNotFoundError,
  ServiceResolutionError,
  type InjectMetadata,
  type InjectionResult,
} from './types';

// Service locator and discovery
export {
  ServiceLocator,
  ServiceDiscoveryScanner,
  ServiceFactoryBuilder,
  Service,
  Inject,
  type ServiceDescriptor,
  type IServiceRegistry,
  type ServiceQuery,
  type ServiceConstructor as LocatorServiceConstructor,
} from './locator';

// Lifecycle management
export {
  ServiceLifecycleManager,
  getGlobalLifecycleManager,
  emitEvent,
  onGlobalLifecycleEvent,
  onAnyGlobalLifecycleEvent,
  LifecycleEventType,
  type LifecycleEvent,
  type LifecycleHook,
  type IInitializable,
  type IDisposable,
  type ServiceWithLifecycle,
} from './lifecycle';

/**
 * Quick start: Create and use a service container
 *
 * @example
 * ```typescript
 * import {
 *   ExtensionServiceContainer,
 *   ServiceLocator,
 *   Service,
 *   Inject,
 * } from '@machshop/extension-sdk/di';
 *
 * // Define services with decorators
 * @Service({ category: 'data', version: '1.0.0', tags: ['core'] })
 * class DatabaseService {
 *   connect() { }
 * }
 *
 * @Service({ category: 'business' })
 * class OrderService {
 *   constructor(@Inject(DatabaseService) private db: DatabaseService) { }
 *   createOrder() { this.db.connect(); }
 * }
 *
 * // Create container and register services
 * const container = new ExtensionServiceContainer({
 *   name: 'MyExtension',
 *   strictCircularDependencyCheck: true,
 * });
 *
 * container.registerClass(DatabaseService, DatabaseService, 'SINGLETON');
 * container.registerClass(OrderService, OrderService, 'EXTENSION_SCOPED');
 *
 * // Resolve services
 * const orderService = container.resolve(OrderService);
 * orderService.createOrder();
 *
 * // Use service locator for discovery
 * const locator = new ServiceLocator(container);
 * locator.registerDescriptor({
 *   token: OrderService,
 *   serviceName: 'OrderService',
 *   category: 'business',
 *   version: '1.0.0',
 * });
 *
 * const services = locator.findServices({ category: 'business' });
 * ```
 */
