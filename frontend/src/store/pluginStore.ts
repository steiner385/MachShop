/**
 * Plugin Management Store (Issue #75 Phase 5)
 *
 * Zustand store for managing plugin state, lifecycle, and webhooks.
 * Handles data fetching, caching, and state updates for admin dashboard.
 */

import { create } from 'zustand';

interface Plugin {
  id: string;
  pluginId: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  status: 'PENDING_APPROVAL' | 'INSTALLED' | 'ACTIVE' | 'DISABLED' | 'FAILED' | 'UNINSTALLED';
  isActive: boolean;
  installedAt: string;
  installedBy: string;
  manifest: Record<string, any>;
  configuration?: Record<string, any>;
  packageUrl: string;
}

interface PluginWebhook {
  id: string;
  pluginId: string;
  eventType: string;
  webhookUrl: string;
  secret: string;
  maxRetries: number;
  isActive: boolean;
  lastTriggeredAt?: string;
  successCount: number;
  failureCount: number;
  failedDeliveries?: any[];
}

interface PluginExecution {
  id: string;
  pluginId: string;
  hookPoint: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  status: 'STARTED' | 'COMPLETED' | 'FAILED' | 'TIMEOUT' | 'REJECTED';
  errorMessage?: string;
  errorStack?: string;
  inputData?: Record<string, any>;
  outputData?: Record<string, any>;
}

interface EventBusStats {
  totalSubscriptions: number;
  channelsWithHandlers: number;
  channels: Record<string, number>;
}

interface WebhookQueueStats {
  totalQueued: number;
  pluginQueues: Record<string, number>;
}

interface PluginStoreState {
  // Plugin management
  plugins: Plugin[];
  selectedPlugin: Plugin | null;
  isLoadingPlugins: boolean;
  pluginError: string | null;
  loadPlugins: (filters?: Record<string, any>) => Promise<void>;
  getPlugin: (id: string) => Promise<void>;
  setSelectedPlugin: (plugin: Plugin | null) => void;

  // Plugin lifecycle
  installPlugin: (manifest: Record<string, any>, packageUrl: string) => Promise<void>;
  approvePlugin: (pluginId: string) => Promise<void>;
  activatePlugin: (pluginId: string) => Promise<void>;
  deactivatePlugin: (pluginId: string) => Promise<void>;
  uninstallPlugin: (pluginId: string) => Promise<void>;

  // Plugin configuration
  updatePluginConfiguration: (pluginId: string, configuration: Record<string, any>) => Promise<void>;

  // Webhooks
  webhooks: PluginWebhook[];
  isLoadingWebhooks: boolean;
  loadWebhooks: (pluginId: string) => Promise<void>;
  registerWebhook: (pluginId: string, eventType: string, webhookUrl: string, secret: string) => Promise<void>;
  unregisterWebhook: (pluginId: string, webhookId: string) => Promise<void>;
  testWebhook: (pluginId: string, webhookId: string) => Promise<void>;
  retryWebhook: (pluginId: string, webhookId: string) => Promise<void>;

  // Executions
  executions: PluginExecution[];
  isLoadingExecutions: boolean;
  loadExecutions: (pluginId: string, hookPoint?: string) => Promise<void>;

  // Event Bus and Queue Stats
  eventBusStats: EventBusStats | null;
  webhookQueueStats: WebhookQueueStats | null;
  isLoadingStats: boolean;
  loadEventBusStats: () => Promise<void>;

  // Clear state
  clearSelectedPlugin: () => void;
  clearError: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const usePluginStore = create<PluginStoreState>((set, get) => ({
  // Initial state
  plugins: [],
  selectedPlugin: null,
  isLoadingPlugins: false,
  pluginError: null,
  webhooks: [],
  isLoadingWebhooks: false,
  executions: [],
  isLoadingExecutions: false,
  eventBusStats: null,
  webhookQueueStats: null,
  isLoadingStats: false,

  // Plugin management
  loadPlugins: async (filters?: Record<string, any>) => {
    set({ isLoadingPlugins: true, pluginError: null });
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, String(value));
          }
        });
      }

      const response = await fetch(
        `${API_BASE}/admin/plugins?${params.toString()}`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (!response.ok) throw new Error(`Failed to load plugins: ${response.statusText}`);

      const data = await response.json();
      set({ plugins: data.data || [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load plugins';
      set({ pluginError: message });
    } finally {
      set({ isLoadingPlugins: false });
    }
  },

  getPlugin: async (id: string) => {
    set({ isLoadingPlugins: true, pluginError: null });
    try {
      const response = await fetch(`${API_BASE}/admin/plugins/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error(`Failed to load plugin: ${response.statusText}`);

      const data = await response.json();
      set({ selectedPlugin: data.data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load plugin';
      set({ pluginError: message });
    } finally {
      set({ isLoadingPlugins: false });
    }
  },

  setSelectedPlugin: (plugin) => set({ selectedPlugin: plugin }),

  // Plugin lifecycle
  installPlugin: async (manifest, packageUrl) => {
    set({ pluginError: null });
    try {
      const response = await fetch(`${API_BASE}/admin/plugins/install`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ manifest, packageUrl }),
      });

      if (!response.ok) throw new Error(`Failed to install plugin: ${response.statusText}`);

      await get().loadPlugins();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to install plugin';
      set({ pluginError: message });
      throw error;
    }
  },

  approvePlugin: async (pluginId) => {
    set({ pluginError: null });
    try {
      const plugin = get().plugins.find((p) => p.pluginId === pluginId);
      if (!plugin) throw new Error('Plugin not found');

      const response = await fetch(`${API_BASE}/admin/plugins/${plugin.id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error(`Failed to approve plugin: ${response.statusText}`);

      await get().loadPlugins();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve plugin';
      set({ pluginError: message });
      throw error;
    }
  },

  activatePlugin: async (pluginId) => {
    set({ pluginError: null });
    try {
      const plugin = get().plugins.find((p) => p.pluginId === pluginId);
      if (!plugin) throw new Error('Plugin not found');

      const response = await fetch(`${API_BASE}/admin/plugins/${plugin.id}/activate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error(`Failed to activate plugin: ${response.statusText}`);

      await get().loadPlugins();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to activate plugin';
      set({ pluginError: message });
      throw error;
    }
  },

  deactivatePlugin: async (pluginId) => {
    set({ pluginError: null });
    try {
      const plugin = get().plugins.find((p) => p.pluginId === pluginId);
      if (!plugin) throw new Error('Plugin not found');

      const response = await fetch(`${API_BASE}/admin/plugins/${plugin.id}/deactivate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error(`Failed to deactivate plugin: ${response.statusText}`);

      await get().loadPlugins();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to deactivate plugin';
      set({ pluginError: message });
      throw error;
    }
  },

  uninstallPlugin: async (pluginId) => {
    set({ pluginError: null });
    try {
      const plugin = get().plugins.find((p) => p.pluginId === pluginId);
      if (!plugin) throw new Error('Plugin not found');

      const response = await fetch(`${API_BASE}/admin/plugins/${plugin.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error(`Failed to uninstall plugin: ${response.statusText}`);

      await get().loadPlugins();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to uninstall plugin';
      set({ pluginError: message });
      throw error;
    }
  },

  // Configuration
  updatePluginConfiguration: async (pluginId, configuration) => {
    set({ pluginError: null });
    try {
      const plugin = get().plugins.find((p) => p.pluginId === pluginId);
      if (!plugin) throw new Error('Plugin not found');

      const response = await fetch(`${API_BASE}/admin/plugins/${plugin.id}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ configuration }),
      });

      if (!response.ok) throw new Error(`Failed to update configuration: ${response.statusText}`);

      await get().getPlugin(plugin.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update configuration';
      set({ pluginError: message });
      throw error;
    }
  },

  // Webhooks
  loadWebhooks: async (pluginId) => {
    set({ isLoadingWebhooks: true });
    try {
      const plugin = get().plugins.find((p) => p.pluginId === pluginId);
      if (!plugin) throw new Error('Plugin not found');

      const response = await fetch(`${API_BASE}/admin/plugins/${plugin.id}/webhooks`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error(`Failed to load webhooks: ${response.statusText}`);

      const data = await response.json();
      set({ webhooks: data.data || [] });
    } catch (error) {
      console.error('Failed to load webhooks:', error);
    } finally {
      set({ isLoadingWebhooks: false });
    }
  },

  registerWebhook: async (pluginId, eventType, webhookUrl, secret) => {
    set({ pluginError: null });
    try {
      const plugin = get().plugins.find((p) => p.pluginId === pluginId);
      if (!plugin) throw new Error('Plugin not found');

      const response = await fetch(`${API_BASE}/admin/plugins/${plugin.id}/webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ eventType, webhookUrl, secret }),
      });

      if (!response.ok) throw new Error(`Failed to register webhook: ${response.statusText}`);

      await get().loadWebhooks(pluginId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to register webhook';
      set({ pluginError: message });
      throw error;
    }
  },

  unregisterWebhook: async (pluginId, webhookId) => {
    set({ pluginError: null });
    try {
      const plugin = get().plugins.find((p) => p.pluginId === pluginId);
      if (!plugin) throw new Error('Plugin not found');

      const response = await fetch(
        `${API_BASE}/admin/plugins/${plugin.id}/webhooks/${webhookId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (!response.ok) throw new Error(`Failed to unregister webhook: ${response.statusText}`);

      await get().loadWebhooks(pluginId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to unregister webhook';
      set({ pluginError: message });
      throw error;
    }
  },

  testWebhook: async (pluginId, webhookId) => {
    set({ pluginError: null });
    try {
      const plugin = get().plugins.find((p) => p.pluginId === pluginId);
      if (!plugin) throw new Error('Plugin not found');

      const response = await fetch(
        `${API_BASE}/admin/plugins/${plugin.id}/webhooks/${webhookId}/test`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (!response.ok) throw new Error(`Failed to test webhook: ${response.statusText}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to test webhook';
      set({ pluginError: message });
      throw error;
    }
  },

  retryWebhook: async (pluginId, webhookId) => {
    set({ pluginError: null });
    try {
      const plugin = get().plugins.find((p) => p.pluginId === pluginId);
      if (!plugin) throw new Error('Plugin not found');

      const response = await fetch(
        `${API_BASE}/admin/plugins/${plugin.id}/webhooks/${webhookId}/retry`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (!response.ok) throw new Error(`Failed to retry webhook: ${response.statusText}`);

      await get().loadWebhooks(pluginId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to retry webhook';
      set({ pluginError: message });
      throw error;
    }
  },

  // Executions
  loadExecutions: async (pluginId, hookPoint?) => {
    set({ isLoadingExecutions: true });
    try {
      const plugin = get().plugins.find((p) => p.pluginId === pluginId);
      if (!plugin) throw new Error('Plugin not found');

      const params = new URLSearchParams();
      if (hookPoint) params.append('hookPoint', hookPoint);

      const response = await fetch(
        `${API_BASE}/admin/plugins/${plugin.id}/executions?${params.toString()}`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (!response.ok) throw new Error(`Failed to load executions: ${response.statusText}`);

      const data = await response.json();
      set({ executions: data.data || [] });
    } catch (error) {
      console.error('Failed to load executions:', error);
    } finally {
      set({ isLoadingExecutions: false });
    }
  },

  // Event Bus Stats
  loadEventBusStats: async () => {
    set({ isLoadingStats: true });
    try {
      const response = await fetch(`${API_BASE}/admin/plugins/events/stats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error(`Failed to load stats: ${response.statusText}`);

      const data = await response.json();
      set({
        eventBusStats: data.data.eventBus,
        webhookQueueStats: data.data.webhookQueue,
      });
    } catch (error) {
      console.error('Failed to load event bus stats:', error);
    } finally {
      set({ isLoadingStats: false });
    }
  },

  // Utilities
  clearSelectedPlugin: () => set({ selectedPlugin: null }),
  clearError: () => set({ pluginError: null }),
}));
