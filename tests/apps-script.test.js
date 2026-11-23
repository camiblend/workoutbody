// Tests de apps-script/Code.gs, corriendo el script con un Google Sheet FALSO
// (una imitación mínima de SpreadsheetApp en memoria). Correr con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const code = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');

// ---------- Imitación de Google Sheets ----------
class FakeSheet {
  constructor() { this.rows = []; this.frozen = 0; }
  width() { return Math.max(0, ...this.rows.map((r) => r.length)); }
  getLastColumn() { return this.width(); }
  getDataRange() {
    const w = this.width();
    return { getValues: () => this.rows.map((r) => Array.from({ length: w }, (_, i) => r[i] ?? '')) };
  }
  getRange(row, col, numRows, numCols) {
    return {
      getValues: () => Array.from({ length: numRows }, (_, i) =>
        Array.from({ length: numCols }, (_, j) => this.rows[row - 1 + i]?.[col - 1 + j] ?? '')),
      setValues: (values) => values.forEach((vals, i) => {
        const r = (this.rows[row - 1 + i] ??= []);
        vals.forEach((v, j) => { r[col - 1 + j] = v; });
      }),
    };
  }
  appendRow(row) { this.rows.push([...row]); }
  deleteRow(n) { this.rows.splice(n - 1, 1); }
  setFrozenRows(n) { this.frozen = n; }
}

function makeEnv(token = 'secret') {
  const sheets = {};
  const props = { TOKEN: token };
  const context = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: (n) => sheets[n] ?? null,
        insertSheet: (n) => (sheets[n] = new FakeSheet()),
      }),
    },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: (k) => props[k] ?? null, setProperty: (k, v) => { props[k] = v; } }),
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (text) => ({ text, setMimeType() { return this; } }),
    },
    Utilities: { getUuid: () => '1234abcd-0000-0000-0000-000000000000' },
    Logger: { log() {} },
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  const post = (body) => JSON.parse(context.doPost({ postData: { contents: JSON.stringify(body) } }).text);
  /** Tabla como lista de objetos { columna: valor } */
  const table = (name) => {
    const [headers, ...rows] = sheets[name].rows;
    return rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
  };
  return { context, sheets, props, post, table };
}

const session = {
  session_id: 's1', date: '2026-11-23', week_start: '2026-11-23', muscle_group: 'chest',
  routine_id: 'chest_beginner', warmup_min: 10, cooldown_min: 5, is_extra: false,
  completed_at: '2026-11-23 19:00:00',
  exercises: [
    { exercise_id: 'db_floor_press', exercise_name: 'Dumbbell floor press', done: true, weight_kg: 6, notes: '' },
    { exercise_id: 'incline_push_up', exercise_name: 'Incline push-up', done: false, weight_kg: null, notes: '' },
  ],
};

test('rejects a wrong token', () => {
  const env = makeEnv();
  assert.deepEqual(env.post({ token: 'nope', changes: [] }), { ok: false, error: 'Invalid token' });
});

test('rejects when no TOKEN is configured', () => {
  const env = makeEnv(null);
  assert.equal(env.post({ token: '', changes: [] }).ok, false);
});

test('session upsert writes sessions and session_exercises', () => {
  const env = makeEnv();
  const res = env.post({ token: 'secret', changes: [{ key: 'session:s1', kind: 'session', op: 'upsert', id: 's1', data: session }] });
  assert.deepEqual(res, { ok: true, results: [{ key: 'session:s1', ok: true }] });
  assert.equal(env.table('sessions').length, 1);
  assert.equal(env.table('sessions')[0].muscle_group, 'chest');
  assert.equal(env.table('session_exercises').length, 2);
  assert.equal(env.table('session_exercises')[1].weight_kg, ''); // null → vacío
});

test('sending the same session twice does not duplicate rows', () => {
  const env = makeEnv();
  const change = { key: 'session:s1', kind: 'session', op: 'upsert', id: 's1', data: session };
  env.post({ token: 'secret', changes: [change] });
  env.post({ token: 'secret', changes: [{ ...change, data: { ...session, is_extra: true } }] });
  assert.equal(env.table('sessions').length, 1);
  assert.equal(env.table('sessions')[0].is_extra, true);
  assert.equal(env.table('session_exercises').length, 2);
});

test('session delete removes the session and its exercises', () => {
  const env = makeEnv();
  env.post({ token: 'secret', changes: [{ key: 'session:s1', kind: 'session', op: 'upsert', id: 's1', data: session }] });
  env.post({ token: 'secret', changes: [{ key: 'session:s1', kind: 'session', op: 'delete', id: 's1' }] });
  assert.equal(env.table('sessions').length, 0);
  assert.equal(env.table('session_exercises').length, 0);
});

test('measurements: upsert, update and delete by measurement_id', () => {
  const env = makeEnv();
  const m = { measurement_id: 'm1', date: '2026-11-20', weight_kg: 67.6, waist_cm: null, hip_cm: 99.5, bust_cm: null, arm_cm: null, thigh_cm: null };
  env.post({ token: 'secret', changes: [{ key: 'measurement:m1', kind: 'measurement', op: 'upsert', id: 'm1', data: m }] });
  env.post({ token: 'secret', changes: [{ key: 'measurement:m1', kind: 'measurement', op: 'upsert', id: 'm1', data: { ...m, weight_kg: 67.2 } }] });
  assert.deepEqual(env.table('body_measurements').map((r) => r.weight_kg), [67.2]);
  env.post({ token: 'secret', changes: [{ key: 'measurement:m1', kind: 'measurement', op: 'delete', id: 'm1' }] });
  assert.equal(env.table('body_measurements').length, 0);
});

test('setting upsert (height_cm)', () => {
  const env = makeEnv();
  env.post({ token: 'secret', changes: [{ key: 'setting:height_cm', kind: 'setting', op: 'upsert', id: 'height_cm', data: { key: 'height_cm', value: 165 } }] });
  env.post({ token: 'secret', changes: [{ key: 'setting:height_cm', kind: 'setting', op: 'upsert', id: 'height_cm', data: { key: 'height_cm', value: 166 } }] });
  assert.deepEqual(env.table('settings'), [{ key: 'height_cm', value: 166 }]);
});

test('reordered and hand-added columns are preserved', () => {
  const env = makeEnv();
  const change = { key: 'session:s1', kind: 'session', op: 'upsert', id: 's1', data: session };
  env.post({ token: 'secret', changes: [change] });
  // El usuario mueve columnas y agrega una propia con datos
  const sheet = env.sheets.sessions;
  sheet.rows = sheet.rows.map((r) => [r[8], ...r.slice(0, 8), ...r.slice(9)]); // completed_at primero
  sheet.rows[0].push('my_note');
  sheet.rows[1].push('felt great');
  env.post({ token: 'secret', changes: [{ ...change, data: { ...session, warmup_min: 15 } }] });
  const [row] = env.table('sessions');
  assert.equal(row.warmup_min, 15);
  assert.equal(row.completed_at, '2026-11-23 19:00:00');
  assert.equal(row.my_note, 'felt great');
});

test('a new field from the app creates a new column', () => {
  const env = makeEnv();
  env.post({ token: 'secret', changes: [{ key: 'session:s1', kind: 'session', op: 'upsert', id: 's1', data: { ...session, walk_speed: 5.5 } }] });
  assert.equal(env.sheets.sessions.rows[0].at(-1), 'walk_speed');
  assert.equal(env.table('sessions')[0].walk_speed, 5.5);
});

test('one bad change does not block the others', () => {
  const env = makeEnv();
  const res = env.post({ token: 'secret', changes: [
    { key: 'x:1', kind: 'unknown', op: 'upsert', id: '1', data: {} },
    { key: 'setting:height_cm', kind: 'setting', op: 'upsert', id: 'height_cm', data: { key: 'height_cm', value: 165 } },
  ] });
  assert.equal(res.results[0].ok, false);
  assert.equal(res.results[1].ok, true);
});

test('setup creates the 4 tabs and a token, and keeps an existing token', () => {
  const env = makeEnv(null);
  env.context.setup();
  assert.deepEqual(Object.keys(env.sheets).sort(), ['body_measurements', 'session_exercises', 'sessions', 'settings']);
  assert.ok(env.props.TOKEN.length >= 32);
  const first = env.props.TOKEN;
  env.context.setup();
  assert.equal(env.props.TOKEN, first);
});
