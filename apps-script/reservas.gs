/**
 * La Feria · reservas automáticas
 * Pegá este código en tu planilla: Extensiones → Apps Script.
 *
 * - La tienda lee las prendas en vivo desde acá (sin la demora de 5 minutos).
 * - Cuando alguien envía un pedido, sus prendas pasan a "Reservada" y se anota
 *   la fecha y hora en la columna "Reservado el".
 * - Las reservas NO vencen solas: si te pagan, cambiala a "Vendida";
 *   si no te pagan, cambiala a "Disponible".
 */

// Número de la pestaña del catálogo (es el "gid=" del link que publicaste).
var SHEET_GID = 1132895453;
// Máximo de prendas por pedido (evita que alguien reserve todo el catálogo).
var MAX_ITEMS = 15;

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === SHEET_GID) return sheets[i];
  }
  return sheets[0];
}

function norm_(s) {
  return String(s == null ? "" : s).toLowerCase().normalize("NFD")
    .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ]+/g, " ").trim();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Fila de títulos: la primera fila que tenga algo escrito.
function headerIndex_(values) {
  for (var r = 0; r < values.length; r++) {
    if (values[r].some(function (c) { return String(c).trim() !== ""; })) return r;
  }
  return -1;
}

function findCol_(headers, names) {
  for (var i = 0; i < headers.length; i++) {
    if (names.indexOf(norm_(headers[i])) >= 0) return i;
  }
  return -1;
}

// Disponible = vacío o cualquier cosa que no sea reservada, vendida u oculta.
function isAvailable_(v) {
  var n = norm_(v);
  return !/^(reserv|vendid|agotad|no\b|ocult|no publicar|borrador)/.test(n);
}

/** La tienda pide el catálogo. */
function doGet() {
  var rows = getSheet_().getDataRange().getDisplayValues();
  return json_({ ok: true, rows: rows });
}

/** La tienda pide reservar las prendas de un pedido. */
function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: "bad_request" }); }
  var codes = (Array.isArray(body.codes) ? body.codes : [])
    .map(function (c) { return String(c).toUpperCase().replace(/\s+/g, ""); })
    .filter(function (c) { return /^[A-Z0-9-]{2,20}$/.test(c); })
    .slice(0, MAX_ITEMS);
  if (!codes.length) return json_({ ok: false, error: "empty" });

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return json_({ ok: false, error: "busy" });
  try {
    var sh = getSheet_();
    var values = sh.getDataRange().getValues();
    var h = headerIndex_(values);
    if (h < 0) return json_({ ok: false, error: "empty_sheet" });
    var headers = values[h];
    var codeCol = findCol_(headers, ["codigo", "cod", "sku", "codigo de producto", "codigo interno"]);
    var availCol = findCol_(headers, ["disponibilidad", "stock", "disponible"]);
    var whenCol = findCol_(headers, ["reservado el"]);
    var lastCol = sh.getLastColumn();
    if (availCol < 0) { availCol = lastCol; sh.getRange(h + 1, availCol + 1).setValue("Disponibilidad"); lastCol++; }
    if (whenCol < 0) { whenCol = lastCol; sh.getRange(h + 1, whenCol + 1).setValue("Reservado el"); }

    // Ubica la fila de cada código (las prendas sin código llegan como FILA + número).
    var rowOf = {};
    if (codeCol >= 0) {
      for (var r = h + 1; r < values.length; r++) {
        var c = String(values[r][codeCol]).toUpperCase().replace(/\s+/g, "");
        if (c && rowOf[c] == null) rowOf[c] = r;
      }
    }
    var targets = [], taken = [];
    codes.forEach(function (code) {
      var r = rowOf[code];
      var m = code.match(/^FILA(\d+)$/);
      if (r == null && m) r = Number(m[1]) - 1;
      if (r == null || r <= h || r >= values.length || !isAvailable_(values[r][availCol])) taken.push(code);
      else targets.push(r);
    });
    // Si alguna ya no está, no se reserva nada y la tienda le avisa a la clienta.
    if (taken.length) return json_({ ok: false, error: "taken", taken: taken });

    var now = new Date();
    targets.forEach(function (r) {
      sh.getRange(r + 1, availCol + 1).setValue("Reservada");
      sh.getRange(r + 1, whenCol + 1).setValue(now);
    });
    SpreadsheetApp.flush();
    return json_({ ok: true, reserved: codes });
  } finally {
    lock.releaseLock();
  }
}

/** Para probar desde el editor: reserva de mentira que no escribe nada. */
function probar() {
  var rows = getSheet_().getDataRange().getDisplayValues();
  Logger.log("Pestaña: " + getSheet_().getName() + " · filas: " + rows.length);
  Logger.log("Títulos: " + rows[headerIndex_(rows)].join(" | "));
}
