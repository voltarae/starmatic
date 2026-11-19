// Starmatic offline. After one visit the page, its fonts and its icons are kept on this device.
//  - The page itself is fetched fresh whenever there's a connection, so an update shows up the next
//    time the game is opened. With no connection, or a very slow one, the kept copy opens instead.
//  - Fonts, icons and the manifest are served from the kept copy and refreshed in the background.
// Your sky never passes through here: it lives in the browser's localStorage.
const CACHE = "goal-galaxy-shell-v1";
const SHELL = [
  "./",
  "manifest.webmanifest",
  "fonts/bebas-neue-latin-400-normal.woff2",
  "fonts/courier-prime-latin-400-normal.woff2",
  "fonts/courier-prime-latin-700-normal.woff2",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png"
];
const WAIT_MS = 4000;      // how long to wait for the network before opening the kept page

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("goal-galaxy-shell-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  const isPage = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html");
  e.respondWith(isPage ? page(req) : kept(req));
});

// The page: network first, the kept copy if that fails or takes too long.
async function page(req){
  const cache = await caches.open(CACHE);
  const net = fetch(req.url, {cache: "no-cache"}).then(r => { if (r.ok) cache.put("./", r.clone()); return r; });
  net.catch(() => {});
  try {
    const r = await Promise.race([net, new Promise(done => setTimeout(done, WAIT_MS, null))]);
    if (r && r.ok) return r;
  } catch (err) {}
  const copy = await cache.match("./");
  if (copy) return copy;
  return net.catch(() => new Response("Starmatic needs a connection the first time it opens.", {status: 503, headers: {"Content-Type": "text/plain"}}));
}
// Everything else: the kept copy right away, refreshed in the background.
async function kept(req){
  const cache = await caches.open(CACHE);
  const copy = await cache.match(req);
  const net = fetch(req).then(r => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
  return copy || (await net) || Response.error();
}
