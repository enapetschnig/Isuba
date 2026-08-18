/* ISUBA — Service Worker: App-Shell offline verfügbar (Stall ohne Empfang) */
const CACHE = "isuba-v1";
const SHELL = ["./", "./index.html", "./css/style.css", "./js/data.js", "./js/app.js", "./assets/icon.svg", "./manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache zuerst, im Hintergrund aktualisieren (stale-while-revalidate)
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      const laden = fetch(e.request).then(antwort => {
        if (antwort && antwort.ok && new URL(e.request.url).origin === location.origin) {
          const kopie = antwort.clone();
          caches.open(CACHE).then(c => c.put(e.request, kopie));
        }
        return antwort;
      }).catch(() => hit);
      return hit || laden;
    })
  );
});
