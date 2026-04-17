var CACHE_NAME = 'sky-bounce-v25';
var ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/utils.js',
    './js/physics.js',
    './js/audio.js',
    './js/storage.js',
    './js/input.js',
    './js/ball.js',
    './js/obstacle.js',
    './js/collectible.js',
    './js/particles.js',
    './js/powerup.js',
    './js/achievements.js',
    './js/skins.js',
    './js/daily.js',
    './js/spawner.js',
    './js/background.js',
    './js/ui.js',
    './js/game.js',
    './js/main.js',
    './manifest.json'
];

self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(names) {
            return Promise.all(
                names.filter(function(n) { return n !== CACHE_NAME; })
                     .map(function(n) { return caches.delete(n); })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', function(e) {
    e.respondWith(
        caches.match(e.request).then(function(cached) {
            return cached || fetch(e.request);
        })
    );
});
