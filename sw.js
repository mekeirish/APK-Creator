const CACHE_NAME = 'APK-Creator-v2';
const CDN_URLS = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:opsz@14..32&display=swap'
];

// Installation : on cache les fichiers locaux + les CDN essentiels
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        const localFiles = [
          './index.html',
          './manifest.json',
          './icon.png',
          './bridge.js'
        ];
        const allFiles = [...localFiles, ...CDN_URLS];
        return cache.addAll(allFiles);
      })
      .catch(err => console.warn('Cache installation error:', err))
  );
  // Activer immédiatement le nouveau SW
  self.skipWaiting();
});

// Activation : on supprime les anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
  // Prendre le contrôle de tous les clients
  self.clients.claim();
});

// Interception : stratégie "Cache First" pour les CDN, puis réseau
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Pour les CDN (tailwind, fonts), on tente d'abord le cache, puis le réseau
  if (CDN_URLS.some(cdn => event.request.url.startsWith(cdn))) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) return response;
          return fetch(event.request).then(networkResponse => {
            // Mettre en cache la réponse pour la prochaine fois
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
            return networkResponse;
          });
        })
        .catch(() => {
          // Fallback en cas d'échec réseau (retourne une réponse vide)
          return new Response('', { status: 404, statusText: 'Not Found' });
        })
    );
    return;
  }

  // Pour tout le reste (fichiers locaux), stratégie classique : cache first, fallback réseau
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request).then(networkResponse => {
          // Mettre en cache les fichiers locaux pour la prochaine fois
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        });
      })
      .catch(() => {
        // Si hors ligne et aucune copie en cache, retourner une page d'erreur simple
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('', { status: 404, statusText: 'Not Found' });
      })
  );
});