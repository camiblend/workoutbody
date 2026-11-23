/**
 * WorkOutBody — backend en Google Apps Script.
 *
 * Recibe los cambios que envía la app (sesiones, medidas, ajustes) y los
 * escribe en este Google Sheet. Ver README → "Configurar Google Sheet".
 *
 * Seguridad: cada petición debe traer el token secreto guardado en
 * Configuración del proyecto → Propiedades de la secuencia de comandos → TOKEN.
 * El token NO está escrito en este archivo (el repo es público).
 *
 * Columnas: el script escribe por NOMBRE de columna, no por posición.
 * Puedes reordenar columnas o agregar columnas nuevas (a mano o desde la app)
 * sin romper nada. Si la app envía un campo que no existe, se crea la columna.
 */

// Pestañas, sus columnas iniciales y la(s) columna(s) que identifican cada fila
const SHEETS = {
  sessions: {
    key: ['session_id'],
    headers: ['session_id', 'date', 'week_start', 'muscle_group', 'routine_id',
              'warmup_min', 'cooldown_min', 'is_extra', 'completed_at'],
  },
  session_exercises: {
    key: ['session_id', 'exercise_id'],
    headers: ['session_id', 'exercise_id', 'exercise_name', 'done', 'weight_kg', 'notes'],
  },
  body_measurements: {
    key: ['measurement_id'],
    headers: ['measurement_id', 'date', 'weight_kg', 'waist_cm', 'hip_cm',
              'bust_cm', 'arm_cm', 'thigh_cm'],
  },
  settings: {
    key: ['key'],
    headers: ['key', 'value'],
  },
};

// ======================================================================
// Ejecutar UNA vez desde el editor (botón ▶ Ejecutar, función "setup"):
// crea las pestañas con sus encabezados y genera el token secreto.
// ======================================================================
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(function (name) { getSheet(ss, name); });

  const props = PropertiesService.getScriptProperties();
  let token = props.getProperty('TOKEN');
  if (!token) {
    token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
    props.setProperty('TOKEN', token);
  }
  Logger.log('Listo. Tu token es: ' + token);
  Logger.log('Cópialo en la app: Settings → Token.');
}

// ======================================================================
// Puntos de entrada web
// ======================================================================

/** GET: solo para comprobar que el despliegue responde (abrir la URL en el navegador). */
function doGet() {
  return json({ ok: true, app: 'WorkOutBody' });
}

/**
 * POST: la app envía { token, changes: [...] } como texto plano (evita CORS).
 * Cada change: { key, kind: 'session'|'measurement'|'setting', op: 'upsert'|'delete', id, data }
 * Responde { ok: true, results: [{ key, ok, error? }] }
 */
function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'Invalid JSON' });
  }

  const expected = PropertiesService.getScriptProperties().getProperty('TOKEN');
  if (!expected || body.token !== expected) {
    return json({ ok: false, error: 'Invalid token' });
  }

  // Evita que dos peticiones escriban al mismo tiempo
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const results = (body.changes || []).map(function (change) {
      try {
        applyChange(ss, change);
        return { key: change.key, ok: true };
      } catch (err) {
        return { key: change.key, ok: false, error: String(err && err.message || err) };
      }
    });
    return json({ ok: true, results: results });
  } finally {
    lock.releaseLock();
  }
}

// ======================================================================
// Aplicar un cambio
// ======================================================================

function applyChange(ss, change) {
  const data = change.data || {};

  if (change.kind === 'session') {
    if (change.op === 'delete') {
      deleteRows(ss, 'sessions', { session_id: change.id });
      deleteRows(ss, 'session_exercises', { session_id: change.id });
      return;
    }
    const exercises = data.exercises || [];
    const row = Object.assign({}, data);
    delete row.exercises;
    upsertRow(ss, 'sessions', row);
    exercises.forEach(function (ex) {
      upsertRow(ss, 'session_exercises', Object.assign({ session_id: data.session_id }, ex));
    });
    return;
  }

  if (change.kind === 'measurement') {
    if (change.op === 'delete') {
      deleteRows(ss, 'body_measurements', { measurement_id: change.id });
    } else {
      upsertRow(ss, 'body_measurements', data);
    }
    return;
  }

  if (change.kind === 'setting') {
    if (change.op === 'delete') {
      deleteRows(ss, 'settings', { key: change.id });
    } else {
      upsertRow(ss, 'settings', { key: data.key, value: data.value });
    }
    return;
  }

  throw new Error('Unknown kind: ' + change.kind);
}

// ======================================================================
// Ayudantes de hoja
// ======================================================================

/** Devuelve la pestaña; si no existe la crea con sus encabezados. */
function getSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, SHEETS[name].headers.length).setValues([SHEETS[name].headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Lee los encabezados y agrega al final los campos que falten. */
function ensureHeaders(sheet, fields) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  let headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  if (headers.length === 1 && headers[0] === '') headers = [];
  const missing = fields.filter(function (f) { return headers.indexOf(f) === -1; });
  if (missing.length) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
    headers = headers.concat(missing);
  }
  return headers;
}

/** Busca la fila cuyas columnas clave coinciden. Devuelve índice (0 = encabezado) o -1. */
function findRow(values, headers, match) {
  const cols = Object.keys(match).map(function (k) { return headers.indexOf(k); });
  for (let r = 1; r < values.length; r++) {
    const ok = Object.keys(match).every(function (k, i) {
      return cols[i] !== -1 && String(values[r][cols[i]]) === String(match[k]);
    });
    if (ok) return r;
  }
  return -1;
}

/** Valor JS → celda. null/undefined → vacío. */
function toCell(value) {
  return value === null || value === undefined ? '' : value;
}

/** Crea o actualiza una fila según las columnas clave de la pestaña. */
function upsertRow(ss, name, obj) {
  const sheet = getSheet(ss, name);
  const headers = ensureHeaders(sheet, Object.keys(obj));
  const values = sheet.getDataRange().getValues();

  const match = {};
  SHEETS[name].key.forEach(function (k) { match[k] = obj[k]; });
  const r = findRow(values, headers, match);

  // Partimos de la fila existente para NO borrar columnas que la app no envía
  // (ej. una columna que agregaste a mano).
  const row = r === -1 ? headers.map(function () { return ''; }) : values[r].slice();
  while (row.length < headers.length) row.push('');
  Object.keys(obj).forEach(function (k) { row[headers.indexOf(k)] = toCell(obj[k]); });

  if (r === -1) {
    sheet.appendRow(row);
  } else {
    sheet.getRange(r + 1, 1, 1, row.length).setValues([row]);
  }
}

/** Borra todas las filas que coinciden (de abajo hacia arriba). */
function deleteRows(ss, name, match) {
  const sheet = getSheet(ss, name);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const cols = Object.keys(match).map(function (k) { return headers.indexOf(k); });
  for (let r = values.length - 1; r >= 1; r--) {
    const ok = Object.keys(match).every(function (k, i) {
      return cols[i] !== -1 && String(values[r][cols[i]]) === String(match[k]);
    });
    if (ok) sheet.deleteRow(r + 1);
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
