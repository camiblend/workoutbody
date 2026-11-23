// sync.js — envía la cola de cambios (sync_queue) al Google Apps Script.
//
// Funcionamiento:
//   1. Cada cambio en el teléfono queda anotado en sync_queue (lo hace data.js).
//   2. syncNow() lee la cola, arma los datos actuales de cada registro y los
//      envía en UNA petición POST al Apps Script.
//   3. Lo que el Apps Script confirma se borra de la cola. Lo que falla se
//      queda y se reintenta la próxima vez.
//
// Se sincroniza solo:
//   - al abrir la app,
//   - al volver internet,
//   - unos segundos después de cada cambio (terminar sesión, guardar medidas...),
//   - al volver a la app desde otra (iPhone),
// y también con el botón "Sync now" en Settings.

import { getSetting, setSetting, getSyncQueue, removeFromSyncQueue, getRecordForSync } from './data.js';
import { nowLocal } from './weeks.js';

const BATCH_SIZE = 100;     // máximo de cambios por petición
const DEBOUNCE_MS = 3000;   // espera tras un cambio antes de sincronizar

let running = null;         // promesa de la sincronización en curso (evita dos a la vez)
let debounceTimer = null;

/** URL y token guardados en el teléfono. */
export async function getSyncConfig() {
  return {
    url: await getSetting('sync_url', ''),
    token: await getSetting('sync_token', ''),
  };
}

/** Resumen para mostrar en Settings. */
export async function getSyncStatus() {
  const { url, token } = await getSyncConfig();
  return {
    configured: Boolean(url && token),
    pending: (await getSyncQueue()).length,
    lastSyncAt: await getSetting('last_sync_at'),
    lastError: await getSetting('last_sync_error'),
  };
}

/**
 * Envía una petición al Apps Script.
 * Content-Type text/plain: así el navegador no hace la consulta previa de CORS
 * (que Apps Script no sabe responder).
 */
async function post(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow', // Apps Script responde con una redirección
  });
  if (!response.ok) throw new Error(`Server error (${response.status})`);
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('Unexpected answer. Check the URL (it must end in /exec).');
  }
  if (!result.ok) throw new Error(result.error || 'Unknown error');
  return result;
}

/** Prueba la conexión y el token sin enviar datos. */
export async function testConnection(url, token) {
  await post(url, { token, changes: [] });
}

/**
 * Sincroniza ahora. Devuelve { status: 'ok'|'nothing'|'offline'|'not_configured'|'error', sent, error }.
 * Si ya hay una sincronización en curso, espera esa.
 */
export function syncNow() {
  if (!running) running = doSync().finally(() => { running = null; });
  return running;
}

async function doSync() {
  const { url, token } = await getSyncConfig();
  if (!url || !token) return { status: 'not_configured' };
  if (!navigator.onLine) return { status: 'offline' };

  const queue = await getSyncQueue();
  if (queue.length === 0) return { status: 'nothing', sent: 0 };

  let sent = 0;
  try {
    for (let i = 0; i < queue.length; i += BATCH_SIZE) {
      const batch = queue.slice(i, i + BATCH_SIZE);

      // Armamos cada cambio con los datos ACTUALES del registro
      const changes = [];
      for (const entry of batch) {
        const data = entry.op === 'delete' ? null : await getRecordForSync(entry.kind, entry.id);
        if (entry.op !== 'delete' && !data) {
          // El registro ya no existe (ej. borrador descartado): nada que enviar
          await removeFromSyncQueue(entry.key);
          continue;
        }
        changes.push({ key: entry.key, kind: entry.kind, op: entry.op, id: entry.id, data });
      }
      if (changes.length === 0) continue;

      const result = await post(url, { token, changes });

      // Quitamos de la cola lo confirmado, salvo que haya cambiado otra vez
      // mientras se enviaba (en ese caso se manda de nuevo la próxima vez).
      const confirmed = new Set(result.results.filter((r) => r.ok).map((r) => r.key));
      const current = new Map((await getSyncQueue()).map((e) => [e.key, e]));
      for (const entry of batch) {
        if (confirmed.has(entry.key) && current.get(entry.key)?.queued_at === entry.queued_at) {
          await removeFromSyncQueue(entry.key);
          sent++;
        }
      }
      const failed = result.results.filter((r) => !r.ok);
      if (failed.length) throw new Error(`${failed.length} change(s) failed: ${failed[0].error}`);
    }
    await setSetting('last_sync_at', nowLocal());
    await setSetting('last_sync_error', null);
    return { status: 'ok', sent };
  } catch (err) {
    // Error de red: Chrome dice "Failed to fetch", Safari dice "Load failed"
    const isNetworkError = err instanceof TypeError && /fetch|load failed|network/i.test(err.message);
    const message = isNetworkError
      ? 'Could not reach the server. Check your connection and the URL.'
      : err.message;
    await setSetting('last_sync_error', message);
    return { status: 'error', sent, error: message };
  }
}

/** Programa una sincronización en unos segundos (agrupa varios cambios seguidos). */
function scheduleSync() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { syncNow(); }, DEBOUNCE_MS);
}

/** Activa la sincronización automática. Se llama una vez al abrir la app (app.js). */
export function startAutoSync() {
  window.addEventListener('workoutbody:changed', scheduleSync);
  window.addEventListener('online', () => syncNow());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncNow();
  });
  syncNow();
}
