/**
 * Service Worker: MachShop Mobile PWA
 * Phase 6: Mobile Scanning Interface - PWA Features
 *
 * Provides:
 * - Offline-first caching strategy
 * - Background sync for offline movements
 * - Push notifications
 * - Cache management
 */

const CACHE_NAME = 'machshop-v1';
const OFFLINE_FALLBACK_PAGE = '/offline.html';
const API_CACHE_NAME = 'machshop-api-v1';
const ASSETS_CACHE_NAME = 'machshop-assets-v1';

// Assets to precache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/materials/mobile-scanning',
  '/offline.html',
  '/manifest.json',
];

/**
 * Install event - precache assets
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(PRECACHE_ASSETS);
        console.log('[Service Worker] Precache complete');
      } catch (error) {
        console.error('[Service Worker] Installation failed:', error);
      }
    })()
  );

  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(
            (cacheName) =>
              cacheName !== CACHE_NAME &&
              cacheName !== API_CACHE_NAME &&
              cacheName !== ASSETS_CACHE_NAME
          )
          .map((cacheName) => {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );

      self.clients.claim();
      console.log('[Service Worker] Activation complete');
    })()
  );
});

/**
 * Fetch event - implement caching strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and non-HTTPS
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // API requests - network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets - cache first, fallback to network
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Documents - network first, fallback to cache
  event.respondWith(networkFirst(request));
});

/**
 * Network first strategy: Try network, fallback to cache
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[Service Worker] Network request failed, trying cache:', request.url);

    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Return offline fallback for navigation requests
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_FALLBACK_PAGE);
    }

    return new Response('Offline - content unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Cache first strategy: Try cache, fallback to network
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(ASSETS_CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[Service Worker] Cache and network failed:', request.url);
    return new Response('Offline - asset unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Check if URL is a static asset
 */
function isStaticAsset(pathname) {
  const assetExtensions = [
    '.js',
    '.css',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
  ];

  return assetExtensions.some((ext) => pathname.endsWith(ext));
}

/**
 * Background sync for offline movements
 */
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Sync event:', event.tag);

  if (event.tag === 'sync-movements') {
    event.waitUntil(syncOfflineMovements());
  }
});

/**
 * Sync offline movements
 */
async function syncOfflineMovements() {
  try {
    // Get pending items from IndexedDB or localStorage
    const pendingItems = getPendingSyncItems();

    for (const item of pendingItems) {
      try {
        const response = await fetch(item.endpoint, {
          method: item.operation === 'create' ? 'POST' : 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item.data),
        });

        if (response.ok) {
          markItemAsSynced(item.id);
          console.log('[Service Worker] Synced:', item.id);
        }
      } catch (error) {
        console.error('[Service Worker] Sync failed for item:', item.id, error);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Background sync error:', error);
    throw error; // Retry sync
  }
}

/**
 * Get pending sync items (stub - implement with IndexedDB in production)
 */
function getPendingSyncItems() {
  try {
    const queue = localStorage.getItem('movement_sync_queue');
    if (queue) {
      return JSON.parse(queue).filter((item) => item.status === 'pending');
    }
  } catch (error) {
    console.error('[Service Worker] Failed to parse sync queue:', error);
  }
  return [];
}

/**
 * Mark item as synced (stub - implement with IndexedDB in production)
 */
function markItemAsSynced(id) {
  try {
    const queue = localStorage.getItem('movement_sync_queue');
    if (queue) {
      const items = JSON.parse(queue);
      const updated = items.map((item) =>
        item.id === id ? { ...item, status: 'synced' } : item
      );
      localStorage.setItem('movement_sync_queue', JSON.stringify(updated));
    }
  } catch (error) {
    console.error('[Service Worker] Failed to update sync queue:', error);
  }
}

/**
 * Push notification handler
 */
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');

  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.body || 'MachShop notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: data.tag || 'machshop-notification',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'MachShop', options)
  );
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Look for an existing window/tab
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }

      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || '/');
      }
    })
  );
});

console.log('[Service Worker] Loaded and ready');
