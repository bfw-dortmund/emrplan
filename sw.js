const version = 'v2';
const old_versions = ['v1']

/* const addResourcesToCache = async (resources) => {
    const cache = await caches.open(version);
    await cache.addAll(resources);
};

self.addEventListener("install", (event) => {
    event.waitUntil(
        addResourcesToCache([
            "./",
            "./index.html",
        ])
    )
}); */

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
                        return old_versions.includes(cacheName);
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
        caches.open(version).then(function (cache) {
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