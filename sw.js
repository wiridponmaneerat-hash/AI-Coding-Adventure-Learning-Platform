/* AI Coding Adventure — Service Worker v1.0.0 */
'use strict';

const CACHE_NAME   = 'aca-v1.0.1';
const STATIC_CACHE = 'aca-static-v1.0.1';

/* Assets to pre-cache on install */
const PRECACHE_ASSETS = [
  '/AI-Coding-Adventure-Learning-Platform/',
  '/AI-Coding-Adventure-Learning-Platform/index.html',
  '/AI-Coding-Adventure-Learning-Platform/pages/login.html',
  '/AI-Coding-Adventure-Learning-Platform/styles/globals.css',
  '/AI-Coding-Adventure-Learning-Platform/styles/auth.css',
  '/AI-Coding-Adventure-Learning-Platform/styles/home.css',
  '/AI-Coding-Adventure-Learning-Platform/config/app-config.js',
  '/AI-Coding-Adventure-Learning-Platform/services/api.js',
  '/AI-Coding-Adventure-Learning-Platform/services/auth-service.js',
  '/AI-Coding-Adventure-Learning-Platform/scripts/auth.js',
  '/AI-Coding-Adventure-Learning-Platform/assets/favicon.svg',
  '/AI-Coding-Adventure-Learning-Platform/manifest.json',
];

/* ─── Install ─── */
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* ─── Activate — purge old caches ─── */
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== STATIC_CACHE && k !== CACHE_NAME; })
            .map(function (k)   { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* ─── Fetch strategy ─── */
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);

  /* GAS API calls — network only, no caching */
  if (url.hostname === 'script.google.com') {
    e.respondWith(fetch(e.request));
    return;
  }

  /* Google Fonts — stale-while-revalidate */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(CACHE_NAME).then(function (cache) {
        return cache.match(e.request).then(function (cached) {
          var network = fetch(e.request).then(function (resp) {
            cache.put(e.request, resp.clone());
            return resp;
          });
          return cached || network;
        });
      })
    );
    return;
  }

  /* CDN JS (GSAP, Chart.js) — cache-first with network fallback */
  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(
      caches.open(CACHE_NAME).then(function (cache) {
        return cache.match(e.request).then(function (cached) {
          if (cached) return cached;
          return fetch(e.request).then(function (resp) {
            cache.put(e.request, resp.clone());
            return resp;
          });
        });
      })
    );
    return;
  }

  /* Same-origin static assets — cache-first */
  if (url.origin === self.location.origin && e.request.method === 'GET') {
    e.respondWith(
      caches.open(STATIC_CACHE).then(function (cache) {
        return cache.match(e.request).then(function (cached) {
          if (cached) return cached;
          return fetch(e.request).then(function (resp) {
            if (resp.ok) cache.put(e.request, resp.clone());
            return resp;
          }).catch(function () {
            /* Offline fallback for HTML pages */
            if (e.request.destination === 'document') {
              return cache.match('/AI-Coding-Adventure-Learning-Platform/index.html');
            }
          });
        });
      })
    );
    return;
  }

  e.respondWith(fetch(e.request));
});
