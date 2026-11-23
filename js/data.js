// data.js — las operaciones de la app sobre los datos guardados en el teléfono.
// Las pantallas usan SOLO estas funciones (nunca db.js directo).
//
// Cada vez que algo cambia, se anota en la cola de sincronización (sync_queue)
// para enviarlo al Google Sheet cuando haya internet (eso lo hace sync.js, etapa 6).

import * as db from './db.js';
import { todayISO, nowLocal, weekStart } from './weeks.js';

/** Puntos (sesiones) que forman la meta de cada semana. */
export const WEEKLY_GOAL = 3;

/** Id único al azar, ej. "3f2b9c1e-...". */
function newId() {
  return crypto.randomUUID();
}

// ======================================================================
// Cola de sincronización
// ======================================================================
// Cada entrada dice "este registro cambió": { key, kind, id, op, queued_at }.
// La clave es "kind:id", así que si cambias el mismo registro 5 veces sin
// internet, queda UNA sola entrada (al sincronizar se envía su estado final).

async function enqueue(kind, id, op = 'upsert') {
  // queued_at con milisegundos: sync.js lo usa para saber si el registro
  // cambió OTRA vez mientras se estaba enviando.
  await db.put('sync_queue', { key: `${kind}:${id}`, kind, id, op, queued_at: new Date().toISOString() });
  // Aviso a sync.js de que hay algo nuevo para enviar (ver startAutoSync)
  globalThis.dispatchEvent?.(new Event('workoutbody:changed'));
}

export async function getSyncQueue() {
  return db.getAll('sync_queue');
}

export async function removeFromSyncQueue(key) {
  return db.remove('sync_queue', key);
}

// ======================================================================
// Settings (estatura, URL y token del Apps Script...)
// ======================================================================

export async function getSetting(key, defaultValue = null) {
  const row = await db.get('settings', key);
  return row ? row.value : defaultValue;
}

/**
 * Guarda un ajuste. `sync` indica si va también al Sheet (pestaña settings).
 * La URL y el token NO se sincronizan (son secretos del teléfono).
 */
export async function setSetting(key, value, { sync = false } = {}) {
  await db.put('settings', { key, value });
  if (sync) await enqueue('setting', key);
}

// ======================================================================
// Sesiones
// ======================================================================
// Forma de una sesión guardada en el teléfono:
// {
//   session_id, date, week_start, muscle_group, routine_id,
//   warmup_min, cooldown_min, is_extra, completed_at,
//   status: 'draft' | 'completed',
//   step:   'warmup' | 'routine' | 'cooldown',   (en qué paso quedó el borrador)
//   exercises: [ { exercise_id, exercise_name, done, weight_kg, notes } ],
// }
// Al sincronizar, "exercises" se envía a la pestaña session_exercises.

/** Devuelve el borrador en curso, o null si no hay. Solo puede haber uno. */
export async function getDraft() {
  const drafts = await db.getAllByIndex('sessions', 'status', 'draft');
  return drafts[0] ?? null;
}

/**
 * Crea el borrador al tocar "Let's go!".
 * @param {string} date     fecha registrada al tocar Start ("YYYY-MM-DD")
 * @param {object} routine  rutina de routines.js (con sus items)
 */
export async function createDraft(date, routine) {
  if (await getDraft()) throw new Error('There is already a workout in progress');
  const session = {
    session_id: newId(),
    date,
    week_start: weekStart(date),
    muscle_group: routine.muscle_group,
    routine_id: routine.id,
    warmup_min: null,
    cooldown_min: null,
    is_extra: false,
    completed_at: null,
    status: 'draft',
    step: 'warmup',
    exercises: routine.items.map((item) => ({
      exercise_id: item.exercise_id,
      exercise_name: item.name,
      done: false,
      weight_kg: null,
      notes: '',
    })),
  };
  await db.put('sessions', session);
  return session;
}

/**
 * Guarda cambios del borrador (ej. { warmup_min: 10, step: 'routine' }).
 * El borrador no se sincroniza: vive solo en el teléfono hasta Finish.
 */
export async function updateDraft(changes) {
  const draft = await getDraft();
  if (!draft) throw new Error('No workout in progress');
  const updated = { ...draft, ...changes };
  await db.put('sessions', updated);
  return updated;
}

/** Descarta el borrador (no se guarda nada). */
export async function discardDraft() {
  const draft = await getDraft();
  if (draft) await db.remove('sessions', draft.session_id);
}

/** Finish: marca el borrador como completado y lo deja listo para sincronizar. */
export async function completeDraft(changes = {}) {
  const draft = await updateDraft({ ...changes, status: 'completed', completed_at: nowLocal() });
  delete draft.step; // ya no se necesita
  await db.put('sessions', draft);
  await recalculateExtras(draft.week_start);
  await enqueue('session', draft.session_id);
  return db.get('sessions', draft.session_id);
}

/** Todas las sesiones completadas, de la más antigua a la más nueva. */
export async function listCompletedSessions() {
  const sessions = await db.getAllByIndex('sessions', 'status', 'completed');
  return sessions.sort(bySessionOrder);
}

/** Orden dentro de una semana: por fecha y, a igual fecha, por hora de término. */
function bySessionOrder(a, b) {
  return (a.date + a.completed_at).localeCompare(b.date + b.completed_at);
}

/**
 * Borra una sesión completada. Solo se permite en la semana actual
 * (las semanas pasadas son de solo lectura).
 */
export async function deleteSession(sessionId, now = new Date()) {
  const session = await db.get('sessions', sessionId);
  if (!session) return;
  if (session.week_start !== weekStart(todayISO(now))) {
    throw new Error('Past weeks are read-only');
  }
  await db.remove('sessions', sessionId);
  await enqueue('session', sessionId, 'delete');
  await recalculateExtras(session.week_start);
}

/**
 * Marca como "extra" las sesiones 4ª, 5ª... de una semana.
 * Se recalcula al completar o borrar, así si borras una de las 3 primeras,
 * la 4ª deja de ser extra. Las que cambian se vuelven a sincronizar.
 */
async function recalculateExtras(weekStartIso) {
  const inWeek = (await db.getAllByIndex('sessions', 'week_start', weekStartIso))
    .filter((s) => s.status === 'completed')
    .sort(bySessionOrder);
  for (const [index, session] of inWeek.entries()) {
    const shouldBeExtra = index >= WEEKLY_GOAL;
    if (session.is_extra !== shouldBeExtra) {
      session.is_extra = shouldBeExtra;
      await db.put('sessions', session);
      await enqueue('session', session.session_id);
    }
  }
}

// ======================================================================
// Medidas corporales
// ======================================================================
// { measurement_id, date, weight_kg, waist_cm, hip_cm, bust_cm, arm_cm, thigh_cm }

export const MEASUREMENT_FIELDS = ['weight_kg', 'waist_cm', 'hip_cm', 'bust_cm', 'arm_cm', 'thigh_cm'];

/** Crea o actualiza un registro de medidas (si no trae measurement_id, es nuevo). */
export async function saveMeasurement(values) {
  const record = { measurement_id: values.measurement_id || newId(), date: values.date };
  for (const field of MEASUREMENT_FIELDS) {
    // Campo vacío → null (no se midió ese día)
    const value = values[field];
    record[field] = value === '' || value == null ? null : Number(value);
  }
  await db.put('measurements', record);
  await enqueue('measurement', record.measurement_id);
  return record;
}

export async function deleteMeasurement(measurementId) {
  await db.remove('measurements', measurementId);
  await enqueue('measurement', measurementId, 'delete');
}

/** Todas las medidas, de la más antigua a la más nueva. */
export async function listMeasurements() {
  const all = await db.getAll('measurements');
  return all.sort((a, b) => a.date.localeCompare(b.date));
}

// ======================================================================
// Respaldo (exportar / importar JSON)
// ======================================================================
// La URL y el token del Apps Script NO van en el respaldo (son secretos y
// se ingresan aparte en Settings).

const SECRET_SETTINGS = ['sync_url', 'sync_token'];
// Ajustes internos de la app que tampoco tiene sentido respaldar
const INTERNAL_SETTINGS = ['last_sync_at', 'last_sync_error'];

export async function exportAll() {
  const settings = (await db.getAll('settings'))
    .filter((s) => !SECRET_SETTINGS.includes(s.key) && !INTERNAL_SETTINGS.includes(s.key));
  return {
    app: 'workoutbody',
    backup_version: 1,
    exported_at: nowLocal(),
    sessions: await db.getAll('sessions'),
    measurements: await db.getAll('measurements'),
    settings,
  };
}

/**
 * Reemplaza TODOS los datos del teléfono por los del respaldo.
 * Conserva la URL y el token actuales. Marca todo para sincronizar
 * (es seguro: el Apps Script actualiza filas existentes, no las duplica).
 */
export async function importAll(backup) {
  if (backup?.app !== 'workoutbody' || !Array.isArray(backup.sessions) || !Array.isArray(backup.measurements)) {
    throw new Error('This file is not a WorkOutBody backup');
  }
  const keep = [];
  for (const key of SECRET_SETTINGS) {
    const row = await db.get('settings', key);
    if (row) keep.push(row);
  }

  for (const store of ['sessions', 'measurements', 'settings', 'sync_queue']) await db.clear(store);

  for (const s of backup.sessions) {
    await db.put('sessions', s);
    if (s.status === 'completed') await enqueue('session', s.session_id);
  }
  for (const m of backup.measurements) {
    await db.put('measurements', m);
    await enqueue('measurement', m.measurement_id);
  }
  for (const s of backup.settings ?? []) {
    await db.put('settings', s);
    await enqueue('setting', s.key);
  }
  for (const row of keep) await db.put('settings', row);

  return { sessions: backup.sessions.length, measurements: backup.measurements.length };
}

// ======================================================================
// Lectura de un registro para enviarlo al Sheet (lo usa sync.js)
// ======================================================================

/** Devuelve los datos actuales de un elemento de la cola, o null si ya no existe. */
export async function getRecordForSync(kind, id) {
  if (kind === 'session') {
    const s = await db.get('sessions', id);
    if (!s || s.status !== 'completed') return null;
    // Solo las columnas del Sheet (sin "status" ni "step", que son internas)
    const { status, step, ...row } = s;
    return row;
  }
  if (kind === 'measurement') return (await db.get('measurements', id)) ?? null;
  if (kind === 'setting') return (await db.get('settings', id)) ?? null;
  return null;
}
