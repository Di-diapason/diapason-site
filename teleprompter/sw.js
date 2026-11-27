// Service worker só do /teleprompter: depois de aberto uma vez, a página e as fontes funcionam sem internet.
const CACHE = "tp-v2";
const ARQUIVOS = [
  "/teleprompter/",
  "/teleprompter/controle/",
  "/teleprompter/qr.js",
  "/fonts/montserrat-normal-400-800-latin.woff2",
  "/fonts/lato-normal-400-latin.woff2",
  "/fonts/lato-normal-400-latin-ext.woff2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(ARQUIVOS.map((u) =>
    fetch(u, { credentials: "same-origin" }).then((r) => { if (r.ok && !r.redirected) return c.put(u, r); }).catch(() => {})
  ))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("tp-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function cuida(url) {
  if (url.origin !== location.origin) return false;
  if (url.pathname.startsWith("/fonts/")) return true;
  return url.pathname.startsWith("/teleprompter/") && !url.pathname.startsWith("/teleprompter/sala/") && !url.pathname.includes("_entrar") && !url.pathname.startsWith("/teleprompter/convite");
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!cuida(url)) return;
  const chave = url.origin + url.pathname; // sem query
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const r = await fetch(req, { signal: ctrl.signal });
      clearTimeout(t);
      if (r.ok && r.type === "basic" && !r.redirected) cache.put(chave, r.clone());
      return r; // 401 (senha vencida) passa: a pessoa entra de novo
    } catch (err) {
      const c = await cache.match(chave);
      if (c) return c;
      throw err;
    }
  })());
});
