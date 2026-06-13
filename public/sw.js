/// <reference lib="webworker" />

const CACHE_NAME = 'smartbell-v1';
const OFFLINE_URL = '/offline.html';

// Assets to pre-cache on install
const PRECACHE = [OFFLINE_URL];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET and API/WS requests
  if (request.method !== 'GET') return;
  if (request.url.includes('/api/') || request.url.includes('/ws/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful navigation and asset responses
        if (response.ok && (request.mode === 'navigate' || request.destination === 'script' || request.destination === 'style')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback
        if (request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        return caches.match(request);
      })
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch (e) { data = { title: 'SmartBell', body: 'Yangi xabar' }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'SmartBell', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  let targetUrl = '/';
  try {
    const parsed = new URL(url, self.location.origin);
    if (parsed.origin === self.location.origin) targetUrl = parsed.pathname;
  } catch (e) {}
  event.waitUntil(self.clients.openWindow(targetUrl));
});
