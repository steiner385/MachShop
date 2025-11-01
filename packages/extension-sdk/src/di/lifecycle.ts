/**
 * Service Lifecycle Management
 * Initialization, disposal, and lifecycle hooks for DI services
 * Issue #440: Service Locator & Dependency Injection Container
 */

import type { ServiceToken } from './types';

/**
 * Service lifecycle event types
 */
export enum LifecycleEventType {
  REGISTERED = 'REGISTERED',
  RESOLVING = 'RESOLVING',
  RESOLVED = 'RESOLVED',
  INITIALIZING = 'INITIALIZING',
  INITIALIZED = 'INITIALIZED',
  DISPOSING = 'DISPOSING',
  DISPOSED = 'DISPOSED',
  ERROR = 'ERROR',
}

/**
 * Service lifecycle event
 */
export interface LifecycleEvent {
  type: LifecycleEventType;
  token: ServiceToken;
  timestamp: Date;
  duration?: number;
  error?: Error;
  metadata?: Record<string, any>;
}

/**
 * Initializable service interface
 */
export interface IInitializable {
  /**
   * Called after service is instantiated
   */
  onInit?(): void | Promise<void>;
}

/**
 * Disposable service interface
 */
export interface IDisposable {
  /**
   * Called when container is disposed
   */
  dispose?(): void | Promise<void>;
}

/**
 * Service with lifecycle methods
 */
export interface ServiceWithLifecycle extends IInitializable, IDisposable {
  onInit?(): void | Promise<void>;
  dispose?(): void | Promise<void>;
}

/**
 * Lifecycle hook callback
 */
export type LifecycleHook = (event: LifecycleEvent) => void | Promise<void>;

/**
 * Service lifecycle manager
 */
export class ServiceLifecycleManager {
  private lifecycleHooks: Map<LifecycleEventType, LifecycleHook[]> = new Map();
  private disposables: Map<ServiceToken, IDisposable> = new Map();
  private initializables: Map<ServiceToken, IInitializable> = new Map();
  private eventHistory: LifecycleEvent[] = [];
  private maxHistorySize: number = 1000;

  /**
   * Register lifecycle hook
   */
  onLifecycleEvent(eventType: LifecycleEventType, hook: LifecycleHook): () => void {
    if (!this.lifecycleHooks.has(eventType)) {
      this.lifecycleHooks.set(eventType, []);
    }

    this.lifecycleHooks.get(eventType)!.push(hook);

    // Return unsubscribe function
    return () => {
      const hooks = this.lifecycleHooks.get(eventType);
      if (hooks) {
        const idx = hooks.indexOf(hook);
        if (idx > -1) {
          hooks.splice(idx, 1);
        }
      }
    };
  }

  /**
   * Register a hook for all lifecycle events
   */
  onAnyLifecycleEvent(hook: LifecycleHook): () => void {
    const unsubscribers: Array<() => void> = [];

    for (const eventType of Object.values(LifecycleEventType)) {
      unsubscribers.push(this.onLifecycleEvent(eventType, hook));
    }

    return () => unsubscribers.forEach((unsub) => unsub());
  }

  /**
   * Emit lifecycle event
   */
  async emitEvent(event: LifecycleEvent): Promise<void> {
    const hooks = this.lifecycleHooks.get(event.type) || [];

    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Call all hooks
    for (const hook of hooks) {
      try {
        await hook(event);
      } catch (error) {
        console.error(`Error in lifecycle hook for ${event.type}:`, error);
      }
    }
  }

  /**
   * Register service for initialization
   */
  registerInitializable(token: ServiceToken, service: IInitializable): void {
    this.initializables.set(token, service);
  }

  /**
   * Register service for disposal
   */
  registerDisposable(token: ServiceToken, service: IDisposable): void {
    this.disposables.set(token, service);
  }

  /**
   * Initialize service
   */
  async initialize(token: ServiceToken): Promise<void> {
    const service = this.initializables.get(token);
    if (!service?.onInit) {
      return;
    }

    const startTime = Date.now();
    try {
      await emitEvent({
        type: LifecycleEventType.INITIALIZING,
        token,
        timestamp: new Date(),
      });

      await service.onInit();

      await this.emitEvent({
        type: LifecycleEventType.INITIALIZED,
        token,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      });
    } catch (error) {
      await this.emitEvent({
        type: LifecycleEventType.ERROR,
        token,
        timestamp: new Date(),
        error: error as Error,
      });
      throw error;
    }
  }

  /**
   * Dispose service
   */
  async dispose(token: ServiceToken): Promise<void> {
    const service = this.disposables.get(token);
    if (!service?.dispose) {
      return;
    }

    const startTime = Date.now();
    try {
      await this.emitEvent({
        type: LifecycleEventType.DISPOSING,
        token,
        timestamp: new Date(),
      });

      await service.dispose();

      await this.emitEvent({
        type: LifecycleEventType.DISPOSED,
        token,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      });

      this.disposables.delete(token);
      this.initializables.delete(token);
    } catch (error) {
      await this.emitEvent({
        type: LifecycleEventType.ERROR,
        token,
        timestamp: new Date(),
        error: error as Error,
      });
      throw error;
    }
  }

  /**
   * Dispose all services
   */
  async disposeAll(): Promise<void> {
    const tokens = Array.from(this.disposables.keys());

    for (const token of tokens) {
      try {
        await this.dispose(token);
      } catch (error) {
        console.error(`Error disposing service ${String(token)}:`, error);
      }
    }
  }

  /**
   * Get lifecycle event history
   */
  getEventHistory(
    filter?: {
      token?: ServiceToken;
      eventType?: LifecycleEventType;
      limit?: number;
    }
  ): LifecycleEvent[] {
    let history = [...this.eventHistory];

    if (filter?.token) {
      history = history.filter((e) => e.token === filter.token);
    }

    if (filter?.eventType) {
      history = history.filter((e) => e.type === filter.eventType);
    }

    if (filter?.limit) {
      history = history.slice(-filter.limit);
    }

    return history;
  }

  /**
   * Clear event history
   */
  clearEventHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get lifecycle statistics
   */
  getStatistics(): {
    totalInitializable: number;
    totalDisposable: number;
    eventCount: number;
    lastEvent?: LifecycleEvent;
  } {
    return {
      totalInitializable: this.initializables.size,
      totalDisposable: this.disposables.size,
      eventCount: this.eventHistory.length,
      lastEvent: this.eventHistory[this.eventHistory.length - 1],
    };
  }

  /**
   * Check if service implements lifecycle interface
   */
  static isInitializable(obj: any): obj is IInitializable {
    return typeof obj?.onInit === 'function';
  }

  /**
   * Check if service implements disposable interface
   */
  static isDisposable(obj: any): obj is IDisposable {
    return typeof obj?.dispose === 'function';
  }
}

/**
 * Global event emitter
 */
const globalEmitter = new ServiceLifecycleManager();

/**
 * Access global lifecycle manager
 */
export function getGlobalLifecycleManager(): ServiceLifecycleManager {
  return globalEmitter;
}

/**
 * Convenience function to emit event globally
 */
export async function emitEvent(event: Partial<LifecycleEvent> & { type: LifecycleEventType; token: ServiceToken }): Promise<void> {
  await globalEmitter.emitEvent({
    timestamp: new Date(),
    ...event,
  } as LifecycleEvent);
}

/**
 * Hook into global lifecycle events
 */
export function onGlobalLifecycleEvent(eventType: LifecycleEventType, hook: LifecycleHook): () => void {
  return globalEmitter.onLifecycleEvent(eventType, hook);
}

/**
 * Hook into all global lifecycle events
 */
export function onAnyGlobalLifecycleEvent(hook: LifecycleHook): () => void {
  return globalEmitter.onAnyLifecycleEvent(hook);
}
