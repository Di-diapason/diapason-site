// Service worker só do /teleprompter: depois de aberto uma vez (ou instalado na tela de início),
// a página, os ícones e as fontes funcionam sem internet, inclusive abrindo a frio.
const CACHE = "tp-v3";
const ARQUIVOS = [
  "/teleprompter/",
  "/teleprompter/controle/",
  "/teleprompter/qr.js",
  "/teleprompter/manifest.webmanifest",
  "/teleprompter/icones/icone-192.png",
  "/teleprompter/icones/icone-512.png",
  "/teleprompter/icones/icone-180.png",
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
      if (req.mode === "navigate") return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="background:#0F3633;color:#F2F0E6;font:18px/1.5 Lato,system-ui,sans-serif;padding:32px">Sem internet e esta página ainda não foi guardada neste aparelho. Abra o prompter uma vez com internet.</body>', { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
      throw err;
    }
  })());
});
