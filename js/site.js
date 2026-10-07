(() => {
"use strict";
const doc = document;
const $ = (s, el = doc) => el.querySelector(s);
const $$ = (s, el = doc) => [...el.querySelectorAll(s)];
const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
const conexao = navigator.connection || {};
const economia = !!conexao.saveData || /(^|-)(2g|3g)$/.test(conexao.effectiveType || "") || (conexao.downlink > 0 && conexao.downlink < 1.5);
const nav = $("[data-nav]");
let ultimoY = scrollY;
const aoRolar = () => {
const y = scrollY;
if (nav) {
nav.classList.toggle("rolou", y > 40);
const abrindoMenu = doc.documentElement.classList.contains("menu-aberto");
nav.classList.toggle("escondida", !abrindoMenu && y > 520 && y > ultimoY + 4);
if (y < ultimoY - 4) nav.classList.remove("escondida");
}
ultimoY = y;
};
addEventListener("scroll", aoRolar, { passive: true });
aoRolar();
if (nav) nav.addEventListener("focusin", () => nav.classList.remove("escondida"));
const botaoMenu = $("[data-menu]");
const mega = $("[data-mega]");
if (botaoMenu && mega) {
const rotulo = $(".sr-only", botaoMenu);
let aberto = false;
const alternar = (abrir, devolverFoco = true) => {
if (abrir === aberto) return;
aberto = abrir;
mega.hidden = false;
requestAnimationFrame(() => mega.classList.toggle("aberto", abrir));
botaoMenu.setAttribute("aria-expanded", String(abrir));
if (rotulo) rotulo.textContent = abrir ? "Fechar menu" : "Abrir menu";
doc.documentElement.classList.toggle("menu-aberto", abrir);
doc.body.style.overflow = abrir ? "hidden" : "";
$$("main, .rodape, .whats-flutuante, .pular").forEach((el) => { el.inert = abrir; });
if (abrir) setTimeout(() => { const primeiro = $("a", mega); if (primeiro) primeiro.focus(); }, 60);
else {
if (devolverFoco) botaoMenu.focus();
setTimeout(() => { if (!mega.classList.contains("aberto")) mega.hidden = true; }, 320);
}
};
botaoMenu.addEventListener("click", () => alternar(!aberto));
addEventListener("keydown", (e) => { if (e.key === "Escape" && aberto) alternar(false); });
$$("a", mega).forEach((a) => a.addEventListener("click", () => alternar(false, false)));
}
$$(".submenu").forEach((s) => {
s.addEventListener("keydown", (e) => { if (e.key === "Escape") { s.classList.add("fechado"); const a = $("a", s); if (a) a.focus(); } });
s.addEventListener("mouseleave", () => s.classList.remove("fechado"));
s.addEventListener("focusout", (e) => { if (!s.contains(e.relatedTarget)) s.classList.remove("fechado"); });
});
const teste = doc.createElement("video");
const temWebm = !!teste.canPlayType && teste.canPlayType('video/webm') !== "";
const temAV1 = temWebm && teste.canPlayType('video/webm; codecs="av01.0.08M.08"') !== "";
const emPe = () => matchMedia("(orientation: portrait) and (max-width: 900px)").matches;
const pequeno = () => Math.min(innerWidth, screen.width || innerWidth) < 900;
const escolher = (v) => {
const d = v.dataset;
const largura = (v.clientWidth || innerWidth) * (devicePixelRatio || 1);
if (emPe() && (d.v || d.vAv1)) return (temAV1 && d.vAv1) || d.v;
if ((pequeno() || largura <= 1300) && (d.av1Sm || d.mp4Sm)) return (temAV1 && d.av1Sm) || d.mp4Sm;
return (temAV1 && d.av1) || d.mp4 || d.mp4Sm;
};
const carregar = (v) => {
if (v.dataset.carregado) return;
const src = escolher(v);
if (!src) return;
v.dataset.carregado = "1";
v.muted = true; // Safari/iOS às vezes ignora o atributo HTML se a propriedade não for setada também
v.src = src;
v.load(); // iOS precisa desse empurrão depois de trocar o src de um <video preload="none">
v.addEventListener("playing", () => v.classList.add("tocando"), { once: true });
v.addEventListener("error", () => {
const d = v.dataset;
const mp4 = (emPe() && d.v && d.v.endsWith(".mp4") && d.v) || d.mp4Sm || d.mp4;
if (mp4 && v.src.indexOf(mp4) === -1) { v.src = mp4; v.load(); if (!pausado) tocar(v); }
}, { once: true });
};
let pausado = false;
try { pausado = localStorage.getItem("diapason-movimento") === "pausado"; } catch (_) { /* sem armazenamento */ }
const tocar = (v) => {
if (pausado) return;
if (v.readyState < 2) {
if (!v.dataset.aguardando) {
v.dataset.aguardando = "1";
v.addEventListener("canplay", () => { delete v.dataset.aguardando; if (!pausado) tocar(v); }, { once: true });
}
return;
}
try {
const p = v.play();
if (p && p.catch) p.catch(() => {
if (!v.dataset.retentando) {
v.dataset.retentando = "1";
v.addEventListener("canplay", () => { delete v.dataset.retentando; if (!pausado) tocar(v); }, { once: true });
}
});
} catch (_) { /* alguns navegadores lançam na hora em vez de rejeitar a promise */ }
};
const loops = $$(".loop video");
const visiveis = new Set();
const graoVivo = () => doc.documentElement.classList.toggle("grao-vivo", loops.some((v) => !v.paused && !v.ended));
loops.forEach((v) => { v.addEventListener("playing", graoVivo); v.addEventListener("pause", graoVivo); v.addEventListener("ended", graoVivo); });
if (!reduzir && !economia && loops.length) {
const obs = new IntersectionObserver((entradas) => {
for (const e of entradas) {
const v = e.target;
if (e.isIntersecting) { visiveis.add(v); carregar(v); tocar(v); }
else { visiveis.delete(v); if (!v.paused) v.pause(); }
}
}, { rootMargin: "200px 0px" });
loops.forEach((v) => {
const loop = v.closest(".loop");
if (loop && loop.offsetParent === null) return; // escondido (tríptico no celular)
if (v.hasAttribute("data-prioridade")) { carregar(v); tocar(v); }
obs.observe(v);
const card = v.closest(".filme, .servico, .espaco") || loop;
if (card) card.addEventListener("pointerenter", () => { if (visiveis.has(v)) tocar(v); });
});
doc.addEventListener("visibilitychange", () => {
if (doc.hidden) loops.forEach((v) => v.pause());
else visiveis.forEach((v) => tocar(v));
});
window.addEventListener("pageshow", (e) => { if (e.persisted) visiveis.forEach((v) => tocar(v)); });
const destravar = () => visiveis.forEach((v) => { if (v.paused) tocar(v); });
["touchstart", "pointerdown", "scroll"].forEach((t) => window.addEventListener(t, destravar, { passive: true, once: true }));
const ultimo = new WeakMap();
setInterval(() => {
if (pausado || doc.hidden) return;
visiveis.forEach((v) => {
if (!v.dataset.carregado || v.ended) return;
const t = v.currentTime, antes = ultimo.get(v);
ultimo.set(v, t);
if (v.paused) { tocar(v); return; }
if (antes !== undefined && Math.abs(t - antes) < 0.01 && v.readyState >= 2) {
try { v.currentTime = t + 0.05; } catch (_) { /* sem seek */ }
tocar(v);
}
});
}, 3000);
}
const aplicarPausa = () => {
doc.documentElement.classList.toggle("sem-movimento", pausado);
loops.forEach((v) => { if (pausado) v.pause(); else if (visiveis.has(v)) tocar(v); });
$$("[data-pausar]").forEach((b) => {
b.setAttribute("aria-pressed", String(pausado));
const r = $(".sr-only", b);
if (r) r.textContent = pausado ? "Voltar a tocar os vídeos" : "Pausar vídeos e animações";
});
};
$$("[data-pausar]").forEach((b) => b.addEventListener("click", () => {
pausado = !pausado;
try { localStorage.setItem("diapason-movimento", pausado ? "pausado" : ""); } catch (_) { /* sem armazenamento */ }
aplicarPausa();
}));
$$("[data-yt]").forEach((el) => {
el.addEventListener("click", () => {
if (el.querySelector("iframe")) return;
$$("[data-yt]").forEach((o) => {
const fr = o !== el && $("iframe", o);
if (fr) { fr.remove(); o.classList.remove("tocando"); const bt = $("button", o); if (bt) bt.hidden = false; }
});
const f = doc.createElement("iframe");
f.src = `https://www.youtube-nocookie.com/embed/${el.dataset.yt}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
f.title = el.dataset.titulo || "Vídeo";
f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
f.allowFullscreen = true;
el.appendChild(f);
el.classList.add("tocando");
const b = $("button", el);
if (b) b.hidden = true;
if (!(el.nextElementSibling && el.nextElementSibling.classList.contains("yt__fora"))) {
const a = doc.createElement("a");
a.className = "yt__fora";
a.href = `https://www.youtube.com/watch?v=${el.dataset.yt}`;
a.target = "_blank";
a.rel = "noopener";
a.textContent = "Não carregou? Assista no YouTube";
el.after(a);
}
f.focus();
});
});
const fmt = new Intl.NumberFormat("pt-BR");
const contar = (b) => {
const alvo = Number(b.dataset.conta || 0);
if (reduzir || !alvo) { b.textContent = fmt.format(alvo); return; }
const dur = 1400, t0 = performance.now();
const passo = (t) => {
const k = Math.min(1, (t - t0) / dur);
b.textContent = fmt.format(Math.round(alvo * (1 - Math.pow(1 - k, 3))));
if (k < 1) requestAnimationFrame(passo);
};
requestAnimationFrame(passo);
};
const revelar = new IntersectionObserver((entradas) => {
for (const e of entradas) {
if (!e.isIntersecting) continue;
e.target.classList.add("visivel");
$$("[data-conta]", e.target).forEach(contar);
revelar.unobserve(e.target);
}
}, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
$$(".revela").forEach((el) => revelar.observe(el));
const links = $$(".sumario a[href^='#']");
if (links.length) {
const alvos = links.map((a) => doc.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
const spy = new IntersectionObserver((entradas) => {
for (const e of entradas) {
if (!e.isIntersecting) continue;
links.forEach((a) => a.classList.toggle("ativo", a.hash.slice(1) === e.target.id));
}
}, { rootMargin: "-20% 0px -70% 0px" });
alvos.forEach((a) => spy.observe(a));
}
const filtros = $$("[data-filtro]");
if (filtros.length) {
filtros.forEach((b) => b.addEventListener("click", () => {
const f = b.dataset.filtro;
filtros.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
$$("[data-categorias]").forEach((c) => {
c.hidden = f !== "todos" && !c.dataset.categorias.split(" ").includes(f);
});
const n = $$("[data-categorias]:not([hidden])").length;
const st = $("[data-contagem]");
if (st) st.textContent = `${n} ${n === 1 ? "case" : "cases"}`;
}));
}
const hoje = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
$$("form[data-whats-form] input[type=date]").forEach((c) => { c.min = hoje; });
$$("form[data-whats-form]").forEach((form) => {
form.addEventListener("submit", (ev) => {
ev.preventDefault();
if (form.dataset.enviando) return; // clique duplo não abre duas conversas
let valido = true;
$$("[required]", form).forEach((c) => {
const ok = c.type === "checkbox" ? c.checked : !!String(c.value || "").trim();
c.setAttribute("aria-invalid", String(!ok));
let msg = doc.getElementById(c.id + "-erro");
if (!ok && !msg) {
msg = doc.createElement("small");
msg.id = c.id + "-erro";
msg.className = "campo__erro";
msg.textContent = "Preencha este campo para a gente conseguir responder.";
c.after(msg);
c.setAttribute("aria-describedby", `${c.getAttribute("aria-describedby") || ""} ${msg.id}`.trim());
}
if (msg) msg.hidden = ok;
if (!ok && valido) { c.focus(); valido = false; }
});
const erro = (c, texto) => {
c.setAttribute("aria-invalid", "true");
let m = doc.getElementById(c.id + "-erro");
if (!m) {
m = doc.createElement("small"); m.id = c.id + "-erro"; m.className = "campo__erro"; c.after(m);
c.setAttribute("aria-describedby", `${c.getAttribute("aria-describedby") || ""} ${m.id}`.trim());
}
m.textContent = texto; m.hidden = false;
if (valido) { c.focus(); valido = false; }
};
$$("input[type=email]", form).forEach((c) => { if (c.value.trim() && !c.checkValidity()) erro(c, "Confere o e-mail? Parece que falta um pedaço."); });
$$("input[type=tel]", form).forEach((c) => { if (c.value.trim() && c.value.replace(/\D/g, "").length < 10) erro(c, "Coloca o WhatsApp com DDD."); });
$$("input[type=date]", form).forEach((c) => { if (c.value && c.value < hoje) erro(c, "Essa data já passou. Se ainda não tem data, deixa em branco."); });
$$("input[type=number]", form).forEach((c) => { if (c.value && Number(c.value) < 1) erro(c, "Coloca pelo menos 1 pessoa."); });
if (!valido) return;
const dados = {};
const linhas = [form.dataset.titulo || "Oi! Vim pelo site da Diapason."];
const porRotulo = new Map();
$$("input, select, textarea", form).forEach((c) => {
if (!c.name || c.type === "submit" || c.type === "hidden") return;
if ((c.type === "radio" || c.type === "checkbox") && !c.checked) return;
let valor = String(c.value || "").trim();
if (!valor) return;
if (c.type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) valor = valor.split("-").reverse().join("/");
const rotulo = c.dataset.rotulo || c.name;
dados[c.name] = dados[c.name] ? [].concat(dados[c.name], valor) : valor;
porRotulo.set(rotulo, [...(porRotulo.get(rotulo) || []), valor]);
});
porRotulo.forEach((v, rotulo) => linhas.push(`• ${rotulo}: ${v.join(", ")}`));
const url = `https://wa.me/${form.dataset.numero}?text=${encodeURIComponent(linhas.join("\n"))}`;
window.open(url, "_blank", "noopener");
form.dataset.enviando = "1";
setTimeout(() => { delete form.dataset.enviando; }, 4000);
form.classList.add("enviado");
const ok = $(".form__ok", form);
if (ok) ok.textContent = ok.dataset.texto || "";
const endpoint = form.dataset.endpoint;
if (endpoint) {
const corpo = JSON.stringify({ formulario: form.dataset.formulario, pagina: location.pathname, enviado_em: new Date().toISOString(), dados });
const foi = navigator.sendBeacon && navigator.sendBeacon(endpoint, new Blob([corpo], { type: "text/plain;charset=utf-8" }));
if (!foi) fetch(endpoint, { method: "POST", mode: "no-cors", keepalive: true, headers: { "Content-Type": "text/plain;charset=utf-8" }, body: corpo }).catch(() => {});
}
});
});
const flutuante = $(".whats-flutuante");
const zonas = $$(".hero, .ficha, .caixa-cta, .chamada, form[data-whats-form], .rodape");
if (flutuante && zonas.length) {
const vis = new Set();
const o = new IntersectionObserver((es) => {
es.forEach((e) => (e.isIntersecting ? vis.add(e.target) : vis.delete(e.target)));
flutuante.classList.toggle("oculto", vis.size > 0);
}, { threshold: 0.15 });
zonas.forEach((z) => o.observe(z));
const celular = matchMedia("(max-width: 759px)");
let yAnt = scrollY;
addEventListener("scroll", () => {
const y = scrollY;
if (!celular.matches) flutuante.classList.remove("recolhido");
else if (y > yAnt + 6) flutuante.classList.add("recolhido");
else if (y < yAnt - 6) flutuante.classList.remove("recolhido");
yAnt = y;
}, { passive: true });
}
const grupos = $$(".galeria, .sala__fotos");
if (grupos.length && window.HTMLDialogElement) {
let lupa = $("dialog.lupa");
if (!lupa) {
lupa = doc.createElement("dialog");
lupa.className = "lupa";
lupa.setAttribute("aria-label", "Foto ampliada");
lupa.innerHTML = '<figure class="lupa__foto"></figure><p class="lupa__legenda"></p>' +
'<button type="button" class="lupa__fechar" aria-label="Fechar">\u00d7</button>' +
'<button type="button" class="lupa__ant" aria-label="Foto anterior">\u2039</button>' +
'<button type="button" class="lupa__prox" aria-label="Próxima foto">\u203a</button>';
doc.body.appendChild(lupa);
lupa._mostrar = (n) => {
const lista = lupa._lista || [];
if (!lista.length) return;
lupa._i = (n + lista.length) % lista.length;
const pic = $("picture", lista[lupa._i]).cloneNode(true);
pic.querySelectorAll("source, img").forEach((e) => { e.setAttribute("sizes", "100vw"); e.removeAttribute("loading"); });
const img = $("img", pic);
$(".lupa__foto", lupa).replaceChildren(pic);
$(".lupa__legenda", lupa).textContent = img ? img.alt : "";
lupa.classList.toggle("lupa--uma", lista.length < 2);
};
const fechar = () => lupa.close();
lupa.addEventListener("close", () => doc.documentElement.classList.remove("lupa-aberta"));
$(".lupa__fechar", lupa).addEventListener("click", fechar);
$(".lupa__ant", lupa).addEventListener("click", () => lupa._mostrar(lupa._i - 1));
$(".lupa__prox", lupa).addEventListener("click", () => lupa._mostrar(lupa._i + 1));
lupa.addEventListener("click", (e) => { if (e.target === lupa || e.target.classList.contains("lupa__foto")) fechar(); });
lupa.addEventListener("keydown", (e) => {
if (e.key === "ArrowLeft") lupa._mostrar(lupa._i - 1);
if (e.key === "ArrowRight") lupa._mostrar(lupa._i + 1);
});
let x0 = null;
lupa.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
lupa.addEventListener("touchend", (e) => {
if (x0 === null) return;
const dx = e.changedTouches[0].clientX - x0;
if (Math.abs(dx) > 50) lupa._mostrar(lupa._i + (dx < 0 ? 1 : -1));
x0 = null;
});
}
grupos.forEach((g) => {
const figs = $$("figure", g).filter((f) => $("picture", f));
figs.forEach((f, n) => {
f.tabIndex = 0;
f.setAttribute("role", "button");
const alt = ($("img", f) || {}).alt || "";
f.setAttribute("aria-label", "Ampliar foto" + (alt ? ": " + alt : ""));
const abrir = () => {
lupa._lista = figs;
lupa._mostrar(n);
doc.documentElement.classList.add("lupa-aberta");
lupa.showModal();
};
f.addEventListener("click", abrir);
f.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(); } });
});
});
}
aplicarPausa();
})();
document.querySelectorAll('[data-galeria]').forEach(function (g) {
var trilho = g.querySelector('.depoimentos--galeria');
var setas = g.querySelectorAll('.depo-galeria__setas button');
if (!trilho || !setas.length) return;
function passo() { var c = trilho.querySelector('.depoimento'); return c ? c.getBoundingClientRect().width + 18 : trilho.clientWidth; }
function atualizar() {
var max = trilho.scrollWidth - trilho.clientWidth - 2;
setas[0].disabled = trilho.scrollLeft <= 2;
setas[1].disabled = trilho.scrollLeft >= max;
}
setas.forEach(function (b) {
b.addEventListener('click', function () { trilho.scrollBy({ left: passo() * Number(b.dataset.dir), behavior: 'smooth' }); });
});
function medir() {
trilho.querySelectorAll('.depoimento').forEach(function (c) {
var q = c.querySelector('blockquote'), b = c.querySelector('.depoimento__mais');
if (!q || c.classList.contains('aberto')) return;
var corta = q.scrollHeight > q.clientHeight + 4;
if (corta && !b) {
b = document.createElement('button');
b.type = 'button'; b.className = 'depoimento__mais'; b.textContent = 'Ler tudo'; b.setAttribute('aria-expanded', 'false');
b.addEventListener('click', function () {
var aberto = c.classList.toggle('aberto');
b.textContent = aberto ? 'Ler menos' : 'Ler tudo'; b.setAttribute('aria-expanded', String(aberto));
});
q.insertAdjacentElement('afterend', b);
}
if (b) b.hidden = !corta;
});
}
medir();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);
window.addEventListener('load', medir);
window.addEventListener('resize', medir);
trilho.addEventListener('scroll', atualizar, { passive: true });
window.addEventListener('resize', atualizar);
atualizar();
});
