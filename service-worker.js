
const CACHE_NAME = "netbill-app-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./netbill-icon-192.png",
  "./netbill-icon-512.png"
];

// Install NetBill and cache essential files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

// Activate the new service worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith("netbill-app-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Handle page and file requests
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache Supabase, payment, SMS or other external requests
  if (url.origin !== self.location.origin) return;

  // Load pages from the network first, then use cached NetBill
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put("./index.html", copy);
            });
          }
          return response;
        })
        .catch(async () => {
          return await caches.match("./index.html") ||
                 new Response("NetBill is currently offline.", {
                   status: 503,
                   headers: { "Content-Type": "text/plain" }
                 });
        })
    );
    return;
  }

  // Cache-first for local application files
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, copy);
          });
        }
        return response;
      });
    })
  );
});
