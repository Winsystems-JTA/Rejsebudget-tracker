// Service worker til Rejsebudget — cacher kun app-skallen (HTML/CSS/JS/ikoner),
// så appen kan åbne selv med dårlig forbindelse. Data fra Supabase caches ALDRIG
// her (det klarer index.html selv via localStorage), så I ser altid friske tal
// så snart der er forbindelse.
const CACHE = "rejsebudget-shell-v1";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Lad ALT mod Supabase (data, kurser, sync) gå direkte til nettet — aldrig cache.
  if (url.hostname.endsWith("supabase.co")) return;
  if (e.request.method !== "GET") return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
