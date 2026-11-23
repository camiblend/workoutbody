// db.js — acceso de bajo nivel a IndexedDB (la base de datos del navegador).
//
// IndexedDB es como un diccionario persistente por "store" (similar a una tabla):
//   store "sessions"     → { session_id: {...sesión...} }
//   store "measurements" → { measurement_id: {...medidas...} }
//   store "settings"     → { key: { key, value } }
//   store "sync_queue"   → cambios pendientes de enviar al Google Sheet
//
// La API original de IndexedDB usa "eventos" y es incómoda; aquí la envolvemos en
// funciones que devuelven Promesas, para poder escribir:
//     const sesion = await get('sessions', id);
// (await = "espera el resultado", parecido a Python asyncio.)
//
// No uses estas funciones directo desde las pantallas: usa data.js.

const DB_NAME = 'workoutbody';
// Si algún día cambias la estructura (nuevo store o índice), sube DB_VERSION
// y agrega los cambios en upgrade(). Los datos existentes se conservan.
const DB_VERSION = 1;

let dbPromise = null;

/** Abre la base (solo la primera vez; después reutiliza la conexión). */
function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => upgrade(request.result, event.oldVersion);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

/** Crea los stores. Se ejecuta solo cuando la base es nueva o sube DB_VERSION. */
function upgrade(db, oldVersion) {
  if (oldVersion < 1) {
    const sessions = db.createObjectStore('sessions', { keyPath: 'session_id' });
    sessions.createIndex('week_start', 'week_start');
    sessions.createIndex('status', 'status');

    const measurements = db.createObjectStore('measurements', { keyPath: 'measurement_id' });
    measurements.createIndex('date', 'date');

    db.createObjectStore('settings', { keyPath: 'key' });
    db.createObjectStore('sync_queue', { keyPath: 'key' });
  }
  // Ejemplo para el futuro:
  // if (oldVersion < 2) { ...crear store o índice nuevo... }
}

/** Convierte una petición de IndexedDB en una Promesa. */
function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Abre una transacción sobre un store y devuelve el store. */
async function store(name, mode = 'readonly') {
  const db = await openDB();
  return db.transaction(name, mode).objectStore(name);
}

// ---------- Operaciones básicas ----------

/** Lee un registro por su clave. Devuelve undefined si no existe. */
export async function get(storeName, key) {
  return promisify((await store(storeName)).get(key));
}

/** Lee todos los registros de un store. */
export async function getAll(storeName) {
  return promisify((await store(storeName)).getAll());
}

/** Lee todos los registros cuyo índice tenga ese valor. */
export async function getAllByIndex(storeName, indexName, value) {
  return promisify((await store(storeName)).index(indexName).getAll(value));
}

/** Guarda (crea o reemplaza) un registro. */
export async function put(storeName, record) {
  return promisify((await store(storeName, 'readwrite')).put(record));
}

/** Borra un registro por su clave. */
export async function remove(storeName, key) {
  return promisify((await store(storeName, 'readwrite')).delete(key));
}

/** Vacía un store completo (se usa al importar un respaldo). */
export async function clear(storeName) {
  return promisify((await store(storeName, 'readwrite')).clear());
}
