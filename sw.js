// Service worker til Rejsebudget.
// index.html hentes altid netværk-først, så nye funktioner (som lommeregner-tastaturet)
// vises med det samme, næste gang I åbner appen med forbindelse — ingen dobbelt-genstart nødvendig.
// Kun ikoner/manifest caches (skifter sjældent), til hurtig opstart og offline-brug.
// Data fra Supabase caches ALDRIG her (det klarer index.html selv via localStorage).
const CACHE = "rejsebudget-shell-v2";
const SHELL = ["./manifest.json", "./icon-192.png", "./icon-512.png"];

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

  const isAppShellHtml =
    e.request.mode === "navigate" ||
    url.pathname.endsWith("index.html") ||
    url.pathname.endsWith("/");

  if (isAppShellHtml) {
    // Netværk-først for selve appen: I ser altid nyeste version med det samme,
    // og falder kun tilbage til den gemte version hvis I er offline.
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-først for ikoner/manifest — skifter sjældent, skal loade hurtigt.
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
