/**
 * Custom Hook: useOfflineSync
 * Provides offline-first synchronization with automatic queue management
 * Persists data to localStorage and syncs when connection is restored
 * Phase 6: Mobile Scanning Interface - PWA Features
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface SyncItem<T = any> {
  id: string;
  operation: 'create' | 'update' | 'delete';
  endpoint: string;
  data: T;
  timestamp: Date;
  retries: number;
  lastError?: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}

export interface SyncOptions {
  storageKey?: string;
  maxRetries?: number;
  retryDelay?: number;
  autoSync?: boolean;
}

/**
 * Custom hook for offline-first data synchronization
 * Manages queue of items to sync when connection is restored
 */
export const useOfflineSync = <T = any>(options: SyncOptions = {}) => {
  const {
    storageKey = 'app_sync_queue',
    maxRetries = 3,
    retryDelay = 5000,
    autoSync = true,
  } = options;

  const [queue, setQueue] = useState<SyncItem<T>[]>([]);
  const [isSyncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStats, setSyncStats] = useState({
    totalQueued: 0,
    totalSynced: 0,
    totalFailed: 0,
  });

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Load queue from localStorage on mount
   */
  useEffect(() => {
    const loadQueue = () => {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const items = JSON.parse(stored) as SyncItem<T>[];
          // Restore Date objects
          items.forEach((item) => {
            item.timestamp = new Date(item.timestamp);
          });
          setQueue(items);
          setSyncStats({
            totalQueued: items.length,
            totalSynced: items.filter((i) => i.status === 'synced').length,
            totalFailed: items.filter((i) => i.status === 'failed').length,
          });
        }
      } catch (error) {
        console.error('Failed to load sync queue:', error);
      }
    };

    loadQueue();
  }, [storageKey]);

  /**
   * Detect online/offline status
   */
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Auto-sync when coming back online
   */
  useEffect(() => {
    if (isOnline && autoSync && queue.some((item) => item.status === 'pending')) {
      syncQueue();
    }
  }, [isOnline, autoSync]);

  /**
   * Persist queue to localStorage
   */
  const persistQueue = useCallback(
    (items: SyncItem<T>[]) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(items));
      } catch (error) {
        console.error('Failed to persist sync queue:', error);
      }
    },
    [storageKey]
  );

  /**
   * Add item to sync queue
   */
  const addToQueue = useCallback(
    (operation: 'create' | 'update' | 'delete', endpoint: string, data: T) => {
      const item: SyncItem<T> = {
        id: `${endpoint}-${Date.now()}`,
        operation,
        endpoint,
        data,
        timestamp: new Date(),
        retries: 0,
        status: isOnline ? 'pending' : 'pending',
      };

      const newQueue = [item, ...queue];
      setQueue(newQueue);
      persistQueue(newQueue);
      setSyncStats((prev) => ({
        ...prev,
        totalQueued: prev.totalQueued + 1,
      }));

      // Try to sync immediately if online
      if (isOnline) {
        syncQueue([item]);
      }

      return item;
    },
    [queue, isOnline, persistQueue]
  );

  /**
   * Sync a specific item or entire queue
   */
  const syncItem = useCallback(
    async (item: SyncItem<T>): Promise<boolean> => {
      try {
        const method = item.operation === 'delete' ? 'DELETE' : item.operation === 'create' ? 'POST' : 'PUT';

        const response = await fetch(item.endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: method !== 'DELETE' ? JSON.stringify(item.data) : undefined,
        });

        if (response.ok) {
          return true;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Sync error for ${item.id}:`, errorMessage);
        return false;
      }
    },
    []
  );

  /**
   * Sync entire queue
   */
  const syncQueue = useCallback(
    async (itemsToSync?: SyncItem<T>[]) => {
      if (isSyncing || !isOnline) return;

      setSyncing(true);
      const items = itemsToSync || queue;
      const pendingItems = items.filter((i) => i.status !== 'synced');

      if (pendingItems.length === 0) {
        setSyncing(false);
        return;
      }

      let synced = 0;
      let failed = 0;

      for (const item of pendingItems) {
        if (item.retries >= maxRetries) {
          // Mark as failed and skip
          setQueue((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, status: 'failed' as const, lastError: 'Max retries reached' }
                : i
            )
          );
          failed++;
          continue;
        }

        const success = await syncItem(item);

        if (success) {
          // Mark as synced
          setQueue((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, status: 'synced' as const, retries: i.retries + 1 }
                : i
            )
          );
          synced++;
        } else {
          // Increment retry counter
          setQueue((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, retries: i.retries + 1 }
                : i
            )
          );
          failed++;
        }

        // Throttle requests
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Update stats and persist
      setQueue((prev) => {
        const updated = prev;
        persistQueue(updated);
        setSyncStats((s) => ({
          ...s,
          totalSynced: s.totalSynced + synced,
          totalFailed: s.totalFailed + failed,
        }));
        return updated;
      });

      setLastSyncTime(new Date());
      setSyncing(false);
    },
    [queue, isSyncing, isOnline, maxRetries, syncItem, persistQueue]
  );

  /**
   * Clear queue
   */
  const clearQueue = useCallback(() => {
    setQueue([]);
    persistQueue([]);
    setSyncStats({ totalQueued: 0, totalSynced: 0, totalFailed: 0 });
  }, [persistQueue]);

  /**
   * Remove item from queue
   */
  const removeFromQueue = useCallback(
    (id: string) => {
      const updated = queue.filter((item) => item.id !== id);
      setQueue(updated);
      persistQueue(updated);
    },
    [queue, persistQueue]
  );

  /**
   * Retry failed items
   */
  const retryFailed = useCallback(() => {
    setQueue((prev) =>
      prev.map((item) =>
        item.status === 'failed' ? { ...item, status: 'pending' as const, retries: 0 } : item
      )
    );
    syncQueue();
  }, [syncQueue]);

  return {
    // State
    queue,
    isSyncing,
    isOnline,
    lastSyncTime,
    syncStats,
    pendingCount: queue.filter((i) => i.status === 'pending').length,
    failedCount: queue.filter((i) => i.status === 'failed').length,

    // Methods
    addToQueue,
    syncQueue,
    syncItem,
    clearQueue,
    removeFromQueue,
    retryFailed,
  };
};

export default useOfflineSync;
