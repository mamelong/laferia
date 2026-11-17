/* La Feria · tienda con pedidos por WhatsApp.
   El catálogo se lee de Google Sheets (o de catalogo.csv) y los ajustes de config.js. */
(function () {
  "use strict";

  /* ---------- Configuración ---------- */
  var CFG = window.LAFERIA_CONFIG || {};
  var TEXTS = CFG.texts || {};
  var CATS = [["todo", "Todo"], ["vestidos", "Vestidos"], ["arriba", "Remeras y camisas"], ["abrigos", "Abrigos"], ["abajo", "Jeans y polleras"], ["accesorios", "Accesorios"]];
  var SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "1", "2", "3", "32", "34", "36", "38", "40", "42", "44", "46", "Único"];
  var MAX_PHOTOS = 6;
  var HOLD_HOURS = 48;
  var CART_KEY = "laferia-pedido-v2";
  var HOLD_KEY = "laferia-reservas-v2";
  var CACHE_KEY = "laferia-catalogo-cache-v2";

  var COLS = {
    code: ["codigo", "cod", "sku", "codigo de producto", "codigo interno"],
    name: ["nombre", "prenda", "producto", "titulo"],
    brand: ["marca"],
    cat: ["categoria", "rubro"],
    size: ["talle", "talla", "size"],
    cond: ["estado", "condicion"],
    price: ["precio", "valor", "precio ars", "importe"],
    dims: ["medidas", "medida", "dimensiones"],
    avail: ["disponibilidad", "stock", "disponible"],
    photos: ["fotos", "foto", "imagenes", "imagen"]
  };
  var CAT_RULES = [
    [/vestido|enterito|mono\b/, "vestidos"],
    [/remera|camisa|blusa|top\b|musculosa|body|arriba/, "arriba"],
    [/abrigo|campera|tapado|blazer|saco|trench|piloto|chaleco|buzo|sweater|sueter|pulover|cardigan/, "abrigos"],
    [/jean|pantalon|pollera|falda|short|bermuda|abajo/, "abajo"],
    [/accesorio|bolso|cartera|mochila|cinto|cinturon|panuelo|sombrero|gorro|bufanda/, "accesorios"]
  ];
  var SHAPE_RULES = [
    [/vestido|enterito|mono\b/, "vestido"],
    [/camisa|camisaco|blusa/, "camisa"],
    [/buzo|sweater|sueter|pulover|cardigan/, "buzo"],
    [/tapado|trench|piloto/, "tapado"],
    [/campera|blazer|saco|chaleco|abrigo/, "campera"],
    [/pollera|falda/, "pollera"],
    [/jean|pantalon|short|bermuda|palazzo/, "jean"],
    [/bolso|cartera|mochila|rinonera|cinto|cinturon/, "bolso"],
    [/remera|top\b|musculosa|body/, "remera"]
  ];
  var SHAPE_BY_CAT = { vestidos: "vestido", arriba: "remera", abrigos: "campera", abajo: "jean", accesorios: "bolso" };

  var SYMBOLS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' +
    '<symbol id="s-vestido" viewBox="0 0 100 100"><path d="M38 8 L44 8 Q50 20 56 8 L62 8 L66 30 L60 38 L74 92 L26 92 L40 38 L34 30 Z" fill="currentColor"/><path d="M41 38 L59 38" fill="none" style="stroke:var(--tile);stroke-width:1.6"/></symbol>' +
    '<symbol id="s-remera" viewBox="0 0 100 100"><path d="M34 12 Q50 24 66 12 L90 30 L80 46 L70 40 L70 88 L30 88 L30 40 L20 46 L10 30 Z" fill="currentColor"/></symbol>' +
    '<symbol id="s-camisa" viewBox="0 0 100 100"><path d="M34 12 Q50 24 66 12 L90 30 L80 46 L70 40 L70 88 L30 88 L30 40 L20 46 L10 30 Z" fill="currentColor"/><path d="M34 12 L50 30 L66 12 M50 30 V88" fill="none" style="stroke:var(--tile);stroke-width:1.6"/></symbol>' +
    '<symbol id="s-buzo" viewBox="0 0 100 100"><path d="M34 12 Q50 22 66 12 L92 56 L80 62 L70 42 L70 88 L30 88 L30 42 L20 62 L8 56 Z" fill="currentColor"/><path d="M30 80 H70" fill="none" style="stroke:var(--tile);stroke-width:1.6"/></symbol>' +
    '<symbol id="s-campera" viewBox="0 0 100 100"><path d="M34 10 L50 18 L66 10 L92 32 L86 76 L72 74 L72 90 L28 90 L28 74 L14 76 L8 32 Z" fill="currentColor"/><path d="M50 18 V90" fill="none" style="stroke:var(--tile);stroke-width:1.6"/></symbol>' +
    '<symbol id="s-tapado" viewBox="0 0 100 100"><path d="M34 8 L50 18 L66 8 L90 28 L86 70 L76 70 L74 94 L26 94 L24 70 L14 70 L10 28 Z" fill="currentColor"/><path d="M50 18 V94 M26 56 H74" fill="none" style="stroke:var(--tile);stroke-width:1.6"/></symbol>' +
    '<symbol id="s-jean" viewBox="0 0 100 100"><path d="M30 8 H70 L78 92 H54 L50 40 L46 92 H22 Z" fill="currentColor"/><path d="M30 16 H70" fill="none" style="stroke:var(--tile);stroke-width:1.6"/></symbol>' +
    '<symbol id="s-pollera" viewBox="0 0 100 100"><path d="M36 14 H64 L84 90 H16 Z" fill="currentColor"/><path d="M36 22 H64" fill="none" style="stroke:var(--tile);stroke-width:1.6"/></symbol>' +
    '<symbol id="s-bolso" viewBox="0 0 100 100"><path d="M20 40 H80 L88 90 H12 Z" fill="currentColor"/><path d="M36 40 V30 Q36 14 50 14 Q64 14 64 30 V40" fill="none" stroke="currentColor" stroke-width="5"/><path d="M20 54 H80" fill="none" style="stroke:var(--tile);stroke-width:1.6"/></symbol>' +
    '</defs></svg>';

  /* ---------- Utilidades ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
  function fmt(n) { return money.format(Number(n) || 0); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function num(v, d) { var n = Number(v); return isFinite(n) && v !== "" && v != null && n >= 0 ? n : d; }
  function T(k) { return typeof TEXTS[k] === "string" && TEXTS[k] ? TEXTS[k] : ""; }
  function tx(k) { return esc(T(k)); }
  function igHandle() { return String(CFG.instagram || "").replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, ""); }
  function waNumber() { return String(CFG.whatsapp || "").replace(/\D/g, ""); }
  function norm(s) {
    return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ]+/g, " ").trim();
  }
  function cellStr(v) { return v == null ? "" : String(v).trim(); }

  /* ---------- Lectura de la planilla ---------- */
  function parseDelimited(text) {
    text = String(text || "").replace(/^﻿/, "");
    var first = text.split(/\r?\n/)[0] || "";
    var best = ",", bestN = -1;
    [",", ";", "\t"].forEach(function (d) {
      var n = first.split(d).length - 1;
      if (n > bestN) { best = d; bestN = n; }
    });
    var rows = [], row = [], cur = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += c;
      } else if (c === '"' && cur === "") q = true;
      else if (c === best) { row.push(cur); cur = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cur); rows.push(row); row = []; cur = "";
      } else cur += c;
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }
  function parsePrice(v) {
    var s = cellStr(v).replace(/ars|\$|\s/gi, "");
    if (!s || !/^[0-9.,]+$/.test(s)) return NaN;
    var hasDot = s.indexOf(".") >= 0, hasCom = s.indexOf(",") >= 0;
    if (hasDot && hasCom) {
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
      else s = s.replace(/,/g, "");
    } else if (hasCom) {
      s = /,\d{1,2}$/.test(s) && s.split(",").length === 2 ? s.replace(",", ".") : s.replace(/,/g, "");
    } else if (hasDot) {
      s = /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "") : s;
    }
    return Number(s);
  }
  var extraCats = [];
  function matchCat(v) {
    var n = norm(v);
    if (!n) return "";
    var all = CATS.slice(1).concat(extraCats), i;
    for (i = 0; i < all.length; i++) if (norm(all[i][1]) === n || all[i][0] === n) return all[i][0];
    for (i = 0; i < CAT_RULES.length; i++) if (CAT_RULES[i][0].test(n)) return CAT_RULES[i][1];
    var label = cellStr(v).replace(/\s+/g, " ").slice(0, 40);
    var id = "x-" + n.replace(/[^a-z0-9]+/g, "-");
    extraCats.push([id, label.charAt(0).toUpperCase() + label.slice(1)]);
    return id;
  }
  function cleanSize(v) {
    var s = cellStr(v);
    var n = norm(s);
    if (!s || n === "unico" || n === "u") return "Único";
    return /^(x{0,3}s|x{0,3}l|m)$/i.test(s) ? s.toUpperCase() : s;
  }
  function guessShape(name, cat) {
    var n = norm(name);
    for (var i = 0; i < SHAPE_RULES.length; i++) if (SHAPE_RULES[i][0].test(n)) return SHAPE_RULES[i][1];
    return SHAPE_BY_CAT[cat] || "remera";
  }
  function matchCond(v) {
    var n = norm(v);
    if (/^(como )?nuev|excelente|impecable/.test(n)) return "Como nueva";
    if (/^buen|usad|regular/.test(n)) return "Buena";
    return n ? (/^muy buen/.test(n) ? "Muy buena" : cellStr(v)) : "";
  }
  function matchAvail(v) {
    var n = norm(v);
    if (/^ocult|^no publicar|^borrador/.test(n)) return "hidden";
    if (/^reserv/.test(n)) return "reserved";
    if (/^vendid|^agotad|^no\b/.test(n)) return "sold";
    return "ok";
  }
  function photoSrc(name) {
    name = cellStr(name);
    if (!name) return "";
    if (/^https?:\/\//i.test(name)) return name;
    if (!/\.[a-z0-9]{3,4}$/i.test(name)) name += "." + (CFG.photoExt || "jpg");
    return "fotos/" + encodeURIComponent(name);
  }
  // Columna Fotos: vacía = se busca CODIGO-1.jpg; un número = CODIGO-1 … CODIGO-n;
  // o una lista de archivos o links separados por coma.
  function photosFor(code, raw) {
    var v = cellStr(raw);
    var ext = "." + (CFG.photoExt || "jpg");
    if (!v) return code ? ["fotos/" + encodeURIComponent(code + "-1" + ext)] : [];
    if (/^\d+$/.test(v)) {
      var out = [];
      for (var i = 1; i <= Math.min(Number(v), MAX_PHOTOS); i++) out.push("fotos/" + encodeURIComponent(code + "-" + i + ext));
      return out;
    }
    return v.split(/[,;\n]+/).map(photoSrc).filter(Boolean).slice(0, MAX_PHOTOS);
  }

  function buildCatalog(matrix) {
    extraCats = [];
    var hi = -1, r;
    for (r = 0; r < matrix.length; r++) {
      if (matrix[r].some(function (c) { return cellStr(c) !== ""; })) { hi = r; break; }
    }
    if (hi < 0) throw new Error("La planilla está vacía.");
    var map = {};
    matrix[hi].forEach(function (h, i) {
      var n = norm(h);
      Object.keys(COLS).forEach(function (k) { if (map[k] == null && COLS[k].indexOf(n) >= 0) map[k] = i; });
    });
    if (map.name == null || map.price == null) throw new Error("Faltan las columnas Nombre o Precio en la planilla.");
    function get(row, k) { return map[k] == null ? "" : row[map[k]]; }
    var products = [], seen = {};
    for (r = hi + 1; r < matrix.length; r++) {
      var row = matrix[r];
      var name = cellStr(get(row, "name"));
      var price = parsePrice(get(row, "price"));
      if (!name || !(price > 0)) {
        if (row.some(function (c) { return cellStr(c) !== ""; })) console.warn("La Feria: fila " + (r + 1) + " sin nombre o precio válido, no se muestra.");
        continue;
      }
      var avail = matchAvail(get(row, "avail"));
      if (avail === "hidden") continue;
      var code = cellStr(get(row, "code")).toUpperCase().replace(/\s+/g, "");
      if (!code || seen[code]) code = "FILA" + (r + 1);
      seen[code] = 1;
      var cat = matchCat(get(row, "cat")) || "accesorios";
      products.push({
        id: r,
        code: code,
        name: name,
        brand: cellStr(get(row, "brand")),
        cat: cat,
        shape: guessShape(name, cat),
        size: cleanSize(get(row, "size")),
        cond: matchCond(get(row, "cond")),
        price: Math.round(price),
        dims: cellStr(get(row, "dims")),
        sold: avail === "sold",
        reserved: avail === "reserved",
        photos: photosFor(/^FILA\d+$/.test(code) ? "" : code, get(row, "photos"))
      });
    }
    return products;
  }

  function scriptUrl() { return String(CFG.scriptUrl || "").trim(); }
  function fetchCsvMatrix() {
    var url = String(CFG.sheetCsvUrl || "").trim() || "catalogo.csv";
    var sep = url.indexOf("?") >= 0 ? "&" : "?";
    return fetch(url + sep + "t=" + Date.now(), { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function (text) {
        if (/^\s*<(!doctype|html)/i.test(text)) throw new Error("El link de la planilla no devuelve un CSV.");
        return parseDelimited(text);
      });
  }
  // Lectura en vivo desde la planilla (Apps Script). Si falla, usa el CSV publicado.
  function fetchMatrix() {
    var su = scriptUrl();
    if (!su) return fetchCsvMatrix();
    return fetch(su + (su.indexOf("?") >= 0 ? "&" : "?") + "t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) { if (!j || !j.ok || !Array.isArray(j.rows)) throw new Error("Respuesta inválida"); return j.rows; })
      .catch(function (err) {
        console.warn("La Feria: lectura en vivo falló, uso el CSV.", err);
        return fetchCsvMatrix();
      });
  }
  function loadCatalog() {
    return fetchMatrix()
      .then(function (matrix) {
        var list = buildCatalog(matrix);
        lsSet(CACHE_KEY, JSON.stringify(matrix));
        return list;
      })
      .catch(function (err) {
        console.error("La Feria: no se pudo leer el catálogo.", err);
        var cached = lsGet(CACHE_KEY);
        if (cached) { try { return buildCatalog(JSON.parse(cached)); } catch (e) {} }
        throw err;
      });
  }
  // Marca las prendas como Reservada en la planilla. Responde {ok} o {ok:false, error:"taken", taken:[códigos]}.
  function reserveCodes(codes) {
    var su = scriptUrl();
    if (!su) return Promise.resolve({ ok: true, skipped: true });
    return fetch(su, { method: "POST", body: JSON.stringify({ action: "reserve", codes: codes }) })
      .then(function (r) { return r.json(); });
  }

  /* ---------- Estado ---------- */
  var products = [];
  var status = "loading"; // loading | ok | error
  var view = { cat: "todo", size: "todos", sort: "nuevo" };
  var cart = [];
  var holds = {};
  var ship = "";
  var modal = null;
  var lastFocus = null;
  var toastTimer = null;

  function byCode(code) {
    for (var i = 0; i < products.length; i++) if (products[i].code === code) return products[i];
    return null;
  }
  function loadHolds() {
    try {
      var r = JSON.parse(lsGet(HOLD_KEY) || "{}"), now = Date.now(), out = {};
      Object.keys(r).forEach(function (k) { if (now - r[k] < HOLD_HOURS * 3600e3) out[k] = r[k]; });
      return out;
    } catch (e) { return {}; }
  }
  function saveHolds() { lsSet(HOLD_KEY, JSON.stringify(holds)); }
  // No disponible: vendida o reservada en la planilla, o pedida desde este navegador hace poco.
  function isTaken(p) { return !!(p.sold || p.reserved || holds[p.code]); }
  function takenLabel(p) { return p.sold ? "Vendida" : "Reservada"; }
  function loadCart() {
    try { var raw = JSON.parse(lsGet(CART_KEY) || "[]"); return Array.isArray(raw) ? raw : []; } catch (e) { return []; }
  }
  function saveCart() { lsSet(CART_KEY, JSON.stringify(cart)); }
  // Saca del pedido las prendas que ya no están disponibles y devuelve sus nombres.
  function pruneCart() {
    var gone = [];
    cart = cart.filter(function (c) {
      var p = byCode(c);
      var ok = p && !isTaken(p);
      if (!ok && p) gone.push(p.name);
      return ok;
    });
    saveCart();
    return gone;
  }
  function goneMsg(names) {
    return names.length === 1
      ? "«" + names[0] + "» acaba de ser reservada por otra persona y la sacamos de tu pedido."
      : "Estas prendas acaban de ser reservadas por otra persona y las sacamos de tu pedido: " + names.join(", ") + ".";
  }
  function cartItems() { return cart.map(byCode).filter(Boolean); }
  function allCats() { return CATS.concat(extraCats); }

  /* ---------- Estructura de la página ---------- */
  function shell() {
    return SYMBOLS +
      '<header class="top"><div class="wrap bar">' +
      '<a class="logo" href="/" style="color:inherit;text-decoration:none"><span>' + tx("logo") + '</span><small>' + tx("tagline") + '</small></a>' +
      '<button class="btn" id="open-cart" type="button" aria-haspopup="dialog">Mi pedido <span class="count-pill" id="cart-count">0</span></button>' +
      '</div></header>' +
      '<main>' +
      '<section class="wrap hero"><div>' +
      '<h1>' + tx("heroTitle") + '</h1>' +
      '<p class="lead">' + tx("heroLead") + '</p>' +
      '<ul class="facts"><li>' + tx("fact1") + '</li><li>' + tx("fact2") + '</li><li>' + tx("fact3") + '</li></ul>' +
      '<p class="social"><a class="btn ghost" id="hero-ig" href="#" target="_blank" rel="noopener"></a></p>' +
      '</div></section>' +
      '<section class="wrap" id="catalogo" aria-labelledby="catalogo-title"><h2 id="catalogo-title" class="vh">Catálogo</h2>' +
      '<div class="filters">' +
      '<div class="row" role="group" aria-label="Categoría"><span class="lbl">Categoría</span><span id="cat-chips" style="display:contents"></span></div>' +
      '<div class="row" role="group" aria-label="Talle"><span class="lbl">Talle</span><span id="size-chips" style="display:contents"></span>' +
      '<div class="sortbox"><label for="sort">Ordenar</label><select id="sort"><option value="nuevo">Más nuevo</option><option value="menor">Menor precio</option><option value="mayor">Mayor precio</option></select></div></div>' +
      '</div>' +
      '<p class="result-count" id="result-count" aria-live="polite"></p>' +
      '<div class="grid" id="grid"></div></section>' +
      '<section class="how"><div class="wrap"><h2>' + tx("howTitle") + '</h2><ol class="steps">' +
      '<li><span class="n">1</span><strong>' + tx("step1Title") + '</strong><span class="t">' + tx("step1Text") + '</span></li>' +
      '<li><span class="n">2</span><strong>' + tx("step2Title") + '</strong><span class="t">' + tx("step2Text") + '</span></li>' +
      '<li><span class="n">3</span><strong>' + tx("step3Title") + '</strong><span class="t">' + tx("step3Text") + '</span></li>' +
      '</ol><p class="legal">' + tx("noReturns") + '</p></div></section>' +
      '</main>' +
      '<footer class="foot"><div class="wrap"><span>' + tx("footer") + '</span> · <a id="foot-ig" href="#" target="_blank" rel="noopener"></a></div></footer>' +
      '<div class="overlay" id="overlay" hidden></div>' +
      '<aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" hidden>' +
      '<div class="d-head"><h2 id="drawer-title">Mi pedido</h2><button class="btn ghost" id="close-cart" type="button">Cerrar</button></div>' +
      '<ul class="d-list" id="d-list"></ul>' +
      '<p class="d-empty" id="d-empty">' + tx("cartEmpty") + '</p>' +
      '<div class="d-foot" id="d-foot" hidden>' +
      '<fieldset class="ship" id="ship"><legend>Medio de envío (obligatorio)</legend>' +
      '<label class="ship-opt" data-ship-opt="local"><input type="radio" name="ship" value="local"><span>Envío dentro de Rosario</span><strong id="sp-local"></strong></label>' +
      '<label class="ship-opt" data-ship-opt="pais"><input type="radio" name="ship" value="pais"><span>Envío resto del país - Correo Argentino</span><strong id="sp-pais"></strong></label>' +
      '<label class="ship-opt" data-ship-opt="retiro"><input type="radio" name="ship" value="retiro"><span>Pick Up Point - Fisherton</span><strong>Gratis</strong></label>' +
      '<div class="ship-fields" id="ship-fields" hidden>' +
      '<div class="field"><label for="sh-name">Nombre y apellido</label><input type="text" id="sh-name" autocomplete="name" maxlength="80"></div>' +
      '<div class="field"><label for="sh-addr">Dirección</label><input type="text" id="sh-addr" autocomplete="street-address" maxlength="120"></div>' +
      '<div class="frow"><div class="field"><label for="sh-city">Localidad</label><input type="text" id="sh-city" autocomplete="address-level2" maxlength="60"></div>' +
      '<div class="field"><label for="sh-cp">CP</label><input type="text" id="sh-cp" autocomplete="postal-code" inputmode="numeric" maxlength="10"></div></div></div>' +
      '<p class="form-err" id="ship-err" role="alert"></p></fieldset>' +
      '<div class="sum"><div><span>Subtotal</span><span id="subtotal"></span></div><div><span>Envío</span><span id="ship-line"></span></div></div>' +
      '<div class="total"><span>Total</span><strong id="total">$ 0</strong></div>' +
      '<button class="btn accent" id="wa" type="button" data-act="pay" hidden>Enviar pedido por WhatsApp</button>' +
      '<p class="note" id="d-note"></p>' +
      '<button class="link" id="clear" type="button">Vaciar pedido</button></div></aside>' +
      '<div class="modal" id="modal" hidden><div class="modal-card" id="modal-card" role="dialog" aria-modal="true" aria-labelledby="m-title"></div></div>' +
      '<div class="toast" id="toast" role="status" hidden></div>';
  }

  /* ---------- Dibujo de prendas ---------- */
  var TILE_STYLE = "--tile:var(--tile-bg);--fg:var(--tile-fg)";
  function sil(shape) {
    return '<svg class="sil" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><use href="#s-' + esc(shape) + '"/></svg>';
  }
  function media(p, idx, alt, eager) {
    var u = p.photos && p.photos[idx || 0];
    return sil(p.shape) + (u ? '<img class="photo" src="' + esc(u) + '" alt="' + esc(alt || "") + '"' + (eager ? "" : ' loading="lazy"') + ' decoding="async">' : "");
  }
  function condBadge(p) { return p.cond ? '<span class="badge">' + esc(p.cond) + "</span>" : ""; }

  /* ---------- Render ---------- */
  function renderAll() {
    renderChips();
    renderGrid();
    renderCart();
    renderMisc();
  }
  function renderMisc() {
    var h = igHandle();
    var url = "https://www.instagram.com/" + h + "/";
    var hero = $("hero-ig"), foot = $("foot-ig");
    hero.hidden = foot.hidden = !h;
    hero.href = foot.href = url;
    hero.textContent = "Seguinos en Instagram · @" + h;
    foot.textContent = "@" + h;
  }
  function renderChips() {
    var cats = allCats().filter(function (c, i) {
      return i === 0 || products.some(function (p) { return p.cat === c[0]; });
    });
    if (!cats.some(function (c) { return c[0] === view.cat; })) view.cat = "todo";
    $("cat-chips").innerHTML = cats.map(function (c) {
      return '<button class="chip" type="button" data-cat="' + esc(c[0]) + '" aria-pressed="' + (view.cat === c[0]) + '">' + esc(c[1]) + "</button>";
    }).join("");
    var sizes = [];
    products.forEach(function (p) { if (p.size && sizes.indexOf(p.size) < 0) sizes.push(p.size); });
    sizes.sort(function (a, b) {
      var ia = SIZE_ORDER.indexOf(a), ib = SIZE_ORDER.indexOf(b);
      if (ia < 0) ia = 99;
      if (ib < 0) ib = 99;
      return ia - ib || String(a).localeCompare(String(b));
    });
    if (view.size !== "todos" && sizes.indexOf(view.size) < 0) view.size = "todos";
    $("size-chips").innerHTML = ["todos"].concat(sizes).map(function (s) {
      return '<button class="chip" type="button" data-size="' + esc(s) + '" aria-pressed="' + (view.size === s) + '">' + (s === "todos" ? "Todos" : esc(s)) + "</button>";
    }).join("");
  }
  function visible() {
    var list = products.filter(function (p) {
      return (view.cat === "todo" || p.cat === view.cat) && (view.size === "todos" || p.size === view.size);
    });
    if (view.sort === "menor") list.sort(function (a, b) { return a.price - b.price; });
    else if (view.sort === "mayor") list.sort(function (a, b) { return b.price - a.price; });
    else list.sort(function (a, b) { return b.id - a.id; });
    // Las no disponibles van al final, sin alterar el orden elegido.
    return list.filter(function (p) { return !isTaken(p); }).concat(list.filter(isTaken));
  }
  function cartButton(p) {
    if (isTaken(p)) return '<button class="btn ghost" type="button" disabled>No disponible</button>';
    if (cart.indexOf(p.code) >= 0) return '<button class="btn ghost" type="button" data-remove="' + esc(p.code) + '">Quitar</button>';
    return '<button class="btn accent" type="button" data-add="' + esc(p.code) + '">Agregar</button>';
  }
  function cardHtml(p, i) {
    return '<article class="card' + (isTaken(p) ? " sold" : "") + '">' +
      '<button class="tile" type="button" data-open="' + esc(p.code) + '" style="' + TILE_STYLE + '" aria-label="Ver ' + esc(p.name) + '">' +
      media(p, 0, p.name, i < 4) + condBadge(p) + (isTaken(p) ? '<span class="sold-mark">' + takenLabel(p) + "</span>" : "") + "</button>" +
      '<div class="meta"><h3>' + esc(p.name) + '</h3><p class="sub">' + esc(p.brand) + (p.brand ? " · " : "") + "Talle " + esc(p.size) + '</p><p class="dims">' + esc(p.dims) + "</p></div>" +
      '<div class="buy"><span class="price">' + fmt(p.price) + "</span>" + cartButton(p) + "</div></article>";
  }
  function renderGrid() {
    var grid = $("grid");
    if (status === "loading") { $("result-count").textContent = ""; grid.innerHTML = '<p class="loading">Cargando prendas…</p>'; return; }
    var contact = waNumber()
      ? '<a class="btn ghost" href="https://wa.me/' + waNumber() + '" target="_blank" rel="noopener">Escribinos por WhatsApp</a>'
      : "";
    if (status === "error" && !products.length) {
      $("result-count").textContent = "";
      grid.innerHTML = '<div class="empty"><p>No pudimos cargar el catálogo. Recargá la página en unos segundos.</p>' + contact + "</div>";
      return;
    }
    var list = visible();
    var avail = list.filter(function (p) { return !isTaken(p); }).length;
    $("result-count").textContent = avail + (avail === 1 ? " prenda disponible" : " prendas disponibles");
    if (!products.length) {
      grid.innerHTML = '<div class="empty"><p>Estamos cargando las primeras prendas. Mirá las novedades en Instagram: @' + esc(igHandle()) + "</p></div>";
      return;
    }
    if (!list.length) {
      grid.innerHTML = '<div class="empty"><p>No hay prendas con esos filtros.</p><button class="btn ghost" type="button" data-reset>Ver todo el catálogo</button></div>';
      return;
    }
    grid.innerHTML = list.map(cardHtml).join("");
  }

  /* ---------- Envío ---------- */
  function shipCost() {
    if (ship === "local") return num(CFG.shipLocal, 6000);
    if (ship === "pais") return num(CFG.shipNational, 10000);
    return 0;
  }
  function shipLabel() {
    return ship === "local" ? "Envío dentro de Rosario" : ship === "pais" ? "Envío resto del país - Correo Argentino" : ship === "retiro" ? "Pick Up Point - Fisherton" : "";
  }
  function shipNeedsAddress() { return ship === "local" || ship === "pais"; }
  function subtotal() { return cartItems().reduce(function (s, p) { return s + (Number(p.price) || 0); }, 0); }
  function shipData() {
    return { name: $("sh-name").value.trim(), addr: $("sh-addr").value.trim(), city: $("sh-city").value.trim(), cp: $("sh-cp").value.trim() };
  }
  function shipErr(msg, focusId) {
    $("ship-err").textContent = msg;
    var f = $(focusId);
    if (f) f.focus();
  }
  function validateShip() {
    $("ship-err").textContent = "";
    if (!ship) {
      $("ship-err").textContent = "Elegí un medio de envío para continuar.";
      var r = document.querySelector('input[name="ship"]');
      if (r) r.focus();
      return false;
    }
    if (shipNeedsAddress()) {
      var s = shipData();
      var order = [["name", "sh-name", "tu nombre y apellido"], ["addr", "sh-addr", "la dirección"], ["city", "sh-city", "la localidad"], ["cp", "sh-cp", "el CP"]];
      for (var i = 0; i < order.length; i++) {
        if (!s[order[i][0]]) { shipErr("Completá " + order[i][2] + " para el envío.", order[i][1]); return false; }
      }
    }
    return true;
  }
  function setShip(v) {
    ship = v;
    var labels = document.querySelectorAll("[data-ship-opt]");
    for (var i = 0; i < labels.length; i++) labels[i].classList.toggle("on", labels[i].getAttribute("data-ship-opt") === v);
    $("ship-fields").hidden = !shipNeedsAddress();
    $("ship-err").textContent = "";
    renderCart();
  }
  function resetShip() {
    ship = "";
    var radios = document.querySelectorAll('input[name="ship"]');
    for (var i = 0; i < radios.length; i++) radios[i].checked = false;
    ["sh-name", "sh-addr", "sh-city", "sh-cp"].forEach(function (id) { $(id).value = ""; });
    var labels = document.querySelectorAll("[data-ship-opt]");
    for (var j = 0; j < labels.length; j++) labels[j].classList.remove("on");
    $("ship-fields").hidden = true;
    $("ship-err").textContent = "";
  }

  function orderText() {
    var items = cartItems();
    var sub = subtotal();
    var cost = shipCost();
    var line = "--------------------";
    function clean(v) { return String(v || "").replace(/[*_~]/g, ""); }
    var txt = "Hola! Quiero reservar estas prendas de La Feria:\n\n" +
      "*Detalle del pedido*\n" +
      items.map(function (p) { return "- " + p.name + " (talle " + p.size + ") " + fmt(p.price) + " [" + p.code + "]"; }).join("\n");
    if (ship) {
      txt += "\n" + line + "\n*Datos de envío*\n*Medio de envío:* " + shipLabel() + " (" + (cost ? fmt(cost) : "gratis") + ")";
      if (shipNeedsAddress()) {
        var s = shipData();
        txt += "\n*Nombre y apellido:* " + clean(s.name) + "\n*Dirección:* " + clean(s.addr) + "\n*Localidad:* " + clean(s.city) + "\n*CP:* " + clean(s.cp);
      }
    }
    return txt + "\n" + line + "\n*Total:* " + fmt(sub + cost);
  }

  function renderCart() {
    $("cart-count").textContent = cart.length;
    var items = cartItems();
    $("d-list").innerHTML = items.map(function (p) {
      return '<li class="d-item"><div class="tile" style="' + TILE_STYLE + '">' + media(p, 0, "") + "</div>" +
        "<div><h3>" + esc(p.name) + '</h3><p class="sub">Talle ' + esc(p.size) + (p.brand ? " · " + esc(p.brand) : "") + "</p></div>" +
        '<div class="right"><strong>' + fmt(p.price) + '</strong><button class="link" type="button" data-remove="' + esc(p.code) + '">Quitar</button></div></li>';
    }).join("");
    var empty = items.length === 0;
    $("d-empty").hidden = !empty;
    $("d-foot").hidden = empty;
    var sub = subtotal();
    $("subtotal").textContent = fmt(sub);
    $("sp-local").textContent = fmt(num(CFG.shipLocal, 6000));
    $("sp-pais").textContent = fmt(num(CFG.shipNational, 10000));
    $("ship-line").textContent = !ship ? "Elegí un medio de envío" : shipCost() ? fmt(shipCost()) : "Gratis";
    $("total").textContent = fmt(sub + shipCost());
    var wa = waNumber();
    $("wa").hidden = !wa;
    var ig = igHandle();
    $("d-note").innerHTML = (wa
      ? "Antes de enviar te mostramos los datos para transferir. WhatsApp se abre con el mensaje ya armado. "
      : "Para hacer tu pedido escribinos por mensaje directo de Instagram. ") +
      "El pago y la entrega se acuerdan por ahí, no en esta página." +
      (ig ? ' Instagram: <a href="https://www.instagram.com/' + esc(ig) + '/" target="_blank" rel="noopener">@' + esc(ig) + "</a>" : "");
  }

  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 5000);
  }

  /* ---------- Carrito ---------- */
  function openCart() {
    lastFocus = document.activeElement;
    $("overlay").hidden = false;
    $("drawer").hidden = false;
    document.body.style.overflow = "hidden";
    $("close-cart").focus();
  }
  function closeCart() {
    $("overlay").hidden = true;
    $("drawer").hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus();
  }

  /* ---------- Ventanas ---------- */
  function openModal(html) {
    if ($("modal").hidden) lastFocus = document.activeElement;
    $("modal-card").innerHTML = html;
    $("modal").hidden = false;
    document.body.style.overflow = "hidden";
    var f = $("modal-card").querySelector("button, a, input");
    if (f) f.focus();
  }
  function closeModal() {
    $("modal").hidden = true;
    $("modal-card").innerHTML = "";
    modal = null;
    document.body.style.overflow = $("drawer").hidden ? "" : "hidden";
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus();
  }
  function mHead(title) {
    return '<div class="m-head"><h2 id="m-title">' + esc(title) + '</h2><button class="btn ghost sm" type="button" data-close>Cerrar</button></div>';
  }
  function detailHtml(p, idx) {
    var photos = p.photos || [];
    if (idx >= photos.length) idx = 0;
    var big = '<div class="tile" style="' + TILE_STYLE + '">' + media(p, idx, p.name, true) +
      (isTaken(p) ? '<span class="sold-mark">' + takenLabel(p) + "</span>" : "") + "</div>";
    var thumbs = photos.length > 1
      ? '<div class="thumbs">' + photos.map(function (u, i) {
        return '<button type="button" class="thumb" data-thumb="' + i + '" aria-pressed="' + (i === idx) + '" aria-label="Foto ' + (i + 1) + '"><img src="' + esc(u) + '" alt=""></button>';
      }).join("") + "</div>"
      : "";
    return mHead(p.name) + '<div class="m-body"><div class="detail"><div class="gallery">' + big + thumbs + "</div>" +
      '<div class="info"><div>' + (p.cond ? '<span class="badge" style="position:static;display:inline-block">' + esc(p.cond) + "</span>" : "") + "</div>" +
      '<p class="sub">' + esc(p.brand) + (p.brand ? " · " : "") + "Talle " + esc(p.size) + "</p>" +
      '<p class="dims">' + esc(p.dims) + "</p>" +
      '<p class="price">' + fmt(p.price) + "</p>" + cartButton(p) + "</div></div></div>";
  }
  function openDetail(code, idx) {
    var p = byCode(code);
    if (!p) return;
    modal = { type: "detail", code: code, idx: idx || 0 };
    openModal(detailHtml(p, modal.idx));
  }
  function refreshDetail() {
    if (modal && modal.type === "detail") {
      var p = byCode(modal.code);
      if (!p) { closeModal(); return; }
      var y = $("modal").scrollTop;
      $("modal-card").innerHTML = detailHtml(p, modal.idx);
      $("modal").scrollTop = y;
    }
  }

  /* ---------- Pago y reserva ---------- */
  function payInfo() {
    return { alias: String(CFG.alias || "").trim(), titular: String(CFG.titular || "").trim() };
  }
  function waLink() { return "https://wa.me/" + waNumber() + "?text=" + encodeURIComponent(orderText()); }
  var checking = false;
  // Antes de mostrar los datos para transferir, confirma que las prendas sigan libres.
  function openPay() {
    if (checking || !cartItems().length || !waNumber()) return;
    if (!validateShip()) return;
    var btn = $("wa");
    checking = true;
    btn.disabled = true;
    btn.textContent = "Verificando disponibilidad…";
    loadCatalog().then(function (list) { products = list; status = "ok"; }, function () {}).then(function () {
      checking = false;
      btn.disabled = false;
      btn.textContent = "Enviar pedido por WhatsApp";
      var gone = pruneCart();
      renderAll();
      if (gone.length) { toast(goneMsg(gone)); return; }
      if (cartItems().length) showPay();
    });
  }
  function showPay() {
    var total = subtotal() + shipCost();
    var info = payInfo();
    modal = { type: "pay" };
    openModal(mHead("Transferí para reservar") +
      '<div class="m-body">' +
      '<div class="field"><span class="lbl2">Total a transferir</span><p class="price big">' + fmt(total) + "</p>" +
      '<p class="note">Prendas ' + fmt(subtotal()) + " · " + esc(shipLabel()) + " " + (shipCost() ? fmt(shipCost()) : "(gratis)") + "</p></div>" +
      '<dl class="bank">' +
      '<div><dt>Alias</dt><dd><strong id="pay-alias">' + esc(info.alias) + '</strong> <button class="btn sm ghost" type="button" data-act="copy-alias">Copiar alias</button></dd></div>' +
      "<div><dt>Titular</dt><dd>" + esc(info.titular) + "</dd></div></dl>" +
      '<ol class="steps pay-steps"><li><span class="t">Hacé la transferencia por el total desde tu app del banco.</span></li>' +
      '<li><span class="t">Tocá el botón de abajo y mandá el pedido por WhatsApp junto con el comprobante.</span></li></ol>' +
      '<p class="form-err" id="pay-err" role="alert"></p>' +
      '<p class="note">La reserva queda confirmada cuando te respondemos por WhatsApp con el comprobante recibido.</p>' +
      '<div class="m-foot"><div class="grp"><button class="btn accent" id="pay-go" type="button">Ya transferí, enviar por WhatsApp</button>' +
      '<button class="btn ghost" type="button" data-close>Volver al pedido</button></div></div></div>');
  }
  var sending = false;
  function sendOrder(btn) {
    if (sending) return;
    var codes = cart.slice();
    var link = waLink();
    // Se abre la pestaña ya (si no, el navegador la bloquea) y se completa después de reservar.
    var win = null;
    try { win = window.open("", "_blank"); } catch (e) {}
    sending = true;
    btn.disabled = true;
    btn.textContent = "Reservando tus prendas…";
    function go() {
      if (win && !win.closed) win.location.href = link; else window.location.href = link;
      holdCart();
    }
    reserveCodes(codes).then(function (res) {
      sending = false;
      if (res && res.ok) { go(); return; }
      if (res && res.error === "taken" && Array.isArray(res.taken) && res.taken.length) {
        if (win) win.close();
        res.taken.forEach(function (c) { var p = byCode(c); if (p) p.reserved = true; });
        var gone = pruneCart();
        closeModal();
        renderAll();
        toast(goneMsg(gone.length ? gone : res.taken) + " No transfieras todavía: revisá tu pedido.");
        return;
      }
      go(); // Error del servidor: igual se manda el pedido y se confirma por WhatsApp.
    }, function () {
      sending = false;
      go();
    });
  }
  function holdCart() {
    var now = Date.now();
    cart.forEach(function (c) { holds[c] = now; });
    saveHolds();
    cart = [];
    saveCart();
    resetShip();
    closeModal();
    closeCart();
    renderAll();
    toast("Listo. Mandá el comprobante por WhatsApp para confirmar tu reserva.");
  }
  function copyAlias() {
    var a = payInfo().alias;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(a).then(function () { toast("Alias copiado: " + a); }, function () { toast("Alias: " + a); });
    } else {
      toast("Alias: " + a);
    }
  }

  /* ---------- Eventos ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (t.id === "modal") { closeModal(); return; }
    if (t.id === "overlay") { closeCart(); return; }
    t = t.closest("button, a");
    if (!t) return;
    var d = t.dataset;
    if (d.cat) { view.cat = d.cat; renderChips(); renderGrid(); return; }
    if (d.size) { view.size = d.size; renderChips(); renderGrid(); return; }
    if (t.hasAttribute("data-reset")) { view.cat = "todo"; view.size = "todos"; renderChips(); renderGrid(); return; }
    if (d.add) {
      if (cart.indexOf(d.add) < 0) cart.push(d.add);
      saveCart(); renderGrid(); renderCart(); refreshDetail();
      toast("Agregada a tu pedido.");
      return;
    }
    if (d.remove) {
      cart = cart.filter(function (x) { return x !== d.remove; });
      saveCart(); renderGrid(); renderCart(); refreshDetail(); return;
    }
    if (d.open) { openDetail(d.open, 0); return; }
    if (d.thumb) { if (modal && modal.type === "detail") { modal.idx = Number(d.thumb); refreshDetail(); } return; }
    if (t.hasAttribute("data-close")) { closeModal(); return; }
    if (d.act === "pay") { openPay(); return; }
    if (d.act === "copy-alias") { copyAlias(); return; }
    if (t.id === "pay-go") sendOrder(t);
    else if (t.id === "open-cart") openCart();
    else if (t.id === "close-cart") closeCart();
    else if (t.id === "clear") { cart = []; saveCart(); renderGrid(); renderCart(); }
  });
  document.addEventListener("change", function (e) {
    if (e.target.name === "ship") setShip(e.target.value);
    else if (e.target.id === "sort") { view.sort = e.target.value; renderGrid(); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!$("modal").hidden) closeModal();
    else if (!$("drawer").hidden) closeCart();
  });
  // Si una foto no existe, queda el dibujo de la prenda.
  document.addEventListener("error", function (e) {
    var t = e.target;
    if (t && t.tagName === "IMG") {
      if (t.classList.contains("photo")) t.hidden = true;
      else if (t.parentNode && t.parentNode.classList.contains("thumb")) t.parentNode.hidden = true;
    }
  }, true);

  /* ---------- Arranque ---------- */
  $("root").innerHTML = shell();
  holds = loadHolds();
  saveHolds();
  cart = loadCart();
  renderAll();
  function refresh(first) {
    return loadCatalog().then(function (list) {
      products = list;
      status = "ok";
    }, function () {
      if (first) status = "error";
    }).then(function () {
      var gone = pruneCart();
      renderGrid();
      renderChips();
      renderCart();
      if (first) renderMisc(); else refreshDetail();
      if (gone.length && !first) toast(goneMsg(gone));
    });
  }
  refresh(true);
  // Se actualiza sola cada minuto y al volver a la pestaña.
  setInterval(function () { if (!document.hidden && !checking && !sending && (!modal || modal.type !== "pay")) refresh(false); }, 60000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden && !checking && !sending) refresh(false); });
})();
