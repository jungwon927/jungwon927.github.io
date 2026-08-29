// 오프라인에서도 열리도록 앱 파일을 캐시에 담아 둡니다.
// 온라인이면 새 파일을 먼저 받아오고, 느리거나 끊기면 캐시로 넘어갑니다.
var CACHE = "parking-v5";
var NET_TIMEOUT = 2500;
var SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/faces/sprite.png?v=2"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(SHELL);
  }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  if (new URL(req.url).origin !== self.location.origin) {
    e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req); }));
    return;
  }

  e.respondWith(caches.open(CACHE).then(function (cache) {
    return cache.match(req, { ignoreSearch: true }).then(function (cached) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(function () { return null; });

      var timer = new Promise(function (done) { setTimeout(function () { done(null); }, NET_TIMEOUT); });

      return Promise.race([net, timer]).then(function (fast) {
        if (fast) return fast;
        if (cached) return cached;
        return net.then(function (late) {
          return late || cache.match("./index.html");
        });
      });
    });
  }));
});
