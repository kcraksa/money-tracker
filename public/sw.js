// Service worker minimal: shell aplikasi + layar Catat tetap bisa dibuka tanpa sinyal.
const STATIC = "mt-static-v1";
const PAGES = "mt-pages-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => ![STATIC, PAGES].includes(k)).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Aset statik: cache-first (nama file ber-hash, aman).
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(STATIC).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Halaman Catat: network-first, simpan salinan terakhir untuk mode offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          // Jangan simpan hasil redirect (mis. halaman login saat sesi habis).
          if (url.pathname === "/catat" && res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put("/catat", copy));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match("/catat");
          return (
            cached ||
            new Response("<h1>Sedang offline</h1><p>Buka lagi saat ada sinyal.</p>", {
              headers: { "content-type": "text/html; charset=utf-8" },
              status: 503,
            })
          );
        }),
    );
  }
});
