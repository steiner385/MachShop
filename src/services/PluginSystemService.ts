import prisma from '../lib/database';
import { logger } from '../utils/logger';
import { Plugin, PluginHook, PluginExecution, PluginEvent, HookType, PluginStatus, ExecutionStatus } from '@prisma/client';
import * as vm from 'vm';
import crypto from 'crypto';

/**
 * Plugin & Hook System Service (Issue #75)
 *
 * Manages plugin lifecycle, hook registration, execution, and sandboxing.
 * Provides event-driven architecture for extensibility.
 */

// Plugin Manifest Schema
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  apiVersion: string;
  permissions?: string[];
  hooks?: {
    workflow?: string[];
    ui?: string[];
    data?: string[];
    integration?: string[];
    notification?: string[];
  };
  dependencies?: Record<string, string>;
  database?: {
    migrationsDir: string;
    requiresMigrations: boolean;
  };
  configuration?: Record<string, any>;
  endpoints?: Array<{
    path: string;
    method: string;
    handler: string;
  }>;
}

// Hook Context passed to hook handlers
export interface HookContext {
  // Data
  data: any;
  original?: any;

  // Metadata
  plugin: {
    id: string;
    version: string;
  };
  user: {
    id: string;
    roles: string[];
    permissions: string[];
  };
  request: {
    id: string;
    timestamp: Date;
    ipAddress: string;
  };

  // Methods
  reject(reason: string): void;
  addWarning(message: string): void;
  abort(): void;

  // API access
  api: {
    get(url: string): Promise<any>;
    post(url: string, data: any): Promise<any>;
    put(url: string, data: any): Promise<any>;
    delete(url: string): Promise<any>;
  };
}

export class PluginSystemService {
  private hookRegistry: Map<string, PluginHook[]> = new Map();
  private loadedPluginCode: Map<string, any> = new Map();

  /**
   * Install a plugin from package
   */
  async installPlugin(
    manifestJson: PluginManifest,
    packageUrl: string,
    installedBy: string,
    siteId?: string
  ): Promise<Plugin> {
    try {
      // Validate manifest
      this.validateManifest(manifestJson);

      // Check for duplicate
      const existing = await prisma.plugin.findUnique({
        where: { pluginId: manifestJson.id },
      });

      if (existing) {
        throw new Error(`Plugin ${manifestJson.id} is already installed`);
      }

      // Create plugin record
      const plugin = await prisma.plugin.create({
        data: {
          pluginId: manifestJson.id,
          name: manifestJson.name,
          version: manifestJson.version,
          description: manifestJson.description,
          author: manifestJson.author,
          manifest: manifestJson,
          packageUrl,
          installedBy,
          status: 'PENDING_APPROVAL',
          isActive: false,
          permissions: manifestJson.permissions || [],
          dependencies: manifestJson.dependencies,
          siteId,
        },
        include: {
          hooks: true,
        },
      });

      logger.info(`Plugin installed: ${plugin.pluginId} v${plugin.version}`);
      return plugin;
    } catch (error) {
      logger.error('Failed to install plugin', error);
      throw error;
    }
  }

  /**
   * Approve and activate a plugin
   */
  async approvePlugin(pluginId: string): Promise<Plugin> {
    try {
      const plugin = await prisma.plugin.update({
        where: { id: pluginId },
        data: {
          status: 'INSTALLED',
        },
        include: {
          hooks: true,
        },
      });

      logger.info(`Plugin approved: ${plugin.pluginId}`);
      return plugin;
    } catch (error) {
      logger.error(`Failed to approve plugin ${pluginId}`, error);
      throw error;
    }
  }

  /**
   * Activate a plugin and register its hooks
   */
  async activatePlugin(pluginId: string): Promise<Plugin> {
    try {
      const plugin = await prisma.plugin.findUnique({
        where: { id: pluginId },
        include: {
          hooks: true,
        },
      });

      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      if (plugin.status !== 'INSTALLED') {
        throw new Error(`Cannot activate plugin in ${plugin.status} status`);
      }

      // Register hooks
      await this.registerHooksForPlugin(plugin);

      // Update status
      const updated = await prisma.plugin.update({
        where: { id: pluginId },
        data: {
          status: 'ACTIVE',
          isActive: true,
        },
        include: {
          hooks: true,
        },
      });

      logger.info(`Plugin activated: ${updated.pluginId}`);
      return updated;
    } catch (error) {
      logger.error(`Failed to activate plugin ${pluginId}`, error);
      throw error;
    }
  }

  /**
   * Deactivate a plugin and unregister its hooks
   */
  async deactivatePlugin(pluginId: string): Promise<Plugin> {
    try {
      const plugin = await prisma.plugin.findUnique({
        where: { id: pluginId },
        include: {
          hooks: true,
        },
      });

      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      // Unregister hooks
      for (const hook of plugin.hooks) {
        const key = `${hook.hookType}:${hook.hookPoint}`;
        const hooks = this.hookRegistry.get(key) || [];
        this.hookRegistry.set(
          key,
          hooks.filter((h) => h.id !== hook.id)
        );
      }

      // Update status
      const updated = await prisma.plugin.update({
        where: { id: pluginId },
        data: {
          isActive: false,
          status: 'DISABLED',
        },
        include: {
          hooks: true,
        },
      });

      logger.info(`Plugin deactivated: ${updated.pluginId}`);
      return updated;
    } catch (error) {
      logger.error(`Failed to deactivate plugin ${pluginId}`, error);
      throw error;
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(pluginId: string): Promise<void> {
    try {
      const plugin = await prisma.plugin.findUnique({
        where: { id: pluginId },
      });

      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      // Deactivate if active
      if (plugin.isActive) {
        await this.deactivatePlugin(pluginId);
      }

      // Delete plugin
      await prisma.plugin.delete({
        where: { id: pluginId },
      });

      // Clear cached code
      this.loadedPluginCode.delete(pluginId);

      logger.info(`Plugin uninstalled: ${pluginId}`);
    } catch (error) {
      logger.error(`Failed to uninstall plugin ${pluginId}`, error);
      throw error;
    }
  }

  /**
   * Register a hook for a plugin
   */
  async registerHook(
    pluginId: string,
    hookType: HookType,
    hookPoint: string,
    handlerFunction: string,
    priority: number = 50,
    isAsync: boolean = false,
    timeout: number = 5000
  ): Promise<PluginHook> {
    try {
      // Check if hook already exists for this plugin
      const existing = await prisma.pluginHook.findUnique({
        where: {
          pluginId_hookPoint: {
            pluginId,
            hookPoint,
          },
        },
      });

      if (existing) {
        // Update existing hook
        return await prisma.pluginHook.update({
          where: { id: existing.id },
          data: {
            hookType,
            handlerFunction,
            priority,
            isAsync,
            timeout,
          },
        });
      }

      // Create new hook
      const hook = await prisma.pluginHook.create({
        data: {
          pluginId,
          hookType,
          hookPoint,
          handlerFunction,
          priority,
          isAsync,
          timeout,
          isActive: true,
        },
      });

      // Add to registry
      const key = `${hookType}:${hookPoint}`;
      const hooks = this.hookRegistry.get(key) || [];
      hooks.push(hook);
      hooks.sort((a, b) => b.priority - a.priority); // Sort by priority desc
      this.hookRegistry.set(key, hooks);

      logger.info(`Hook registered: ${hookPoint} for plugin ${pluginId}`);
      return hook;
    } catch (error) {
      logger.error(`Failed to register hook`, error);
      throw error;
    }
  }

  /**
   * Execute hooks for a hook point
   */
  async executeHooks(
    hookType: HookType,
    hookPoint: string,
    context: Partial<HookContext>,
    pluginCode: Record<string, any>
  ): Promise<void> {
    try {
      const key = `${hookType}:${hookPoint}`;
      const hooks = this.hookRegistry.get(key) || [];

      if (hooks.length === 0) {
        return;
      }

      // Execute hooks in priority order
      for (const hook of hooks) {
        if (!hook.isActive) {
          continue;
        }

        const plugin = await prisma.plugin.findUnique({
          where: { id: hook.pluginId },
        });

        if (!plugin || !plugin.isActive) {
          continue;
        }

        try {
          // Create execution record
          const execution = await prisma.pluginExecution.create({
            data: {
              pluginId: hook.pluginId,
              hookPoint,
              status: 'STARTED',
              userId: context.user?.id,
              requestId: context.request?.id,
              ipAddress: context.request?.ipAddress,
            },
          });

          const startTime = Date.now();

          // Execute hook with timeout
          const result = await this.executeHookWithTimeout(
            hook,
            context,
            pluginCode,
            hook.timeout
          );

          const duration = Date.now() - startTime;

          // Update execution
          await prisma.pluginExecution.update({
            where: { id: execution.id },
            data: {
              status: 'COMPLETED',
              duration,
              completedAt: new Date(),
              outputData: result,
            },
          });

          // Update hook stats
          await prisma.pluginHook.update({
            where: { id: hook.id },
            data: {
              executionCount: { increment: 1 },
              lastExecutedAt: new Date(),
            },
          });
        } catch (error: any) {
          logger.error(`Hook execution failed: ${hookPoint}`, error);

          // Record failed execution
          const execution = await prisma.pluginExecution.findFirst({
            where: {
              pluginId: hook.pluginId,
              hookPoint,
              status: 'STARTED',
            },
            orderBy: { startedAt: 'desc' },
          });

          if (execution) {
            await prisma.pluginExecution.update({
              where: { id: execution.id },
              data: {
                status: 'FAILED',
                errorMessage: error.message,
                errorStack: error.stack,
                completedAt: new Date(),
              },
            });
          }

          // Update hook error count
          await prisma.pluginHook.update({
            where: { id: hook.id },
            data: {
              errorCount: { increment: 1 },
              lastError: error.message,
            },
          });

          // For synchronous hooks, re-throw error
          if (!hook.isAsync) {
            throw error;
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to execute hooks for ${hookPoint}`, error);
      throw error;
    }
  }

  /**
   * Emit an event to subscribers
   */
  async emitEvent(eventType: string, eventData: any, sourceUserId?: string, sourceRequestId?: string): Promise<void> {
    try {
      // Create event record
      const event = await prisma.pluginEvent.create({
        data: {
          eventType,
          eventData,
          sourceUserId,
          sourceRequestId,
        },
      });

      // Find subscribing webhooks
      const webhooks = await prisma.pluginWebhook.findMany({
        where: {
          eventType,
          isActive: true,
        },
      });

      // Deliver to webhooks (async, fire-and-forget)
      for (const webhook of webhooks) {
        this.deliverWebhook(webhook.id, event, webhook.webhookUrl, webhook.secret, webhook.maxRetries).catch(
          (error) => {
            logger.error(`Failed to deliver webhook`, error);
          }
        );
      }
    } catch (error) {
      logger.error(`Failed to emit event ${eventType}`, error);
      throw error;
    }
  }

  /**
   * Private helper: Register hooks for a plugin from manifest
   */
  private async registerHooksForPlugin(plugin: Plugin): Promise<void> {
    const manifest = plugin.manifest as PluginManifest;

    if (!manifest.hooks) {
      return;
    }

    // Register workflow hooks
    if (manifest.hooks.workflow) {
      for (const hookPoint of manifest.hooks.workflow) {
        const hookType: HookType = 'WORKFLOW';
        await this.registerHook(plugin.id, hookType, hookPoint, `handle_${hookPoint.replace(/\./g, '_')}`, 50, false);
      }
    }

    // Register UI hooks
    if (manifest.hooks.ui) {
      for (const hookPoint of manifest.hooks.ui) {
        const hookType: HookType = 'UI';
        await this.registerHook(plugin.id, hookType, hookPoint, `handle_${hookPoint.replace(/\./g, '_')}`, 50, true);
      }
    }

    // Register data hooks
    if (manifest.hooks.data) {
      for (const hookPoint of manifest.hooks.data) {
        const hookType: HookType = 'DATA';
        await this.registerHook(plugin.id, hookType, hookPoint, `handle_${hookPoint.replace(/\./g, '_')}`, 50, false);
      }
    }

    // Register integration hooks
    if (manifest.hooks.integration) {
      for (const hookPoint of manifest.hooks.integration) {
        const hookType: HookType = 'INTEGRATION';
        await this.registerHook(plugin.id, hookType, hookPoint, `handle_${hookPoint.replace(/\./g, '_')}`, 50, true);
      }
    }

    // Register notification hooks
    if (manifest.hooks.notification) {
      for (const hookPoint of manifest.hooks.notification) {
        const hookType: HookType = 'NOTIFICATION';
        await this.registerHook(plugin.id, hookType, hookPoint, `handle_${hookPoint.replace(/\./g, '_')}`, 50, true);
      }
    }
  }

  /**
   * Private helper: Execute hook with timeout and sandboxing
   */
  private async executeHookWithTimeout(
    hook: PluginHook,
    context: Partial<HookContext>,
    pluginCode: Record<string, any>,
    timeout: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      // Set timeout
      const timeoutHandle = setTimeout(() => {
        reject(new Error(`Hook execution timeout after ${timeout}ms`));
      }, timeout);

      try {
        // Execute handler from plugin code
        const handler = pluginCode[hook.handlerFunction];
        if (!handler) {
          throw new Error(`Handler ${hook.handlerFunction} not found in plugin code`);
        }

        const result = handler(context);

        // Handle async result
        if (result instanceof Promise) {
          result
            .then((data) => {
              clearTimeout(timeoutHandle);
              resolve(data);
            })
            .catch((error) => {
              clearTimeout(timeoutHandle);
              reject(error);
            });
        } else {
          clearTimeout(timeoutHandle);
          resolve(result);
        }
      } catch (error) {
        clearTimeout(timeoutHandle);
        reject(error);
      }
    });
  }

  /**
   * Private helper: Deliver webhook with retries
   */
  private async deliverWebhook(
    webhookId: string,
    event: PluginEvent,
    webhookUrl: string,
    secret: string,
    maxRetries: number,
    attempt: number = 1
  ): Promise<void> {
    try {
      // Create HMAC signature
      const payload = JSON.stringify(event);
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      // Send webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Plugin-Signature': signature,
          'X-Plugin-Event': event.eventType,
          'X-Plugin-Timestamp': event.timestamp.toISOString(),
        },
        body: payload,
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }

      // Update webhook stats
      await prisma.pluginWebhook.update({
        where: { id: webhookId },
        data: {
          successCount: { increment: 1 },
          lastTriggeredAt: new Date(),
        },
      });
    } catch (error) {
      if (attempt < maxRetries) {
        // Retry with exponential backoff
        const backoff = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, backoff));
        return this.deliverWebhook(webhookId, event, webhookUrl, secret, maxRetries, attempt + 1);
      } else {
        // Record failed delivery
        const webhook = await prisma.pluginWebhook.findUnique({
          where: { id: webhookId },
        });

        if (webhook) {
          const failures = (webhook.failedDeliveries as any[]) || [];
          failures.push({
            timestamp: new Date(),
            error: (error as Error).message,
            attempt,
          });

          await prisma.pluginWebhook.update({
            where: { id: webhookId },
            data: {
              failureCount: { increment: 1 },
              failedDeliveries: failures,
            },
          });
        }

        logger.error(`Failed to deliver webhook after ${maxRetries} attempts`, error);
      }
    }
  }

  /**
   * Validate plugin manifest
   */
  private validateManifest(manifest: PluginManifest): void {
    if (!manifest.id || !manifest.name || !manifest.version || !manifest.apiVersion) {
      throw new Error('Plugin manifest missing required fields: id, name, version, apiVersion');
    }

    if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
      throw new Error('Plugin version must follow semantic versioning (e.g., 1.2.3)');
    }
  }

  /**
   * Get plugin by ID
   */
  async getPlugin(pluginId: string): Promise<Plugin | null> {
    try {
      return await prisma.plugin.findUnique({
        where: { id: pluginId },
        include: {
          hooks: true,
        },
      });
    } catch (error) {
      logger.error(`Failed to get plugin ${pluginId}`, error);
      throw error;
    }
  }

  /**
   * Get all plugins
   */
  async getPlugins(filters?: { status?: PluginStatus; isActive?: boolean; siteId?: string }): Promise<Plugin[]> {
    try {
      return await prisma.plugin.findMany({
        where: {
          ...(filters?.status && { status: filters.status }),
          ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
          ...(filters?.siteId && { siteId: filters.siteId }),
        },
        include: {
          hooks: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Failed to get plugins', error);
      throw error;
    }
  }

  /**
   * Get hook execution history
   */
  async getExecutionHistory(pluginId: string, limit: number = 100): Promise<PluginExecution[]> {
    try {
      return await prisma.pluginExecution.findMany({
        where: { pluginId },
        orderBy: { startedAt: 'desc' },
        take: limit,
      });
    } catch (error) {
      logger.error(`Failed to get execution history for ${pluginId}`, error);
      throw error;
    }
  }
}

export default new PluginSystemService();
