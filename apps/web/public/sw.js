/* eslint-env serviceworker */
/**
 * sw.js — service worker de la coquille web (B4a).
 *
 * Stratégies :
 *   - navigation (HTML)  → réseau d'abord, repli sur le cache puis sur
 *                          /index.html (SPA : toute URL profonde rend l'app).
 *   - assets fingerprintés (/assets/*) → cache d'abord (immuables).
 *   - le reste (API, Supabase, PowerSync) → JAMAIS mis en cache : la donnée
 *     passe par PowerSync/SQLite, pas par le SW (AD-7 : une seule vérité
 *     locale, jamais une copie HTTP périmée).
 *
 * Bump CACHE_VERSION à chaque changement de stratégie pour purger l'ancien.
 */
const CACHE_VERSION = 'aurora-web-v1';
const CACHE_NAME = CACHE_VERSION;
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Origine différente (Supabase / relay PowerSync) → on ne touche à rien.
  if (url.origin !== self.location.origin) return;

  // Navigation : réseau d'abord, repli cache, puis coquille.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match('/index.html'))
            .then((fallback) => fallback || Response.error()),
        ),
    );
    return;
  }

  // Assets fingerprintés : cache d'abord.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
            return response;
          }),
      ),
    );
  }
});
