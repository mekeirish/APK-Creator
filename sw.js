const CACHE_NAME = 'APK-Creator-v1';
const CDN_URLS = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:opsz@14..32&display=swap'
];

// Installation : on cache les fichiers locaux + les CDN essentiels
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // 1. Fichiers locaux
        const localFiles = ['./index.html', './manifest.json', './icon.png'];
        // 2. On ajoute les CDN (attention : ils peuvent être volumineux)
        const allFiles = [...localFiles, ...CDN_URLS];
        return cache.addAll(allFiles);
      })
      .catch(err => console.warn('Cache installation error:', err))
  );
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
});

// Interception : stratégie "Cache First" pour les CDN, puis réseau
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Pour les CDN (tailwind, fonts), on tente d'abord le cache, puis le réseau
  if (CDN_URLS.some(cdn => event.request.url.startsWith(cdn))) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
    return;
  }

  // Pour tout le reste (fichiers locaux), stratégie classique
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});