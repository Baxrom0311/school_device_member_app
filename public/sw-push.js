/// <reference lib="webworker" />

// Push notification handler for service worker
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch (e) {
    // Malformed payload — show generic notification
    data = { title: 'School Device', body: 'New notification' }
  }

  const title = data.title || 'School Device'
  const options = {
    body: data.body || '',
    icon: '/vite.svg',
    badge: '/vite.svg',
    data: { url: data.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  // Validate URL is same-origin to prevent open redirect
  let targetUrl = '/'
  try {
    const parsed = new URL(url, self.location.origin)
    if (parsed.origin === self.location.origin) {
      targetUrl = parsed.pathname + parsed.search + parsed.hash
    }
  } catch (e) {
    // Invalid URL — fall back to root
  }

  event.waitUntil(self.clients.openWindow(targetUrl))
})
