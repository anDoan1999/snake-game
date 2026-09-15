'use strict';

// Change VERSION whenever any application file changes. One cache holds one complete release.
const VERSION = '2026-09-14-1';
const BASE = new URL(self.registration.scope);
const CACHE_PREFIX = 'snake-pwa:' + BASE.href + ':';
const CACHE_NAME = CACHE_PREFIX + VERSION;
const FILES = [
  'index.html', 'pwa.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png', 'icons/icon.svg'
];
const URLS = FILES.map(file => new URL(file, BASE).href);
const INDEX = new URL('index.html', BASE).href;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache =>
    cache.addAll(URLS.map(url => new Request(url, { cache: 'reload' })))
  ));
  // Keep an existing game open on its current release; activate after all old clients close.
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== BASE.origin) return;
  url.search = '';
  const key = request.mode === 'navigate' && url.href === BASE.href ? INDEX : url.href;
  if (!URLS.includes(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    return await cache.match(key) || fetch(request);
  })());
});
