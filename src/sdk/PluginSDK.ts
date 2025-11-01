/**
 * Plugin SDK (Issue #75)
 *
 * Provides interface for plugin developers to interact with MES system.
 * Defines hook registration, configuration access, and API calling patterns.
 */

import { HookContext } from '../services/PluginSystemService';

export class PluginSDK {
  private pluginId: string;
  private apiKey: string;
  private hooks: Map<string, (context: HookContext) => Promise<void>> = new Map();
  private config: Record<string, any> = {};

  constructor(pluginId: string, apiKey: string) {
    this.pluginId = pluginId;
    this.apiKey = apiKey;
  }

  /**
   * Register a hook handler
   *
   * @example
   * plugin.registerHook('workOrder.beforeCreate', async (context) => {
   *   if (context.data.priority === 'CRITICAL') {
   *     const result = await context.api.post('/api/v1/quality/ncr', {
   *       workOrderId: context.data.id,
   *       description: 'Critical work order requires quality review'
   *     });
   *   }
   * });
   */
  registerHook(hookPoint: string, handler: (context: HookContext) => Promise<void>): void {
    this.hooks.set(hookPoint, handler);
  }

  /**
   * Unregister a hook handler
   */
  unregisterHook(hookPoint: string): void {
    this.hooks.delete(hookPoint);
  }

  /**
   * Get configuration value for this plugin
   */
  async getConfig(key: string): Promise<any> {
    return this.config[key];
  }

  /**
   * Set configuration value for this plugin
   */
  async setConfig(key: string, value: any): Promise<void> {
    this.config[key] = value;
    // In real implementation, this would persist to database
  }

  /**
   * Load configuration from database
   */
  async loadConfiguration(): Promise<void> {
    // In real implementation, this would fetch from PluginConfiguration table
  }

  /**
   * Emit a custom event for subscribers
   */
  async emit(eventType: string, data: any): Promise<void> {
    // In real implementation, this would call emitEvent on PluginSystemService
  }

  /**
   * Subscribe to events
   */
  async subscribe(eventType: string, handler: (event: any) => void): Promise<void> {
    // In real implementation, this would register webhook or subscribe to event bus
  }

  /**
   * Make authenticated API call to MES backend
   */
  async api(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, data?: any): Promise<any> {
    const url = `http://localhost:3000${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Plugin-ID': this.pluginId,
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get plugin-specific storage (key-value)
   */
  async getStorage(key: string): Promise<any> {
    // In real implementation, would use plugin-specific storage table
    return null;
  }

  /**
   * Set plugin-specific storage value
   */
  async setStorage(key: string, value: any): Promise<void> {
    // In real implementation, would persist to plugin storage table
  }

  /**
   * Log message from plugin
   */
  log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${this.pluginId}] [${level.toUpperCase()}] ${message}`;

    if (level === 'error') {
      console.error(logEntry, data);
    } else if (level === 'warn') {
      console.warn(logEntry, data);
    } else {
      console.log(logEntry, data);
    }
  }

  /**
   * Get all registered hooks (for debugging/testing)
   */
  getRegisteredHooks(): string[] {
    return Array.from(this.hooks.keys());
  }
}

/**
 * Plugin development helper - Example plugin structure
 */
export const createPlugin = (manifest: any) => {
  return {
    manifest,
    handlers: {} as Record<string, any>,
    register: function(hookPoint: string, handler: any) {
      const handlerName = `handle_${hookPoint.replace(/\./g, '_')}`;
      this.handlers[handlerName] = handler;
    },
  };
};

export default PluginSDK;
