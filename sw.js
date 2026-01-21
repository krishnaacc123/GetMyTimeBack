const CACHE_NAME = 'focus-retro-v8';
const urlsToCache = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@400;700&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (!event.action) {
    // User clicked the notification body, focus the window
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('/');
      })
    );
    return;
  }

  // Handle buttons
  const actionType = event.action === 'stop' ? 'STOP_TIMER' : 'TAKE_BREAK';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Send message to open windows
      clientList.forEach(client => {
        client.postMessage({ type: actionType });
      });
      // Also bring app to front
      if (clientList.length > 0) return clientList[0].focus();
    })
  );
});