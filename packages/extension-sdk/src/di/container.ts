/**
 * Dependency Injection Container Implementation
 * Issue #440: Service Locator & Dependency Injection Container
 */

import type {
  IServiceContainer,
  ServiceScope,
  ServiceToken,
  ServiceFactory,
  ServiceConstructor,
  ServiceMetadata,
  ServiceRegistration,
  ContainerOptions,
  ResolutionContext,
  CircularDependency,
  DependencyNode,
} from './types';

import {
  ServiceContainerError,
  CircularDependencyError,
  ServiceNotFoundError,
  ServiceResolutionError,
} from './types';

/**
 * Extension Service Container
 * Provides dependency injection, service registration, and lifecycle management
 */
export class ExtensionServiceContainer implements IServiceContainer {
  private registrations: Map<ServiceToken, ServiceMetadata> = new Map();
  private instances: Map<ServiceToken, any> = new Map();
  private resolutionStack: ServiceToken[] = [];
  private options: Required<ContainerOptions>;
  private parent?: IServiceContainer;
  private children: ExtensionServiceContainer[] = [];

  constructor(options?: ContainerOptions) {
    this.options = {
      strictCircularDependencyCheck: options?.strictCircularDependencyCheck ?? true,
      autoResolveLazy: options?.autoResolveLazy ?? true,
      trackLifecycle: options?.trackLifecycle ?? true,
      maxResolutionDepth: options?.maxResolutionDepth ?? 100,
      resolutionTimeout: options?.resolutionTimeout ?? 30000,
      name: options?.name ?? 'DefaultContainer',
    };

    this.parent = options?.parent;
  }

  /**
   * Register a singleton service (single instance)
   */
  registerSingleton<T>(token: ServiceToken<T>, instance: T): this {
    const metadata: ServiceMetadata<T> = {
      token,
      scope: 'SINGLETON',
      singleton: instance,
      createdAt: new Date(),
    };

    this.registrations.set(token, metadata);
    this.instances.set(token, instance);

    return this;
  }

  /**
   * Register a service factory
   */
  registerFactory<T>(
    token: ServiceToken<T>,
    factory: ServiceFactory<T>,
    scope: ServiceScope = 'EXTENSION_SCOPED'
  ): this {
    const metadata: ServiceMetadata<T> = {
      token,
      scope,
      factory,
      dependencies: this.extractDependencies(factory),
    };

    this.registrations.set(token, metadata);

    return this;
  }

  /**
   * Register a service class
   */
  registerClass<T>(
    token: ServiceToken<T>,
    constructor: ServiceConstructor<T>,
    scope: ServiceScope = 'EXTENSION_SCOPED'
  ): this {
    const metadata: ServiceMetadata<T> = {
      token,
      scope,
      constructor,
      dependencies: this.extractConstructorDependencies(constructor),
    };

    this.registrations.set(token, metadata);

    return this;
  }

  /**
   * Resolve a service synchronously
   */
  resolve<T = any>(token: ServiceToken<T>): T {
    // Check instance cache first
    if (this.instances.has(token)) {
      const metadata = this.registrations.get(token)!;
      if (metadata.scope === 'SINGLETON') {
        return this.instances.get(token);
      }
    }

    // Check circular dependencies
    if (this.resolutionStack.includes(token)) {
      throw new CircularDependencyError(this.resolutionStack);
    }

    // Check resolution depth
    if (this.resolutionStack.length >= this.options.maxResolutionDepth) {
      throw new ServiceResolutionError(
        token,
        `Maximum resolution depth (${this.options.maxResolutionDepth}) exceeded`
      );
    }

    const metadata = this.getMetadata(token);
    if (!metadata) {
      // Check parent container
      if (this.parent) {
        return this.parent.resolve(token);
      }
      throw new ServiceNotFoundError(token);
    }

    this.resolutionStack.push(token);

    try {
      let instance: T;

      if (metadata.singleton) {
        instance = metadata.singleton;
      } else if (metadata.factory) {
        instance = metadata.factory(this);
      } else if (metadata.constructor) {
        const dependencies = this.resolveDependencies(metadata.dependencies || []);
        instance = new metadata.constructor(...dependencies);
      } else {
        throw new ServiceResolutionError(token, 'No factory or constructor provided');
      }

      // Cache instance based on scope
      if (metadata.scope === 'SINGLETON') {
        this.instances.set(token, instance);
      }

      // Update metadata
      metadata.accessedAt = new Date();
      metadata.accessCount = (metadata.accessCount || 0) + 1;

      return instance;
    } catch (error) {
      if (error instanceof ServiceContainerError) {
        throw error;
      }
      throw new ServiceResolutionError(token, String(error));
    } finally {
      this.resolutionStack.pop();
    }
  }

  /**
   * Resolve a service asynchronously
   */
  async resolveAsync<T = any>(token: ServiceToken<T>): Promise<T> {
    return Promise.race([
      this.resolveAsyncInternal(token),
      this.createTimeoutPromise<T>(this.options.resolutionTimeout),
    ]);
  }

  /**
   * Internal async resolution
   */
  private async resolveAsyncInternal<T = any>(token: ServiceToken<T>): Promise<T> {
    if (this.instances.has(token)) {
      const metadata = this.registrations.get(token)!;
      if (metadata.scope === 'SINGLETON') {
        return this.instances.get(token);
      }
    }

    const metadata = this.getMetadata(token);
    if (!metadata) {
      if (this.parent && 'resolveAsync' in this.parent) {
        return (this.parent as any).resolveAsync(token);
      }
      throw new ServiceNotFoundError(token);
    }

    let instance: T;

    if (metadata.singleton) {
      instance = metadata.singleton;
    } else if (metadata.factory) {
      instance = await metadata.factory(this);
    } else if (metadata.constructor) {
      const dependencies = await this.resolveDependenciesAsync(metadata.dependencies || []);
      instance = new metadata.constructor(...dependencies);
    } else {
      throw new ServiceResolutionError(token, 'No factory or constructor provided');
    }

    if (metadata.scope === 'SINGLETON') {
      this.instances.set(token, instance);
    }

    metadata.accessedAt = new Date();
    metadata.accessCount = (metadata.accessCount || 0) + 1;

    return instance;
  }

  /**
   * Check if service is registered
   */
  has<T = any>(token: ServiceToken<T>): boolean {
    if (this.registrations.has(token)) {
      return true;
    }
    if (this.parent) {
      return this.parent.has(token);
    }
    return false;
  }

  /**
   * Get all registrations
   */
  getRegistrations(): ServiceMetadata[] {
    return Array.from(this.registrations.values());
  }

  /**
   * Get metadata for a token
   */
  getMetadata(token: ServiceToken): ServiceMetadata | undefined {
    return this.registrations.get(token);
  }

  /**
   * Clear all services
   */
  clear(): void {
    this.registrations.clear();
    this.instances.clear();
    this.resolutionStack = [];
  }

  /**
   * Create a child container
   */
  createChild(name?: string): ExtensionServiceContainer {
    const child = new ExtensionServiceContainer({
      ...this.options,
      name: name || `${this.options.name}.child`,
      parent: this,
    });

    this.children.push(child);
    return child;
  }

  /**
   * Validate dependency graph
   */
  validateDependencies(): CircularDependency[] {
    const circularDeps: CircularDependency[] = [];

    for (const metadata of this.registrations.values()) {
      const cycle = this.findCycle(metadata.token);
      if (cycle.length > 0) {
        circularDeps.push({
          tokens: Array.from(this.registrations.keys()),
          cycle,
        });
      }
    }

    return circularDeps;
  }

  /**
   * Get service statistics
   */
  getStatistics(): {
    registeredServices: number;
    cachedSingletons: number;
    children: number;
    memoryUsage: string;
  } {
    return {
      registeredServices: this.registrations.size,
      cachedSingletons: Array.from(this.registrations.values()).filter(
        (m) => m.scope === 'SINGLETON'
      ).length,
      children: this.children.length,
      memoryUsage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  /**
   * Get container info
   */
  getInfo(): {
    name: string;
    registrations: number;
    options: Record<string, any>;
  } {
    return {
      name: this.options.name,
      registrations: this.registrations.size,
      options: {
        strictCircularDependencyCheck: this.options.strictCircularDependencyCheck,
        autoResolveLazy: this.options.autoResolveLazy,
        maxResolutionDepth: this.options.maxResolutionDepth,
      },
    };
  }

  /**
   * Resolve multiple dependencies
   */
  private resolveDependencies(tokens: ServiceToken[]): any[] {
    return tokens.map((token) => this.resolve(token));
  }

  /**
   * Resolve multiple dependencies asynchronously
   */
  private async resolveDependenciesAsync(tokens: ServiceToken[]): Promise<any[]> {
    return Promise.all(tokens.map((token) => this.resolveAsync(token)));
  }

  /**
   * Extract dependencies from factory function
   */
  private extractDependencies(factory: ServiceFactory): ServiceToken[] {
    // Parse function signature to extract dependencies
    const fnStr = factory.toString();
    const match = fnStr.match(/\(([^)]*)\)/);
    if (!match) return [];

    const params = match[1].split(',').map((p) => p.trim());
    // Filter out 'container' parameter
    return params.filter((p) => p && p !== 'container' && p !== 'this');
  }

  /**
   * Extract dependencies from constructor
   */
  private extractConstructorDependencies(constructor: ServiceConstructor): ServiceToken[] {
    // In a real implementation, this would use reflect-metadata or decorators
    // For now, return empty array (user must specify dependencies)
    return [];
  }

  /**
   * Find circular dependency cycle
   */
  private findCycle(token: ServiceToken, visited: Set<ServiceToken> = new Set()): ServiceToken[] {
    if (visited.has(token)) {
      return [token];
    }

    visited.add(token);
    const metadata = this.registrations.get(token);

    if (!metadata || !metadata.dependencies) {
      return [];
    }

    for (const dep of metadata.dependencies) {
      const cycle = this.findCycle(dep, new Set(visited));
      if (cycle.length > 0) {
        return [token, ...cycle];
      }
    }

    return [];
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise<T>(ms: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(
        () => reject(new ServiceResolutionError(null as any, `Resolution timeout after ${ms}ms`)),
        ms
      );
    });
  }

  /**
   * Get parent container
   */
  getParent(): IServiceContainer | undefined {
    return this.parent;
  }

  /**
   * Get all children
   */
  getChildren(): ExtensionServiceContainer[] {
    return [...this.children];
  }
}

/**
 * Global service container instance
 */
let globalContainer: ExtensionServiceContainer | null = null;

/**
 * Get or create global service container
 */
export function getGlobalServiceContainer(): ExtensionServiceContainer {
  if (!globalContainer) {
    globalContainer = new ExtensionServiceContainer({
      name: 'Global',
      strictCircularDependencyCheck: true,
    });
  }
  return globalContainer;
}

/**
 * Reset global service container (for testing)
 */
export function resetGlobalServiceContainer(): void {
  globalContainer = null;
}
