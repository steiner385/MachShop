# Dependency Injection Container Guide

## Overview

The MachShop Extension SDK provides a comprehensive dependency injection (DI) container for managing services and their dependencies. This guide covers service registration, resolution, lifecycle management, and best practices.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Service Registration](#service-registration)
3. [Service Resolution](#service-resolution)
4. [Scopes](#scopes)
5. [Circular Dependency Detection](#circular-dependency-detection)
6. [Service Locator & Discovery](#service-locator--discovery)
7. [Lifecycle Management](#lifecycle-management)
8. [Advanced Patterns](#advanced-patterns)
9. [Best Practices](#best-practices)
10. [API Reference](#api-reference)

---

## Getting Started

### Creating a Container

```typescript
import { ExtensionServiceContainer } from '@machshop/extension-sdk/di';

// Create a container with default options
const container = new ExtensionServiceContainer();

// Or configure options
const container = new ExtensionServiceContainer({
  name: 'MyExtensionContainer',
  strictCircularDependencyCheck: true,
  autoResolveLazy: true,
  maxResolutionDepth: 100,
  resolutionTimeout: 30000,
});
```

### Basic Example

```typescript
// Define services
class DatabaseService {
  connect() {
    console.log('Connected to database');
  }
}

class OrderService {
  constructor(private db: DatabaseService) {}

  createOrder() {
    this.db.connect();
    console.log('Order created');
  }
}

// Register services
container.registerClass(DatabaseService, DatabaseService, 'SINGLETON');
container.registerClass(OrderService, OrderService);

// Resolve and use
const orderService = container.resolve(OrderService);
orderService.createOrder();
```

---

## Service Registration

### Singleton Registration

Singleton instances are created once and reused everywhere.

```typescript
// Register instance
const dbInstance = new DatabaseService();
container.registerSingleton(DatabaseService, dbInstance);

// Or register class as singleton
container.registerClass(
  DatabaseService,
  DatabaseService,
  'SINGLETON'
);
```

### Factory Registration

Factories create services on demand.

```typescript
// Register with factory function
container.registerFactory(
  'ConfigService',
  (container) => ({
    apiUrl: process.env.API_URL,
    timeout: 5000,
  }),
  'SINGLETON'
);

// Resolve
const config = container.resolve('ConfigService');
```

### Class Registration

Classes are instantiated with constructor injection.

```typescript
container.registerClass(
  OrderService,
  OrderService,
  'EXTENSION_SCOPED'
);
```

---

## Service Resolution

### Synchronous Resolution

```typescript
const service = container.resolve<OrderService>(OrderService);
```

### Asynchronous Resolution

Use for services with async initialization.

```typescript
const service = await container.resolveAsync<OrderService>(OrderService);
```

### Checking Service Existence

```typescript
if (container.has(OrderService)) {
  const service = container.resolve(OrderService);
}
```

---

## Scopes

Service scopes determine instance lifecycle:

### SINGLETON
Single instance for entire application lifetime.
```typescript
container.registerClass(DatabaseService, DatabaseService, 'SINGLETON');
```

### EXTENSION_SCOPED
New instance per extension context.
```typescript
container.registerClass(OrderService, OrderService, 'EXTENSION_SCOPED');
```

### TRANSIENT
New instance every time.
```typescript
container.registerClass(
  RequestHandler,
  RequestHandler,
  'TRANSIENT'
);
```

### REQUEST_SCOPED
Instance cached per HTTP request.
```typescript
container.registerClass(UserContext, UserContext, 'REQUEST_SCOPED');
```

---

## Circular Dependency Detection

The container detects and prevents circular dependencies.

### Automatic Detection

```typescript
class A {
  constructor(b: B) {}
}

class B {
  constructor(a: A) {}
}

container.registerClass(A, A);
container.registerClass(B, B);

// Throws CircularDependencyError
container.resolve(A);
```

### Validating Dependencies

```typescript
const circularDeps = container.validateDependencies();
if (circularDeps.length > 0) {
  console.log('Circular dependencies found:', circularDeps);
}
```

---

## Service Locator & Discovery

### Using Service Locator

Alternative to direct container access.

```typescript
import { ServiceLocator } from '@machshop/extension-sdk/di';

const locator = new ServiceLocator(container);

// Get service
const service = locator.getService(OrderService);

// Check if available
if (locator.hasService(OrderService)) {
  // Safe to use
}

// Get async
const service = await locator.getServiceAsync(OrderService);
```

### Service Discovery

Find services by category or tags.

```typescript
// Register service descriptors
locator.registerDescriptor({
  token: OrderService,
  serviceName: 'OrderService',
  category: 'business',
  version: '1.0.0',
  tags: ['orders', 'core'],
});

// Find services
const businessServices = locator.findServices({ category: 'business' });
const taggedServices = locator.findServices({ tags: ['core'] });
const searched = locator.findServices({ name: 'Order' });
```

### Service Decorators

Mark services for discovery.

```typescript
import { Service, Inject } from '@machshop/extension-sdk/di';

@Service({
  name: 'OrderService',
  category: 'business',
  version: '1.0.0',
  tags: ['orders'],
})
class OrderService {
  constructor(@Inject(DatabaseService) private db: DatabaseService) {}
}
```

---

## Lifecycle Management

### Service Initialization

Services can perform initialization.

```typescript
class DataService implements IInitializable {
  async onInit() {
    console.log('Initializing data service');
    await this.loadData();
  }

  private async loadData() {
    // Load data from database
  }
}

// Register
container.registerClass(DataService, DataService);

// Lifecycle manager will call onInit() after resolution
const lifecycleManager = getGlobalLifecycleManager();
await lifecycleManager.initialize(DataService);
```

### Service Disposal

Services can clean up resources.

```typescript
class DatabaseService implements IDisposable {
  async dispose() {
    console.log('Closing database connection');
    await this.connection.close();
  }
}

// Cleanup on container shutdown
const lifecycleManager = getGlobalLifecycleManager();
await lifecycleManager.dispose(DatabaseService);
```

### Lifecycle Hooks

Listen to lifecycle events.

```typescript
import {
  LifecycleEventType,
  onGlobalLifecycleEvent,
} from '@machshop/extension-sdk/di';

// Listen to initialization
onGlobalLifecycleEvent(
  LifecycleEventType.INITIALIZED,
  (event) => {
    console.log(`Service ${event.token} initialized in ${event.duration}ms`);
  }
);

// Listen to disposal
onGlobalLifecycleEvent(
  LifecycleEventType.DISPOSED,
  (event) => {
    console.log(`Service ${event.token} disposed`);
  }
);

// Listen to all events
onAnyGlobalLifecycleEvent((event) => {
  console.log(`Lifecycle event: ${event.type} for ${event.token}`);
});
```

---

## Advanced Patterns

### Child Containers

Inherit parent services but override in child.

```typescript
const parentContainer = new ExtensionServiceContainer({ name: 'Parent' });
parentContainer.registerSingleton(ConfigService, config);

const childContainer = parentContainer.createChild('Child');
childContainer.registerClass(OrderService, OrderService);

// Child can resolve parent services
const config = childContainer.resolve(ConfigService);
```

### Factory with Dependencies

Factories can depend on other services.

```typescript
container.registerFactory(
  'MailService',
  (c) => {
    const config = c.resolve('ConfigService');
    return new MailService(config.smtpUrl);
  },
  'SINGLETON'
);
```

### Lazy Services

Services registered but not created until needed.

```typescript
container.registerClass(
  ExpensiveService,
  ExpensiveService,
  'SINGLETON'
);

// Service only created when first resolved
const service = container.resolve(ExpensiveService);
```

### Fluent Builder API

Create service factories with fluent API.

```typescript
import { ServiceFactoryBuilder } from '@machshop/extension-sdk/di';

const descriptor = new ServiceFactoryBuilder('Logger')
  .withCategory('infrastructure')
  .withVersion('1.0.0')
  .withDescription('Application logger')
  .withTags('logging', 'core')
  .withFactory(() => new Logger())
  .build();

locator.registerDescriptor(descriptor);
```

---

## Best Practices

### 1. Use Clear Tokens

```typescript
// Good: Class as token
container.registerClass(OrderService, OrderService);

// Good: Descriptive string token
container.registerFactory('mailService', (c) => new MailService());

// Avoid: Generic or unclear tokens
container.registerFactory('service1', factory);
```

### 2. Define Dependencies Explicitly

```typescript
// Good: Dependencies explicit
class OrderService {
  constructor(
    @Inject(DatabaseService) private db: DatabaseService,
    @Inject(LogService) private logger: LogService
  ) {}
}

// Avoid: Hidden dependencies
class OrderService {
  private db = new DatabaseService();
}
```

### 3. Use Appropriate Scopes

```typescript
// SINGLETON for stateless, shared services
container.registerClass(ConfigService, ConfigService, 'SINGLETON');

// TRANSIENT for stateful services
container.registerClass(RequestHandler, RequestHandler, 'TRANSIENT');

// EXTENSION_SCOPED for extension-specific instances
container.registerClass(
  ExtensionContext,
  ExtensionContext,
  'EXTENSION_SCOPED'
);
```

### 4. Implement Lifecycle Interfaces

```typescript
class DatabaseService implements IInitializable, IDisposable {
  async onInit() {
    // Initialize connections
  }

  async dispose() {
    // Close connections
  }
}
```

### 5. Validate Dependencies

```typescript
// On startup, validate no circular dependencies
const circularDeps = container.validateDependencies();
if (circularDeps.length > 0) {
  throw new Error(`Circular dependencies detected: ${circularDeps}`);
}
```

### 6. Use Service Locator for Discovery

```typescript
// For plugins or dynamic services
const locator = new ServiceLocator(container);
const coreServices = locator.findServices({ tags: ['core'] });
```

---

## API Reference

### ExtensionServiceContainer

Main DI container class.

```typescript
class ExtensionServiceContainer {
  registerSingleton<T>(token: ServiceToken<T>, instance: T): this;
  registerFactory<T>(token: ServiceToken<T>, factory: ServiceFactory<T>, scope?: ServiceScope): this;
  registerClass<T>(token: ServiceToken<T>, constructor: ServiceConstructor<T>, scope?: ServiceScope): this;

  resolve<T>(token: ServiceToken<T>): T;
  resolveAsync<T>(token: ServiceToken<T>): Promise<T>;

  has<T>(token: ServiceToken<T>): boolean;
  getRegistrations(): ServiceMetadata[];
  getMetadata(token: ServiceToken): ServiceMetadata | undefined;

  validateDependencies(): CircularDependency[];
  getStatistics(): { registeredServices: number; cachedSingletons: number; children: number; memoryUsage: string };

  createChild(name?: string): ExtensionServiceContainer;
  clear(): void;
}
```

### ServiceLocator

Service discovery and location.

```typescript
class ServiceLocator {
  getService<T>(token: ServiceToken<T>): T;
  getServiceAsync<T>(token: ServiceToken<T>): Promise<T>;
  hasService<T>(token: ServiceToken<T>): boolean;

  registerDescriptor(descriptor: ServiceDescriptor): void;
  findServices(query: ServiceQuery): ServiceDescriptor[];
  getDescriptor(token: ServiceToken): ServiceDescriptor | undefined;
  listDescriptors(): ServiceDescriptor[];
}
```

### ServiceLifecycleManager

Service lifecycle hooks and events.

```typescript
class ServiceLifecycleManager {
  onLifecycleEvent(eventType: LifecycleEventType, hook: LifecycleHook): () => void;
  onAnyLifecycleEvent(hook: LifecycleHook): () => void;

  registerInitializable(token: ServiceToken, service: IInitializable): void;
  registerDisposable(token: ServiceToken, service: IDisposable): void;

  async initialize(token: ServiceToken): Promise<void>;
  async dispose(token: ServiceToken): Promise<void>;
  async disposeAll(): Promise<void>;

  getEventHistory(filter?: { token?: ServiceToken; eventType?: LifecycleEventType; limit?: number }): LifecycleEvent[];
  getStatistics(): { totalInitializable: number; totalDisposable: number; eventCount: number };
}
```

---

## Examples

### Complete Extension Setup

```typescript
import {
  ExtensionServiceContainer,
  Service,
  Inject,
  getGlobalLifecycleManager,
} from '@machshop/extension-sdk/di';

// Define services
@Service({ category: 'data', tags: ['core'] })
class DatabaseService implements IInitializable {
  async onInit() {
    await this.connect();
  }

  private async connect() {
    // Connect to database
  }

  query(sql: string) {
    return { data: [] };
  }
}

@Service({ category: 'business' })
class OrderService {
  constructor(@Inject(DatabaseService) private db: DatabaseService) {}

  createOrder(data: any) {
    return this.db.query('INSERT INTO orders ...');
  }
}

// Setup container
export async function setupExtension() {
  const container = new ExtensionServiceContainer({
    name: 'MachShop.Orders',
  });

  // Register services
  container.registerClass(DatabaseService, DatabaseService, 'SINGLETON');
  container.registerClass(OrderService, OrderService, 'EXTENSION_SCOPED');

  // Initialize
  const lifecycle = getGlobalLifecycleManager();
  await lifecycle.initialize(DatabaseService);

  return container;
}

// Usage
const container = await setupExtension();
const orderService = container.resolve(OrderService);
const result = orderService.createOrder({ customerId: 123 });
```

---

## Troubleshooting

### Circular Dependency Error

```
Error: CircularDependencyError: A -> B -> C -> A
```

**Solution**: Refactor to use factory or property injection instead of constructor injection.

```typescript
// Before (circular)
class A {
  constructor(b: B) {}
}
class B {
  constructor(a: A) {}
}

// After (use factory or property)
class A {
  private b?: B;
  setB(b: B) { this.b = b; }
}
```

### Service Not Found

```
Error: ServiceNotFoundError: Service not found: MyService
```

**Solution**: Ensure service is registered before resolving.

```typescript
// Register
container.registerClass(MyService, MyService);

// Then resolve
const service = container.resolve(MyService);
```

### Resolution Timeout

```
Error: Resolution timeout after 30000ms
```

**Solution**: Check for async operations or increase timeout.

```typescript
const container = new ExtensionServiceContainer({
  resolutionTimeout: 60000, // 60 seconds
});
```

---

## Support

For questions or issues with DI container, refer to the Extension SDK documentation or contact the MachShop team.
