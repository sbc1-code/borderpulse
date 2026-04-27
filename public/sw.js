const CACHE_NAME = 'borderpulse-v2';

// App shell files to pre-cache on install
const APP_SHELL = [
  '/',
  '/index.html',
  '/favicon.svg',
];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('borderpulse-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Handle notification clicks — open or focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // If the app is already open, focus it
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow('/');
    })
  );
});

// Fetch: route requests to the right strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // Data files: network-first with 3s timeout, fall back to cache
  if (url.pathname.startsWith('/data/') && url.pathname.endsWith('.json')) {
    event.respondWith(networkFirstWithTimeout(request, 3000));
    return;
  }

  // Navigation requests: network-first, fall back to cached index.html (SPA routing)
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  // Static assets (JS, CSS, images): cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Everything else: network-first, no special timeout
  event.respondWith(networkFirstWithTimeout(request, 5000));
});

// --- Strategies ---

// Network-first with a timeout. If the network fails or is too slow, serve from cache.
function networkFirstWithTimeout(request, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;

    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        caches.match(request).then((cached) => {
          resolve(cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' }));
        });
      }
    }, timeoutMs);

    fetch(request)
      .then((response) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          resolve(response);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          caches.match(request).then((cached) => {
            resolve(cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' }));
          });
        }
      });
  });
}

// Cache-first: serve from cache if available, otherwise fetch and cache
function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      return response;
    });
  });
}

// Navigation handler: try network, fall back to cached /index.html for SPA routing
function navigationHandler(request) {
  return fetch(request)
    .then((response) => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      return response;
    })
    .catch(() => caches.match('/index.html'));
}

// Check if a path looks like a static asset
function isStaticAsset(pathname) {
  return /\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname);
}
