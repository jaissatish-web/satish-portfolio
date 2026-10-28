/* SJ Hub Service Worker — offline-first shell + runtime cache.
   Scope: /satish-portfolio/ (GitHub Pages subpath). Version-cache everything
   with the build date so stale formulas are never served after an update. */
const VERSION = 'sj-hub-v20261028c';
const BASE = '/satish-portfolio/';
const PRECACHE = [
  BASE,
  BASE + 'assets/css/redesign.css?v=20261028c',
  BASE + 'assets/js/hub.js?v=20261028c',
  BASE + 'assets/js/redesign.js?v=20261028c',
  BASE + 'assets/js/engineering-math.js?v=1',
  BASE + 'assets/js/engineering-tools.js?v=1',
  BASE + 'assets/js/hub-tools.js?v=20261028c',
  BASE + 'assets/data/tools.json',
  BASE + 'assets/data/field-tools.json',
  BASE + 'manifest.webmanifest',
  BASE + 'assets/icons/icon-192.png',
  BASE + 'assets/icons/icon-512.png',
  BASE + 'assets/icons/icon-512-maskable.png',
  // Highest-use calculators + the P0 field tools, pre-warmed for the field.
  BASE + 'tools/ma-converter.html',
  BASE + 'tools/dp-flow-simulator.html',
  BASE + 'tools/loop-checklist.html',
  BASE + 'tools/unit-converter.html',
  BASE + 'tools/valve-cv.html',
  BASE + 'tools/ma-loop-fault-finder.html',
  BASE + 'tools/rtd-tc-reference.html',
  BASE + 'tools/hart-command-reference.html',
  BASE + 'tools/isa-tag-builder.html',
  BASE + 'tools/io-spares-calculator.html',
  BASE + 'tools/punch-list-generator.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!url.origin) return;
  // Only handle requests inside the site scope.
  if (url.pathname.indexOf(BASE) !== 0) return;

  // App shell / fingerprinted assets: cache-first, fall back to network.
  if (req.destination === 'script' || req.destination === 'style' || req.destination === 'font' ||
      req.destination === 'image' || url.pathname.endsWith('.webmanifest')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((cache) => cache.put(req, copy));
        return res;
      }))
    );
    return;
  }
  // Documents: network-first with cache fallback (fresh formulas, offline capability).
  event.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((cache) => cache.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match(BASE)))
  );
});
