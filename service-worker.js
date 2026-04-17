/* ============================================================
   Kaza Namazı Takip — Service Worker
   Strateji: Cache-First (çevrimdışı öncelikli)
============================================================ */

const CACHE_NAME    = 'kaza-takip-v1';
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './ikon.png',
    /* CDN kaynakları — çevrimdışı yedek için önbelleğe alınır */
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js'
];

/* ----------------------------------------------------------
   INSTALL: Statik dosyaları önbelleğe al
---------------------------------------------------------- */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

/* ----------------------------------------------------------
   ACTIVATE: Eski önbellekleri temizle
---------------------------------------------------------- */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

/* ----------------------------------------------------------
   FETCH: Cache-First stratejisi
   1. Önbellekte varsa oradan sun
   2. Yoksa ağdan çek ve önbelleğe ekle
   3. Ağ da yoksa (offline) önbellekten sun
---------------------------------------------------------- */
self.addEventListener('fetch', event => {
    /* Sadece GET isteklerini yönet */
    if (event.request.method !== 'GET') return;

    /* chrome-extension veya diğer şemaları atla */
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then(networkResponse => {
                /* Geçerli yanıtı önbelleğe ekle */
                if (
                    networkResponse &&
                    networkResponse.status === 200 &&
                    networkResponse.type !== 'opaque'
                ) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                /* Ağ yok ve önbellekte yok — index.html sun (SPA fallback) */
                return caches.match('./index.html');
            });
        })
    );
});
