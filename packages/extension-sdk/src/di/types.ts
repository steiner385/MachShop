/**
 * Dependency Injection Container - Type Definitions
 * Service registration, resolution, and lifecycle management for extensions
 * Issue #440: Service Locator & Dependency Injection Container
 */

/**
 * Service scope determines instance lifecycle
 */
export enum ServiceScope {
  /**
   * Single instance shared across entire application
   */
  SINGLETON = 'SINGLETON',

  /**
   * New instance created for each extension context
   */
  EXTENSION_SCOPED = 'EXTENSION_SCOPED',

  /**
   * New instance created for each request/invocation
   */
  TRANSIENT = 'TRANSIENT',

  /**
   * Instance cached per HTTP request
   */
  REQUEST_SCOPED = 'REQUEST_SCOPED',
}

/**
 * Service factory function
 */
export type ServiceFactory<T = any> = (container: IServiceContainer) => T | Promise<T>;

/**
 * Service constructor
 */
export type ServiceConstructor<T = any> = new (...args: any[]) => T;

/**
 * Service token - unique identifier for a service
 */
export type ServiceToken<T = any> = string | symbol | ServiceConstructor<T>;

/**
 * Service metadata
 */
export interface ServiceMetadata<T = any> {
  token: ServiceToken<T>;
  scope: ServiceScope;
  factory?: ServiceFactory<T>;
  constructor?: ServiceConstructor<T>;
  dependencies?: ServiceToken[];
  lazy?: boolean;
  singleton?: T;
  createdAt?: Date;
  accessedAt?: Date;
  accessCount?: number;
}

/**
 * Service registration
 */
export interface ServiceRegistration<T = any> {
  token: ServiceToken<T>;
  scope: ServiceScope;
  factory?: ServiceFactory<T>;
  constructor?: ServiceConstructor<T>;
  dependencies?: ServiceToken[];
  lazy?: boolean;
}

/**
 * Service container interface
 */
export interface IServiceContainer {
  /**
   * Register a service instance
   */
  registerSingleton<T>(token: ServiceToken<T>, instance: T): this;

  /**
   * Register a service factory
   */
  registerFactory<T>(
    token: ServiceToken<T>,
    factory: ServiceFactory<T>,
    scope?: ServiceScope
  ): this;

  /**
   * Register a service constructor
   */
  registerClass<T>(
    token: ServiceToken<T>,
    constructor: ServiceConstructor<T>,
    scope?: ServiceScope
  ): this;

  /**
   * Resolve a service
   */
  resolve<T = any>(token: ServiceToken<T>): T;

  /**
   * Resolve a service asynchronously
   */
  resolveAsync<T = any>(token: ServiceToken<T>): Promise<T>;

  /**
   * Check if a service is registered
   */
  has<T = any>(token: ServiceToken<T>): boolean;

  /**
   * Get all registered services
   */
  getRegistrations(): ServiceMetadata[];

  /**
   * Clear all services
   */
  clear(): void;

  /**
   * Create a child container (inherits parent services)
   */
  createChild(name?: string): IServiceContainer;

  /**
   * Get container metadata
   */
  getMetadata(token: ServiceToken): ServiceMetadata | undefined;
}

/**
 * Service locator interface (alternative to dependency injection)
 */
export interface IServiceLocator {
  /**
   * Get a service instance
   */
  getService<T = any>(token: ServiceToken<T>): T;

  /**
   * Get a service asynchronously
   */
  getServiceAsync<T = any>(token: ServiceToken<T>): Promise<T>;

  /**
   * Check if service is available
   */
  hasService<T = any>(token: ServiceToken<T>): boolean;
}

/**
 * Dependency graph for circular detection
 */
export interface DependencyNode {
  token: ServiceToken;
  dependencies: ServiceToken[];
  metadata: ServiceMetadata;
}

/**
 * Circular dependency information
 */
export interface CircularDependency {
  tokens: ServiceToken[];
  cycle: ServiceToken[];
}

/**
 * Service resolution context
 */
export interface ResolutionContext {
  container: IServiceContainer;
  resolved: Map<ServiceToken, any>;
  resolving: Set<ServiceToken>;
  scope: ServiceScope;
  extensionId?: string;
}

/**
 * Service injection decorator metadata
 */
export interface InjectMetadata {
  parameterIndex: number;
  token: ServiceToken;
  optional?: boolean;
}

/**
 * Service container options
 */
export interface ContainerOptions {
  /**
   * Enable strict circular dependency checking
   */
  strictCircularDependencyCheck?: boolean;

  /**
   * Auto-resolve lazy services on access
   */
  autoResolveLazy?: boolean;

  /**
   * Track service lifecycle events
   */
  trackLifecycle?: boolean;

  /**
   * Maximum service resolution depth
   */
  maxResolutionDepth?: number;

  /**
   * Service resolution timeout (ms)
   */
  resolutionTimeout?: number;

  /**
   * Container name for debugging
   */
  name?: string;

  /**
   * Parent container for child containers
   */
  parent?: IServiceContainer;
}

/**
 * Service container error
 */
export class ServiceContainerError extends Error {
  constructor(
    message: string,
    public code: string,
    public token?: ServiceToken,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ServiceContainerError';
  }
}

/**
 * Circular dependency error
 */
export class CircularDependencyError extends ServiceContainerError {
  constructor(
    public cycle: ServiceToken[],
    details?: Record<string, any>
  ) {
    super(
      `Circular dependency detected: ${cycle.map((t) => String(t)).join(' -> ')}`,
      'CIRCULAR_DEPENDENCY',
      undefined,
      details
    );
    this.name = 'CircularDependencyError';
  }
}

/**
 * Service not found error
 */
export class ServiceNotFoundError extends ServiceContainerError {
  constructor(token: ServiceToken) {
    super(`Service not found: ${String(token)}`, 'SERVICE_NOT_FOUND', token);
    this.name = 'ServiceNotFoundError';
  }
}

/**
 * Service resolution error
 */
export class ServiceResolutionError extends ServiceContainerError {
  constructor(
    token: ServiceToken,
    message: string,
    details?: Record<string, any>
  ) {
    super(`Error resolving service ${String(token)}: ${message}`, 'SERVICE_RESOLUTION_ERROR', token, details);
    this.name = 'ServiceResolutionError';
  }
}

/**
 * Dependency injection decorator result
 */
export interface InjectionResult<T = any> {
  instance: T;
  scope: ServiceScope;
  token: ServiceToken<T>;
  resolvedAt: Date;
  dependencies?: ServiceToken[];
}
