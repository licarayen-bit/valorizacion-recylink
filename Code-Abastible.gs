/**
 * ============================================================
 * RECYLINK · Apps Script del Sheet de ABASTIBLE
 * ============================================================
 * Reemplaza por completo el Code.gs actual del proyecto de Apps Script
 * ligado al Sheet de Abastible. Cambios respecto al que había:
 *
 * 1) NUEVO: soporte para tipo:'totalResiduos' en doPost, que sincroniza
 *    la hoja "Total Residuos" (Sucursal | Mes | Residuo |
 *    Valorizado/No Valorizado | Respel no respel | Total KG | Total M3).
 *    Requiere crear esa pestaña manualmente en el Sheet (con esos
 *    headers, en cualquier fila — el código ubica la fila de encabezado
 *    buscando "Sucursal" en la columna A).
 *
 * 2) FIX: writeObjetivos borraba TODAS las filas de la empresa completa
 *    (agrupaba por el primer token del empresa_id, ej. "abastible"),
 *    así que sincronizar un mes borraba el histórico de objetivos de
 *    TODAS las sucursales y meses. Ahora borra solo por
 *    empresa_id + mes exacto, igual que ya se corrigió para Socovesa.
 *
 * No se agregó lectura de una hoja "RESPEL" en doGet: Abastible no la
 * necesita, la clasificación Respel/No respel se resuelve en el JS del
 * visor por nombre de residuo (ya tiene un residuo llamado literalmente
 * "RESPEL" en sus datos).
 * ============================================================
 */

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

// FIX: antes borraba por prefijo de empresa completo (data.filas[0][0].split('_')[0]),
// lo que eliminaba el histórico de objetivos de TODAS las sucursales/meses de Abastible
// al sincronizar. Ahora borra solo las filas cuyo empresa_id+mes coincide exactamente
// con lo que se está reinsertando (igual que writeTrazabilidad y que la corrección ya
// aplicada en Socovesa).
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

// ── NUEVO: Total Residuos ──

// Busca en la columna A la fila cuyo valor sea exactamente "valorEsperado"
// (ej. "Sucursal") y devuelve el número de fila (1-indexed). Evita asumir
// que el header está en una fila fija, ya que "Total Residuos" no tiene
// las filas decorativas de título que sí tienen las hojas principales.
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

function doGet(e) {
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
    objetivos: readSheet('🎯 Objetivos') || readSheet('Objetivos')
  };

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
