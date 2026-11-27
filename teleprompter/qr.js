// Gerador de QR Code (modo byte, correção M), sem dependência externa.
// Segue o algoritmo do padrão ISO/IEC 18004 (mesma estrutura do gerador de referência de Project Nayuki).
// Uso: QR.svg("https://...", { margem: 4 }) devolve o texto de um <svg>.
(function (raiz) {
  "use strict";
  var ECC_M = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
  var BLOCOS_M = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];
  var FORMATO_M = 0;

  function bit(x, i) { return ((x >>> i) & 1) !== 0; }
  function modulosBrutos(v) {
    var r = (16 * v + 128) * v + 64;
    if (v >= 2) { var n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; }
    return r;
  }
  function palavrasDados(v) { return Math.floor(modulosBrutos(v) / 8) - ECC_M[v] * BLOCOS_M[v]; }

  function mult(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; }
    return z & 0xFF;
  }
  function divisor(grau) {
    var r = []; for (var i = 0; i < grau - 1; i++) r.push(0); r.push(1);
    var raiz = 1;
    for (i = 0; i < grau; i++) {
      for (var j = 0; j < r.length; j++) { r[j] = mult(r[j], raiz); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
      raiz = mult(raiz, 0x02);
    }
    return r;
  }
  function resto(dados, div) {
    var r = div.map(function () { return 0; });
    dados.forEach(function (b) {
      var f = b ^ r.shift(); r.push(0);
      div.forEach(function (c, i) { r[i] ^= mult(c, f); });
    });
    return r;
  }

  function utf8(s) {
    var u = unescape(encodeURIComponent(s)), a = [];
    for (var i = 0; i < u.length; i++) a.push(u.charCodeAt(i));
    return a;
  }

  function gerar(texto) {
    var bytes = utf8(texto), v;
    for (v = 1; v <= 40; v++) {
      var cc = v <= 9 ? 8 : 16;
      if (4 + cc + bytes.length * 8 <= palavrasDados(v) * 8) break;
    }
    if (v > 40) throw new Error("Texto grande demais para QR");
    var bits = [];
    function por(val, n) { for (var i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    por(4, 4); por(bytes.length, v <= 9 ? 8 : 16);
    bytes.forEach(function (b) { por(b, 8); });
    var cap = palavrasDados(v) * 8;
    por(0, Math.min(4, cap - bits.length));
    por(0, (8 - bits.length % 8) % 8);
    for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) por(pad, 8);
    var dados = [];
    for (var i = 0; i < bits.length; i += 8) { var b = 0; for (var k = 0; k < 8; k++) b = (b << 1) | bits[i + k]; dados.push(b); }

    // blocos com correção, intercalados
    var nb = BLOCOS_M[v], ecl = ECC_M[v], brutas = Math.floor(modulosBrutos(v) / 8);
    var curtos = nb - brutas % nb, tamCurto = Math.floor(brutas / nb), div = divisor(ecl), blocos = [], p = 0;
    for (i = 0; i < nb; i++) {
      var d = dados.slice(p, p + tamCurto - ecl + (i < curtos ? 0 : 1)); p += d.length;
      var e = resto(d, div);
      if (i < curtos) d.push(0);
      blocos.push(d.concat(e));
    }
    var final = [];
    for (i = 0; i < blocos[0].length; i++)
      for (var j = 0; j < blocos.length; j++)
        if (i !== tamCurto - ecl || j >= curtos) final.push(blocos[j][i]);

    var n = v * 4 + 17, m = [], fn = [];
    for (i = 0; i < n; i++) { m.push(new Array(n).fill(false)); fn.push(new Array(n).fill(false)); }
    function poe(x, y, escuro) { m[y][x] = escuro; fn[y][x] = true; }

    for (i = 0; i < n; i++) { poe(6, i, i % 2 === 0); poe(i, 6, i % 2 === 0); }
    [[3, 3], [n - 4, 3], [3, n - 4]].forEach(function (c) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var dist = Math.max(Math.abs(dx), Math.abs(dy)), xx = c[0] + dx, yy = c[1] + dy;
        if (xx >= 0 && xx < n && yy >= 0 && yy < n) poe(xx, yy, dist !== 2 && dist !== 4);
      }
    });
    var al = [];
    if (v > 1) {
      var na = Math.floor(v / 7) + 2, passo = v === 32 ? 26 : Math.ceil((v * 4 + 4) / (na * 2 - 2)) * 2;
      al = [6];
      for (var ps = n - 7; al.length < na; ps -= passo) al.splice(1, 0, ps);
    }
    al.forEach(function (a, ia) {
      al.forEach(function (b, ib) {
        if ((ia === 0 && ib === 0) || (ia === 0 && ib === al.length - 1) || (ia === al.length - 1 && ib === 0)) return;
        for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) poe(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      });
    });
    function formato(mask) {
      var dado = FORMATO_M << 3 | mask, r = dado;
      for (var i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      var bs = (dado << 10 | r) ^ 0x5412;
      for (i = 0; i <= 5; i++) poe(8, i, bit(bs, i));
      poe(8, 7, bit(bs, 6)); poe(8, 8, bit(bs, 7)); poe(7, 8, bit(bs, 8));
      for (i = 9; i < 15; i++) poe(14 - i, 8, bit(bs, i));
      for (i = 0; i < 8; i++) poe(n - 1 - i, 8, bit(bs, i));
      for (i = 8; i < 15; i++) poe(8, n - 15 + i, bit(bs, i));
      poe(8, n - 8, true);
    }
    formato(0);
    if (v >= 7) {
      var r = v;
      for (i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
      var vb = v << 12 | r;
      for (i = 0; i < 18; i++) { var a = n - 11 + i % 3, b2 = Math.floor(i / 3); poe(a, b2, bit(vb, i)); poe(b2, a, bit(vb, i)); }
    }
    // dados em zigue-zague
    var ib2 = 0;
    for (var dir = n - 1; dir >= 1; dir -= 2) {
      if (dir === 6) dir = 5;
      for (var vert = 0; vert < n; vert++) for (j = 0; j < 2; j++) {
        var x = dir - j, sobe = ((dir + 1) & 2) === 0, y = sobe ? n - 1 - vert : vert;
        if (!fn[y][x] && ib2 < final.length * 8) { m[y][x] = bit(final[ib2 >>> 3], 7 - (ib2 & 7)); ib2++; }
      }
    }
    function mascara(k) {
      for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
        var inv;
        switch (k) {
          case 0: inv = (x + y) % 2 === 0; break;
          case 1: inv = y % 2 === 0; break;
          case 2: inv = x % 3 === 0; break;
          case 3: inv = (x + y) % 3 === 0; break;
          case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: inv = x * y % 2 + x * y % 3 === 0; break;
          case 6: inv = (x * y % 2 + x * y % 3) % 2 === 0; break;
          default: inv = ((x + y) % 2 + x * y % 3) % 2 === 0;
        }
        if (!fn[y][x] && inv) m[y][x] = !m[y][x];
      }
    }
    // penalidade simplificada (sequências, blocos 2x2, equilíbrio): escolhe a máscara mais legível
    function penal() {
      var pts = 0, escuros = 0, x, y;
      for (y = 0; y < n; y++) {
        var cx = null, rx = 0, cy = null, ry = 0;
        for (x = 0; x < n; x++) {
          if (m[y][x] === cx) { rx++; if (rx === 5) pts += 3; else if (rx > 5) pts++; } else { cx = m[y][x]; rx = 1; }
          if (m[x][y] === cy) { ry++; if (ry === 5) pts += 3; else if (ry > 5) pts++; } else { cy = m[x][y]; ry = 1; }
          if (m[y][x]) escuros++;
          if (x < n - 1 && y < n - 1 && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) pts += 3;
        }
      }
      return pts + Math.floor(Math.abs(escuros * 20 - n * n * 10) / (n * n)) * 10;
    }
    var melhor = 0, menor = Infinity;
    for (var k = 0; k < 8; k++) {
      mascara(k); formato(k);
      var pe = penal(); if (pe < menor) { menor = pe; melhor = k; }
      mascara(k);
    }
    mascara(melhor); formato(melhor);
    return m;
  }

  function svg(texto, op) {
    op = op || {};
    var m = gerar(texto), n = m.length, mg = op.margem == null ? 4 : op.margem, t = n + mg * 2, d = "";
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (m[y][x]) d += "M" + (x + mg) + "," + (y + mg) + "h1v1h-1z";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + t + " " + t + '" shape-rendering="crispEdges" role="img" aria-label="QR Code">' +
      '<rect width="100%" height="100%" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }
  raiz.QR = { gerar: gerar, svg: svg };
})(typeof window !== "undefined" ? window : this);
