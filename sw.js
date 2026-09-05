const CACHE_NAME = "teacher-manager-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
];

// Resolve base path dynamically from the worker's scope so the app works in subfolders.
const BASE = new URL("./", self.registration.scope).href;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(APP_SHELL.map((p) => new URL(p, BASE).href)).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// HTML navigations: network-first (auto-updates when new version is deployed), falls back to cache offline.
// Other same-origin GET assets: cache-first with network fallback (mainly hashed build files).
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  const isNav = e.request.mode === "navigate";
  if (isNav) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(e.request).then((cached) => cached || caches.match(new URL("./", BASE).href)))
    );
    return;
  }
  // Never cache app data requests; the app stores data in localStorage.
  e.respondWith(
    caches.match(e.request).then(
      (cached) =>
        cached ||
        fetch(e.request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, copy)).catch(() => {});
            return res;
          })
          .catch(() => caches.match(new URL("./", BASE).href))
    )
  );
});