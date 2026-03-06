const current = 20260306;
const versions = []

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(current).then(function (cache) {
            return cache.addAll([
                'https://cdn.jsdelivr.net/gh/cieszynski/dberta.js@0.0.1-beta/dberta.min.js',
                'css/article.css',
                'css/dialogs.css',
                'css/header.css',
                'css/table.css',
                'fonts/fira-sans-600.woff2',
                'fonts/fira-sans-italic.woff2',
                'fonts/fira-sans-regular.woff2',
                'fonts/segoeuithis-webfont.woff2',
                'icons/192x192.png',
                'icons/256x256.png',
                'icons/512x512.png',
                'images/bfw-logo.jpg',
                'index.html',
                'main.js',
                'manifest.json',
                'sw.js',
                'utils.js'
            ]);
        }),
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames
                    .filter(function (cacheName) {
                        // Return true if you want to remove this cache,
                        // but remember that caches are shared across
                        // the whole origin
                        console.info(cacheName)
                        return versions.includes(cacheName);
                    })
                    .map(function (cacheName) {
                        return caches.delete(cacheName);
                    }),
            );
        }),
    );
});

self.addEventListener('fetch', function (event) {
    event.respondWith(
        caches.open(current).then(function (cache) {
            return cache.match(event.request).then(function (response) {
                return (
                    response ||
                    fetch(event.request).then(function (response) {
                        cache.put(event.request, response.clone());
                        return response;
                    })
                );
            });
        }),
    );
});