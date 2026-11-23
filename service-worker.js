 
const CACHE_NAME = "netbill-app-v2";

const APP_FILES = [
    "./",
    "./index.html",
    "./dashboard.html",
    "./admin-login.html",
    "./customer-portal-login.html",
    "./manifest.json",
    "./robots.txt",
    "./sitemap.xml",
    "./netbill-icon-192.png",
    "./netbill-icon-512.png"
];

// INSTALL: Cache the main NetBill pages and essential files
self.addEventListener("install", (event) => {

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_FILES))
            .then(() => self.skipWaiting())
    );

});

// ACTIVATE: Remove older NetBill caches
self.addEventListener("activate", (event) => {

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {

                return Promise.all(
                    cacheNames
                        .filter((name) =>
                            name.startsWith("netbill-app-") &&
                            name !== CACHE_NAME
                        )
                        .map((name) => caches.delete(name))
                );

            })
            .then(() => self.clients.claim())
    );

});

// FETCH: Handle pages and application files
self.addEventListener("fetch", (event) => {

    const request = event.request;

    if (request.method !== "GET") return;

    const url = new URL(request.url);

    // Do not cache external services such as Supabase or payment providers
    if (url.origin !== self.location.origin) return;

    // NAVIGATION: Try the internet first, then the correct cached page
    if (request.mode === "navigate") {

        event.respondWith(

            fetch(request)
                .then((response) => {

                    if (response.ok) {

                        const copy = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => cache.put(request, copy));

                    }

                    return response;

                })
                .catch(async () => {

                    const cachedPage = await caches.match(
                        request,
                        { ignoreSearch: true }
                    );

                    if (cachedPage) return cachedPage;

                    return await caches.match("./index.html") ||
                        new Response(
                            "NetBill is currently offline. Please reconnect to the internet.",
                            {
                                status: 503,
                                headers: {
                                    "Content-Type": "text/plain"
                                }
                            }
                        );

                })

        );

        return;
    }

    // OTHER LOCAL FILES: Cache first, then internet
    event.respondWith(

        caches.match(request)
            .then((cachedResponse) => {

                if (cachedResponse) return cachedResponse;

                return fetch(request).then((response) => {

                    if (response.ok && response.type === "basic") {

                        const copy = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => cache.put(request, copy));

                    }

                    return response;

                });

            })

    );

});
