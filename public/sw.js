// This is a basic service worker for PWA caching
// It's registered in the app layout

const CACHE_NAME = "beton-erp-v2";
const STATIC_ASSETS = ["/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("fetch", (event) => {
  // Skip API calls — don't cache dynamic data
  if (event.request.url.includes("/api/")) return;
  // Страниците винаги от мрежата — зависят от сесията/ролята и могат да пренасочват
  // (кеширан redirect за навигация дава ERR_FAILED)
  if (event.request.mode === "navigate") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response.ok && response.type === "basic" && !response.redirected) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
