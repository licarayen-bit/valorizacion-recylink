/**
 * ============================================================
 * RECYLINK · Apps Script del Sheet — VERSIÓN FUSIONADA
 * ============================================================
 * Este archivo reemplaza por completo tu Code.gs actual.
 * Contiene DOS cosas que antes vivían en proyectos separados
 * y que ahora conviven en el mismo Web App (solo puede haber
 * un doGet y un doPost por proyecto):
 *
 *  1) LO QUE YA TENÍAS (sin tocar la lógica):
 *     - doPost: escribe valorización / metas / trazabilidad / objetivos / total residuos
 *     - doGet "clásico": devuelve el volcado plano de las hojas
 *       (se usa para tu otro desarrollo, el que NO es este visor, y para
 *       el visor HTML de valorización/trazabilidad valorizacion-recylink.html)
 *
 *  2) LO NUEVO (para el visor HTML de trazabilidad):
 *     - Se activa SOLO si la request trae ?callback=... o ?visor=1
 *     - Si no viene ninguno de esos dos parámetros, doGet responde
 *       EXACTAMENTE igual que antes → tu otro desarrollo no se entera
 *       de este cambio.
 * ============================================================
 */


// ============================================================
// 1) TU DOPOST ORIGINAL — SIN CAMBIOS + soporte para Total Residuos
// ============================================================

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tipo = data.tipo;

    if (tipo === 'valorizacion') writeValorizacion(ss, data);
    else if (tipo === 'valorizacion_metas') writeMetas(ss, data);
    else if (tipo === 'trazabilidad') writeTrazabilidad(ss, data);
    else if (tipo === 'objetivos') writeObjetivos(ss, data);
    else if (tipo === 'totalResiduos') writeTotalResiduos(ss, data);

    return ContentService
      .createTextOutput(JSON.stringify({ok: true}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({error: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function writeValorizacion(ss, data) {
  const sheet = ss.getSheetByName('♻️ Valorización') || ss.getSheetByName('Valorización');
  if (!sheet) throw new Error('Hoja Valorización no encontrada');
  const startRow = 6;
  const lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    const col = sheet.getRange(startRow, 1, lastRow - startRow + 1, 1).getValues();
    const ids = new Set(data.filas.map(f => f[0]));
    const toDelete = [];
    col.forEach((r, i) => { if (ids.has(r[0])) toDelete.push(startRow + i); });
    toDelete.reverse().forEach(r => sheet.deleteRow(r));
  }
  const insertRow = sheet.getLastRow() + 1;
  data.filas.forEach((fila, i) => {
    sheet.getRange(insertRow + i, 1, 1, fila.length).setValues([fila]);
  });
}

function writeMetas(ss, data) {
  const sheet = ss.getSheetByName('♻️ Valorización') || ss.getSheetByName('Valorización');
  if (!sheet) throw new Error('Hoja Valorización no encontrada');
  const startRow = 6;
  const lastRow = sheet.getLastRow();
  if (lastRow < startRow) return;

  const rows = sheet.getRange(startRow, 1, lastRow - startRow + 1, sheet.getLastColumn()).getValues();

  data.filas.forEach(function(fila) {
    const id = fila[0];
    let found = false;
    rows.forEach(function(row, i) {
      if (row[0] === id && row[2] === 'Meta %') {
        sheet.getRange(startRow + i, 1, 1, fila.length).setValues([fila]);
        found = true;
      }
    });
    if (!found) {
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, fila.length).setValues([fila]);
    }
  });
}

function writeTrazabilidad(ss, data) {
  const sheet = ss.getSheetByName('📊 Trazabilidad_Docs') || ss.getSheetByName('Trazabilidad_Docs');
  if (!sheet) throw new Error('Hoja Trazabilidad_Docs no encontrada');
  const startRow = 6;
  const lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    const cols = sheet.getRange(startRow, 1, lastRow - startRow + 1, 3).getValues();
    const keys = new Set(data.filas.map(f => f[0] + '|' + f[2]));
    const toDelete = [];
    cols.forEach((r, i) => { if (keys.has(r[0] + '|' + r[2])) toDelete.push(startRow + i); });
    toDelete.reverse().forEach(r => sheet.deleteRow(r));
  }
  const insertRow = sheet.getLastRow() + 1;
  data.filas.forEach((fila, i) => {
    sheet.getRange(insertRow + i, 1, 1, fila.length).setValues([fila]);
  });
}

function writeObjetivos(ss, data) {
  const sheet = ss.getSheetByName('🎯 Objetivos') || ss.getSheetByName('Objetivos');
  if (!sheet) throw new Error('Hoja Objetivos no encontrada');
  const startRow = 6;
  const lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    const cols = sheet.getRange(startRow, 1, lastRow - startRow + 1, 3).getValues();
    const keys = new Set(data.filas.map(f => f[0] + '|' + f[2]));
    const toDelete = [];
    cols.forEach((r, i) => { if (keys.has(r[0] + '|' + r[2])) toDelete.push(startRow + i); });
    toDelete.reverse().forEach(r => sheet.deleteRow(r));
  }
  const insertRow = sheet.getLastRow() + 1;
  data.filas.forEach((fila, i) => {
    sheet.getRange(insertRow + i, 1, 1, fila.length).setValues([fila]);
  });
}

// ── NUEVO: Total Residuos + RESPEL (solo Copec) ──

// Busca en la columna A la fila cuyo valor sea exactamente "valorEsperado"
// (ej. "Sucursal" o "Residuo") y devuelve el número de fila (1-indexed).
// Evita asumir que el header está en una fila fija, ya que estas 2 hojas
// no tienen las filas decorativas de título/instrucciones que sí tienen
// las 3 hojas principales.
function buscarFilaEncabezado_(sheet, valorEsperado) {
  var lastRow = Math.min(sheet.getLastRow(), 20);
  if (lastRow < 1) return null;
  var col = sheet.getRange(1, 1, lastRow, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0] || '').trim() === valorEsperado) return i + 1;
  }
  return null;
}

// Reemplaza TODAS las filas de datos de "Total Residuos" por las que manda
// el cliente. El cliente siempre envía el set completo vigente (calculado
// desde el Excel cargado), así que no hace falta borrado selectivo por
// empresa_id como en writeValorizacion (esta hoja no tiene esa columna).
function writeTotalResiduos(ss, data) {
  var sheet = ss.getSheetByName('Total Residuos');
  if (!sheet) throw new Error('Hoja "Total Residuos" no encontrada');
  var headerRow = buscarFilaEncabezado_(sheet, 'Sucursal');
  if (!headerRow) throw new Error('No se encontro la fila de encabezado ("Sucursal") en Total Residuos');
  var startRow = headerRow + 1;
  var numCols = 7; // Sucursal | Mes | Residuo | Valorizado/No Valorizado | Respel no respel | Total KG | Total M3
  var lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    sheet.getRange(startRow, 1, lastRow - startRow + 1, numCols).clearContent();
  }
  if (data.filas && data.filas.length > 0) {
    sheet.getRange(startRow, 1, data.filas.length, data.filas[0].length).setValues(data.filas);
  }
}

// Lee la hoja RESPEL (Residuo -> TRUE/FALSE) como array de objetos,
// igual formato que usa doGetClasico_ para las otras 3 hojas.
function readRespelSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('RESPEL');
  if (!sheet) return [];
  var headerRow = buscarFilaEncabezado_(sheet, 'Residuo');
  if (!headerRow) return [];
  var startRow = headerRow + 1;
  var lastRow = sheet.getLastRow();
  if (lastRow < startRow) return [];
  var headers = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  var data = sheet.getRange(startRow, 1, lastRow - startRow + 1, sheet.getLastColumn()).getValues();
  return data.filter(function (r) { return r[0] !== ''; }).map(function (r) {
    var obj = {};
    headers.forEach(function (h, i) { if (h) obj[h] = r[i]; });
    return obj;
  });
}


// ============================================================
// 2) DOGET FUSIONADO — despacha según el parámetro de la URL
// ============================================================

function doGet(e) {
  const quiereVisor = e && e.parameter && (e.parameter.callback || e.parameter.visor === '1');
  if (quiereVisor) return doGetVisor_(e);
  return doGetClasico_(e);
}


// ── 2a) TU DOGET ORIGINAL, RENOMBRADO (comportamiento intacto) + respel ──
function doGetClasico_(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const startRow = 6;

  function readSheet(nombre) {
    const sheet = ss.getSheetByName(nombre);
    if (!sheet || sheet.getLastRow() < startRow) return [];
    const headers = sheet.getRange(5, 1, 1, sheet.getLastColumn()).getValues()[0];
    const data = sheet.getRange(startRow, 1, sheet.getLastRow() - startRow + 1, sheet.getLastColumn()).getValues();
    return data.filter(r => r[0] !== '').map(r => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = r[i]; });
      return obj;
    });
  }

  const result = {
    valorizacion: readSheet('♻️ Valorización') || readSheet('Valorización'),
    trazabilidad: readSheet('📊 Trazabilidad_Docs') || readSheet('Trazabilidad_Docs'),
    objetivos: readSheet('🎯 Objetivos') || readSheet('Objetivos'),
    respel: readRespelSheet_()
  };

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}


// ── 2b) VISOR DE TRAZABILIDAD — lo nuevo ──

var EMPRESA_NOMBRE  = "COPEC";
var EMPRESA_COLOR   = "#175CD3";
var EMPRESA_COLOR_L = "#EFF8FF";

// Cada hoja se busca probando primero el nombre CON emoji (como aparece
// en tus pestañas reales) y si no existe, el nombre sin emoji.
var SHEET_TRAZA_CANDIDATOS = ['📊 Trazabilidad_Docs', 'Trazabilidad_Docs'];
var SHEET_VAL_CANDIDATOS   = ['♻️ Valorización', 'Valorización'];
var SHEET_CSE_CANDIDATOS   = ['👥 Seguimiento_CSE', 'Seguimiento_CSE'];

var MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
             "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// (el HTML original traía también "Ingreso/Costo", pero esa columna
//  no existe en el Sheet real, así que se excluye)
var DOC_COLS = ["Cert. tratamiento","Factura","Cert. declaración","Transportista","Disposición final"];


function doGetVisor_(e) {
  var payload;
  try {
    payload = buildPayload_();
  } catch (err) {
    payload = { error: true, message: String(err) };
  }

  var callback = e && e.parameter && e.parameter.callback;
  if (callback) {
    var js = callback + "(" + JSON.stringify(payload) + ");";
    return ContentService.createTextOutput(js)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function buildPayload_() {
  var traza = leerTrazabilidad_();
  var val   = leerValorizacion_();

  var sucursalToEmpId = {};
  Object.keys(traza.sucursales).forEach(function (empId) {
    sucursalToEmpId[traza.sucursales[empId]] = empId;
  });

  var cse   = leerCSE_(sucursalToEmpId);
  var empresas = construirEmpresas_(traza, val, cse);
  var mesesActivos = calcularMesesActivos_(traza, val, cse);

  return {
    generatedAt: new Date().toISOString(),
    EMPRESA_NOMBRE: EMPRESA_NOMBRE,
    EMPRESA_COLOR: EMPRESA_COLOR,
    EMPRESA_COLOR_L: EMPRESA_COLOR_L,
    MESES_ACTIVOS: mesesActivos,
    EMPRESAS: empresas,
    VAL_DATA: val
  };
}


// ── Lectura de hojas ──

function encontrarHoja_(candidatos) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  for (var i = 0; i < candidatos.length; i++) {
    var sheet = ss.getSheetByName(candidatos[i]);
    if (sheet) return sheet;
  }
  throw new Error("No se encontró ninguna hoja llamada: " + candidatos.join(" / "));
}

/** Ubica la fila de encabezado (busca "empresa_id" en la columna A). */
function getSheetRows_(candidatos) {
  var sheet = encontrarHoja_(candidatos);
  var data = sheet.getDataRange().getValues();
  var headerRowIdx = -1;
  for (var i = 0; i < data.length; i++) {
    var cell = String(data[i][0] || "").trim().toLowerCase();
    if (cell === "empresa_id") { headerRowIdx = i; break; }
  }
  if (headerRowIdx === -1) {
    throw new Error("No se encontró la fila de encabezado ('empresa_id') en: " + sheet.getName());
  }

  var header = data[headerRowIdx].map(function (h) { return String(h || "").trim(); });
  var rows = data.slice(headerRowIdx + 1);
  return { header: header, rows: rows };
}

function leerTrazabilidad_() {
  var sr = getSheetRows_(SHEET_TRAZA_CANDIDATOS);
  var h = sr.header;
  var idxEmp = h.indexOf("empresa_id");
  var idxSuc = h.indexOf("Sucursal");
  var idxMes = h.indexOf("Mes");
  var idxRes = h.indexOf("Residuo");
  var idxImp = h.indexOf("Importaciones");
  var docIdx = DOC_COLS.map(function (c) { return h.indexOf(c); });

  var sucursales = {};
  var porEmpresaMes = {};

  sr.rows.forEach(function (r) {
    var empId = String(r[idxEmp] || "").trim();
    if (!empId) return;
    var suc = String(r[idxSuc] || "").trim();
    var mes = String(r[idxMes] || "").trim();
    var residuo = String(r[idxRes] || "").trim();
    if (!mes || !residuo) return;

    sucursales[empId] = suc;

    var docs = {};
    DOC_COLS.forEach(function (c, i) {
      var col = docIdx[i];
      docs[c] = col === -1 ? null : normalizeInt_(r[col]);
    });

    porEmpresaMes[empId] = porEmpresaMes[empId] || {};
    porEmpresaMes[empId][mes] = porEmpresaMes[empId][mes] || [];
    porEmpresaMes[empId][mes].push({
      nombre: residuo,
      imp: idxImp === -1 ? null : normalizeInt_(r[idxImp]),
      docs: docs
    });
  });

  return { sucursales: sucursales, porEmpresaMes: porEmpresaMes };
}

function leerValorizacion_() {
  var sr = getSheetRows_(SHEET_VAL_CANDIDATOS);
  var h = sr.header;
  var idxEmp = h.indexOf("empresa_id");
  var idxTipo = h.indexOf("Tipo");
  var mesIdx = MESES.map(function (m) { return h.indexOf(m); });

  var valData = {};

  sr.rows.forEach(function (r) {
    var empId = String(r[idxEmp] || "").trim();
    if (!empId) return;
    var tipo = String(r[idxTipo] || "").trim().toLowerCase();

    valData[empId] = valData[empId] || { meses: {}, meta: {} };

    MESES.forEach(function (m, i) {
      var col = mesIdx[i];
      if (col === -1) return;
      var val = normalizePercent_(r[col]);
      if (val === null) return;
      if (tipo.indexOf("real") !== -1) valData[empId].meses[m] = val;
      else if (tipo.indexOf("meta") !== -1) valData[empId].meta[m] = val;
    });
  });

  return valData;
}

// sucursalToEmpId: mapa "nombre de sucursal" -> empresa_id real, construido desde
// Trazabilidad_Docs (la fuente de verdad). Seguimiento_CSE no trae un empresa_id
// útil en su columna A (siempre dice "Copec"), así que el cruce real es por nombre
// de sucursal — y esos nombres ya fueron normalizados en el Sheet para coincidir.
function leerCSE_(sucursalToEmpId) {
  var sr = getSheetRows_(SHEET_CSE_CANDIDATOS);
  var h = sr.header;
  var idxSuc = h.indexOf("Sucursal");
  var idxAccion = h.indexOf("Acción CSE");
  var mesIdx = MESES.map(function (m) { return h.indexOf(m); });

  var mapAccion = {
    "Correo seguimiento": "correo",
    "Reunión seguimiento": "reunion",
    "Encuesta seguimiento": "encuesta"
  };

  var cseData = {};
  var anualData = {};

  sr.rows.forEach(function (r) {
    var sucNombre = String(r[idxSuc] || "").trim();
    if (!sucNombre) return;

    var empId = sucursalToEmpId[sucNombre];
    if (!empId) return; // sucursal que aún no existe en Trazabilidad_Docs — se ignora

    var accion = String(r[idxAccion] || "").trim();
    if (!accion) return;

    cseData[empId] = cseData[empId] || { correo: {}, reunion: {}, encuesta: {}, fechas: {} };
    anualData[empId] = anualData[empId] || {};
    anualData[empId][accion] = anualData[empId][accion] || {};

    var key = mapAccion[accion];

    MESES.forEach(function (m, i) {
      var col = mesIdx[i];
      if (col === -1) return;
      var v = normalizeSiNo_(r[col]);
      if (v === undefined) return;
      anualData[empId][accion][m] = v;
      if (key) cseData[empId][key][m] = v;
    });
  });

  return { cseData: cseData, anualData: anualData };
}


// ── Construcción del modelo para el visor ──

function construirEmpresas_(traza, val, cse) {
  var empresas = [];

  Object.keys(traza.sucursales).sort().forEach(function (empId) {
    var sucursal = traza.sucursales[empId];

    var mensual = {};
    var mesesDeEstaSucursal = Object.keys(traza.porEmpresaMes[empId] || {});
    mesesDeEstaSucursal.forEach(function (mes) {
      mensual[mes] = {
        residuos: traza.porEmpresaMes[empId][mes],
        pendiente: "",
        obs: ""
      };
    });

    var objetivos = [{ texto: "100% Trazabilidad" }];

    var valInfo = val[empId] || { meses: {}, meta: {} };
    var mesesValOrdenados = Object.keys(valInfo.meses)
      .sort(function (a, b) { return MESES.indexOf(a) - MESES.indexOf(b); });
    var ultimoMesVal = mesesValOrdenados[mesesValOrdenados.length - 1];

    var avanceVal = ultimoMesVal !== undefined ? valInfo.meses[ultimoMesVal] : null;
    var metaVal = (ultimoMesVal !== undefined && valInfo.meta[ultimoMesVal] !== undefined)
      ? valInfo.meta[ultimoMesVal] : null;

    var textoVal = metaVal !== null ? (metaVal + "% Valorización") : "Meta Valorización (sin definir)";
    objetivos.push({
      texto: textoVal,
      avance: avanceVal,
      ok: (metaVal !== null && avanceVal !== null) ? (avanceVal >= metaVal) : null
    });

    var cseInfo = cse.cseData[empId] || { correo: {}, reunion: {}, encuesta: {}, fechas: {} };
    var anualInfo = cse.anualData[empId] || {};

    empresas.push({
      id: empId,
      nombre: EMPRESA_NOMBRE,
      sucursal: sucursal,
      letra: letraFromSucursal_(sucursal),
      color: EMPRESA_COLOR,
      colorBg: EMPRESA_COLOR_L,
      logo: null,
      objetivos: objetivos,
      cse: cseInfo,
      mensual: mensual,
      anual: anualInfo
    });
  });

  return empresas;
}

function calcularMesesActivos_(traza, val, cse) {
  var maxIdx = -1;
  function scan(obj) {
    Object.keys(obj || {}).forEach(function (m) {
      var idx = MESES.indexOf(m);
      if (idx > maxIdx) maxIdx = idx;
    });
  }
  Object.keys(traza.porEmpresaMes).forEach(function (emp) { scan(traza.porEmpresaMes[emp]); });
  Object.keys(val).forEach(function (emp) { scan(val[emp].meses); scan(val[emp].meta); });
  Object.keys(cse.anualData).forEach(function (emp) {
    Object.keys(cse.anualData[emp]).forEach(function (accion) { scan(cse.anualData[emp][accion]); });
  });
  if (maxIdx < 0) return [];
  return MESES.slice(0, maxIdx + 1);
}


// ── Helpers de normalización ──

function normalizeInt_(raw) {
  if (raw === "" || raw === null || raw === undefined) return null;
  var n = Number(raw);
  return isNaN(n) ? null : n;
}

function normalizePercent_(raw) {
  if (raw === "" || raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    var pct = raw <= 1 ? raw * 100 : raw;
    return Math.round(pct * 10) / 10;
  }
  var s = String(raw).trim();
  if (s === "") return null;
  s = s.replace("%", "").replace(",", ".");
  var n = parseFloat(s);
  return isNaN(n) ? null : Math.round(n * 10) / 10;
}

function normalizeSiNo_(raw) {
  if (raw === "" || raw === null || raw === undefined) return undefined;
  var s = String(raw).trim().toUpperCase();
  if (s === "SI" || s === "SÍ") return true;
  if (s === "NO") return false;
  return undefined;
}

function letraFromSucursal_(s) {
  var stop = ["de", "la", "el", "los", "las", "del", "y"];
  var words = String(s || "").split(/\s+/).filter(function (w) {
    return w && stop.indexOf(w.toLowerCase()) === -1;
  });
  var letras = words.slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join("");
  if (letras.length < 2 && s && s.length >= 2) letras = s.substring(0, 2).toUpperCase();
  return letras || "??";
}


// ── Utilidad para probar desde el editor (Ejecutar → testBuildPayload) ──
function testBuildPayload() {
  var payload = buildPayload_();
  Logger.log(JSON.stringify(payload, null, 2));
}
