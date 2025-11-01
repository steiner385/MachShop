/**
 * Service Locator & Auto-Discovery
 * Alternative interface to DI container + service auto-discovery
 * Issue #440: Service Locator & Dependency Injection Container
 */

import type { IServiceLocator, IServiceContainer, ServiceToken } from './types';
import { ServiceNotFoundError, ServiceResolutionError } from './types';

/**
 * Service locator metadata for auto-discovery
 */
export interface ServiceDescriptor {
  token: ServiceToken;
  serviceName: string;
  category: string;
  version: string;
  description?: string;
  tags?: string[];
  experimental?: boolean;
}

/**
 * Service registry for auto-discovery
 */
export interface IServiceRegistry {
  /**
   * Register a service descriptor
   */
  register(descriptor: ServiceDescriptor): void;

  /**
   * Find services by criteria
   */
  find(query: ServiceQuery): ServiceDescriptor[];

  /**
   * Get service descriptor
   */
  get(token: ServiceToken): ServiceDescriptor | undefined;

  /**
   * List all registered services
   */
  list(): ServiceDescriptor[];

  /**
   * Clear registry
   */
  clear(): void;
}

/**
 * Service query for finding services
 */
export interface ServiceQuery {
  category?: string;
  tags?: string[];
  name?: string | RegExp;
  experimental?: boolean;
}

/**
 * Service locator implementation
 */
export class ServiceLocator implements IServiceLocator {
  private container: IServiceContainer;
  private registry: Map<ServiceToken, ServiceDescriptor> = new Map();

  constructor(container: IServiceContainer) {
    this.container = container;
  }

  /**
   * Get service by token
   */
  getService<T = any>(token: ServiceToken<T>): T {
    if (!this.container.has(token)) {
      throw new ServiceNotFoundError(token);
    }
    return this.container.resolve(token);
  }

  /**
   * Get service asynchronously
   */
  async getServiceAsync<T = any>(token: ServiceToken<T>): Promise<T> {
    if (!this.container.has(token)) {
      throw new ServiceNotFoundError(token);
    }
    return this.container.resolveAsync(token);
  }

  /**
   * Check if service exists
   */
  hasService<T = any>(token: ServiceToken<T>): boolean {
    return this.container.has(token);
  }

  /**
   * Register service descriptor
   */
  registerDescriptor(descriptor: ServiceDescriptor): void {
    this.registry.set(descriptor.token, descriptor);
  }

  /**
   * Find services by query
   */
  findServices(query: ServiceQuery): ServiceDescriptor[] {
    let results = Array.from(this.registry.values());

    if (query.category) {
      results = results.filter((s) => s.category === query.category);
    }

    if (query.name) {
      const pattern = typeof query.name === 'string'
        ? new RegExp(query.name, 'i')
        : query.name;
      results = results.filter((s) => pattern.test(s.serviceName));
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter((s) =>
        query.tags!.some((tag) => s.tags?.includes(tag))
      );
    }

    if (query.experimental !== undefined) {
      results = results.filter((s) => s.experimental === query.experimental);
    }

    return results;
  }

  /**
   * Get service descriptor
   */
  getDescriptor(token: ServiceToken): ServiceDescriptor | undefined {
    return this.registry.get(token);
  }

  /**
   * List all service descriptors
   */
  listDescriptors(): ServiceDescriptor[] {
    return Array.from(this.registry.values());
  }

  /**
   * Clear registry
   */
  clear(): void {
    this.registry.clear();
  }

  /**
   * Get underlying container
   */
  getContainer(): IServiceContainer {
    return this.container;
  }
}

/**
 * Auto-discovery scanner for finding services
 */
export class ServiceDiscoveryScanner {
  /**
   * Scan for services in module exports
   */
  static scanModule(
    moduleExports: Record<string, any>,
    options?: {
      category?: string;
      version?: string;
      basePath?: string;
    }
  ): ServiceDescriptor[] {
    const descriptors: ServiceDescriptor[] = [];

    for (const [key, value] of Object.entries(moduleExports)) {
      // Skip non-service exports
      if (typeof value !== 'function' && typeof value !== 'object') {
        continue;
      }

      // Check for service metadata
      const metadata = this.extractMetadata(value, key);
      if (metadata) {
        descriptors.push({
          token: value,
          serviceName: key,
          category: options?.category || 'general',
          version: options?.version || '1.0.0',
          ...metadata,
        });
      }
    }

    return descriptors;
  }

  /**
   * Scan for services with decorators
   */
  static scanDecorated(
    classes: ServiceConstructor[],
    options?: {
      category?: string;
      version?: string;
    }
  ): ServiceDescriptor[] {
    const descriptors: ServiceDescriptor[] = [];

    for (const cls of classes) {
      const metadata = Reflect.getMetadata('service:metadata', cls);
      if (metadata) {
        descriptors.push({
          token: cls,
          serviceName: cls.name,
          category: options?.category || metadata.category || 'general',
          version: options?.version || metadata.version || '1.0.0',
          description: metadata.description,
          tags: metadata.tags,
          experimental: metadata.experimental,
        });
      }
    }

    return descriptors;
  }

  /**
   * Extract service metadata from value
   */
  private static extractMetadata(
    value: any,
    key: string
  ): Partial<ServiceDescriptor> | null {
    // Check for explicit metadata
    if (value.__serviceMetadata) {
      return value.__serviceMetadata;
    }

    // Check for interface implementation
    if (value.prototype && typeof value === 'function') {
      // Could use duck typing or interface checking here
      return {
        description: `Service ${key}`,
        tags: [key.toLowerCase()],
      };
    }

    return null;
  }
}

/**
 * Service factory builder with fluent API
 */
export class ServiceFactoryBuilder<T = any> {
  private serviceName: string;
  private category: string = 'general';
  private version: string = '1.0.0';
  private description?: string;
  private tags: string[] = [];
  private experimental: boolean = false;
  private factory?: () => T;
  private dependencies: ServiceToken[] = [];

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Set category
   */
  withCategory(category: string): this {
    this.category = category;
    return this;
  }

  /**
   * Set version
   */
  withVersion(version: string): this {
    this.version = version;
    return this;
  }

  /**
   * Set description
   */
  withDescription(description: string): this {
    this.description = description;
    return this;
  }

  /**
   * Add tags
   */
  withTags(...tags: string[]): this {
    this.tags.push(...tags);
    return this;
  }

  /**
   * Mark as experimental
   */
  asExperimental(): this {
    this.experimental = true;
    return this;
  }

  /**
   * Set factory function
   */
  withFactory(factory: () => T): this {
    this.factory = factory;
    return this;
  }

  /**
   * Add dependency
   */
  withDependency(token: ServiceToken): this {
    this.dependencies.push(token);
    return this;
  }

  /**
   * Build service descriptor
   */
  build(): ServiceDescriptor & { factory?: () => T } {
    if (!this.factory) {
      throw new Error('Factory function is required');
    }

    return {
      token: this.serviceName,
      serviceName: this.serviceName,
      category: this.category,
      version: this.version,
      description: this.description,
      tags: this.tags,
      experimental: this.experimental,
      factory: this.factory,
    };
  }
}

/**
 * Service constructor (for type definitions)
 */
export type ServiceConstructor<T = any> = new (...args: any[]) => T;

/**
 * Decorator for marking services
 */
export function Service(options?: {
  name?: string;
  category?: string;
  version?: string;
  tags?: string[];
  experimental?: boolean;
}): ClassDecorator {
  return (target: any) => {
    const metadata = {
      serviceName: options?.name || target.name,
      category: options?.category || 'general',
      version: options?.version || '1.0.0',
      tags: options?.tags || [],
      experimental: options?.experimental || false,
    };

    if (typeof Reflect?.metadata === 'function') {
      Reflect.metadata('service:metadata', metadata)(target);
    } else {
      target.__serviceMetadata = metadata;
    }
  };
}

/**
 * Decorator for injecting dependencies
 */
export function Inject(token: ServiceToken): ParameterDecorator {
  return (target: any, propertyKey: any, parameterIndex: number) => {
    const existingMetadata = Reflect.getOwnMetadata('design:paramtypes', target) || [];
    const injectMetadata = {
      index: parameterIndex,
      token,
    };

    if (typeof Reflect?.metadata === 'function') {
      Reflect.metadata('inject:metadata', injectMetadata)(target);
    } else {
      if (!target.__injectMetadata) {
        target.__injectMetadata = [];
      }
      target.__injectMetadata.push(injectMetadata);
    }
  };
}
