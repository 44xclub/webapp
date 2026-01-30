// 44CLUB Blocks Service Worker
const CACHE_NAME = '44club-blocks-v4';
const OFFLINE_URL = '/offline.html';

// Assets to cache on install (minimal - only static assets)
const PRECACHE_ASSETS = [
  '/manifest.json',
];

// Install event - clear all caches and cache only minimal assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    // Clear ALL caches first
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Service Worker: Clearing cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return caches.open(CACHE_NAME).then((cache) => {
        console.log('Service Worker: Caching minimal assets');
        return cache.addAll(PRECACHE_ASSETS);
      });
    })
  );
  // Force immediate activation
  self.skipWaiting();
});

// Activate event - clean up and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Clear any remaining old caches
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('Service Worker: Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - network only for JS bundles, network-first for others
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API, auth, and Supabase requests
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('supabase') ||
    event.request.url.includes('/auth/')
  ) {
    return;
  }

  // NEVER cache Next.js JavaScript bundles - always fetch fresh
  if (event.request.url.includes('/_next/')) {
    return;
  }

  // For navigation requests, always go to network
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // For other requests, use network-first strategy
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache static assets (images, fonts, etc)
        if (response.status === 200 &&
            (event.request.url.includes('/icons/') ||
             event.request.url.includes('/manifest.json'))) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
      })
  );
});

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'New notification from 44CLUB',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/app',
      },
    };

    event.waitUntil(
      self.registration.showNotification(data.title || '44CLUB Blocks', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
