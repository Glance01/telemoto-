// TeleMoto+ Service Worker with Web Push & Background Notification Engine
const CACHE_NAME = 'telemoto-cache-v6';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

// Network-first strategy with cache fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept dev server, hot module reload, or API requests
  if (
    event.request.method !== 'GET' ||
    url.pathname.includes('/@') ||
    url.pathname.includes('/src/') ||
    url.pathname.includes('/node_modules/') ||
    url.search.includes('v=') ||
    url.search.includes('t=') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Handle incoming Web Push events from server / FCM / Web Push protocol
self.addEventListener('push', (event) => {
  let data = {
    title: 'TeleMoto+ Moçambique',
    body: 'Tens uma nova notificação importante na tua conta TeleMoto+.',
    icon: '/icon-192.png',
    badge: '/favicon.svg',
    tag: 'telemoto-push-' + Date.now(),
    url: '/',
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/favicon.svg',
    tag: data.tag || 'telemoto-general',
    vibrate: [300, 100, 300, 100, 300],
    data: data.data || { url: data.url || '/' },
    requireInteraction: true,
    renotify: true,
    actions: [
      { action: 'open_app', title: 'Abrir App' },
      { action: 'close', title: 'Dispensar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

// Handle direct message triggers from client/background worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    const notificationOptions = {
      body: options?.body || 'Nova atualização no TeleMoto+',
      icon: options?.icon || '/icon-192.png',
      badge: options?.badge || '/favicon.svg',
      tag: options?.tag || 'telemoto-bg-notif-' + Date.now(),
      vibrate: options?.vibrate || [300, 100, 300],
      data: options?.data || { url: '/' },
      requireInteraction: true,
      renotify: true,
      actions: [
        { action: 'open_app', title: 'Abrir TeleMoto+' },
        { action: 'close', title: 'Fechar' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title || 'TeleMoto+', notificationOptions)
    );
  }
});

// Handle clicking on notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
