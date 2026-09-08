const CACHE = "rihla-offline-v1";
const OFFLINE = "/offline.html";
const ASSETS = [OFFLINE, "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("rihla-offline-") && key !== CACHE)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

// Cache only the public fallback. Accounts, recordings, APIs and RSC responses stay on the network.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () =>
      (await caches.match(OFFLINE)) || new Response("Offline", { status: 503 })));
  } else if (ASSETS.includes(url.pathname) && !url.search) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
});
