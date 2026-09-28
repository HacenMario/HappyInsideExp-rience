// Happy inside expérience - Service Worker
// (1) PWA offline shell/network-first fetch handling
// (2) Background Web Push notifications
const CACHE_NAME = "hiex-cache-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Clean old caches
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

/* ---------------- Fetch: network-first with offline fallback ----------------
   Keeps the site installable as a PWA: navigations fall back to a minimal
   offline page, static assets fall back to their cache. Non-GET and API
   calls always hit the network (never cached). */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // always live data

  // Navigations: network first, then cache, then minimal offline page
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          return fresh;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(req);
          return (
            cached ||
            new Response(
              `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
               <meta name="viewport" content="width=device-width,initial-scale=1">
               <title>Happy inside expérience</title>
               <style>body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#f8f4ec;color:#1c1917;margin:0}
               .c{text-align:center;padding:2rem}h1{font-size:1.3rem}p{color:#57534e;font-size:.9rem}</style></head>
               <body><div class="c"><h1>لا يوجد اتصال بالإنترنت</h1>
               <p>أنت غير متصل حالياً — Happy inside expérience<br>Vous êtes hors ligne — reconnectez-vous puis réessayez.</p></div></body></html>`,
              { headers: { "Content-Type": "text/html; charset=utf-8" } }
            )
          );
        }
      })()
    );
    return;
  }

  // Static assets: stale-while-revalidate
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/logo.svg"
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })()
    );
  }
});

/* ---------------- Web Push ---------------- */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = {};
  }

  // Detect language from browser UI language, fallback to Arabic
  const lang = (self.navigator && self.navigator.language || "ar").startsWith("fr") ? "fr" : "ar";
  const title = (lang === "fr" ? payload.titleFr : payload.titleAr) || "Happy inside expérience";
  const body = (lang === "fr" ? payload.bodyFr : payload.bodyAr) || "";
  const link = payload.link || "/";

  const options = {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    vibrate: [100, 50, 100],
    data: { link },
    dir: lang === "ar" ? "rtl" : "ltr",
    lang,
    tag: "hiex-notification",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      return self.clients.openWindow(link);
    })
  );
});
