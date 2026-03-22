self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          return caches.delete(key);
        })
      );
    }).then(() => {
      self.registration.unregister().then(() => {
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            if (client.url && "navigate" in client) {
              client.navigate(client.url);
            }
          });
        });
      });
    })
  );
});

self.addEventListener('fetch', (e) => {
  // Do nothing. This is just to satisfy the SW requirement and let the network handle it.
});
