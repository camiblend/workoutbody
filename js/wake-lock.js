// wake-lock.js — evita que la pantalla se apague sola (solo mientras la app está abierta).
//
// Se usa en el paso "Routine" de la sesión, para no tener que desbloquear el
// teléfono entre series. Usa la "Screen Wake Lock API" del navegador.
//   - En iPhone funciona en apps instaladas desde iOS 18.4.
//   - Si sales de la app, iOS libera el bloqueo; al volver lo pedimos de nuevo.
//   - Si el teléfono no lo soporta, no pasa nada: la pantalla se apaga como siempre.

let sentinel = null;  // el "permiso" activo que nos da el navegador
let wanted = false;   // ¿debería estar encendida la pantalla ahora?

/** ¿Este navegador/teléfono permite mantener la pantalla encendida? */
export function isSupported() {
  return 'wakeLock' in navigator;
}

/** Pide mantener la pantalla encendida. Devuelve true si se logró. */
export async function keepScreenOn() {
  wanted = true;
  return acquire();
}

/** Deja que la pantalla se apague normalmente otra vez. */
export async function allowScreenOff() {
  wanted = false;
  const current = sentinel;
  sentinel = null;
  try {
    await current?.release();
  } catch {
    // ya estaba liberado: no importa
  }
}

/** ¿Está activo ahora? (para mostrarlo en pantalla) */
export function isScreenKeptOn() {
  return sentinel !== null;
}

async function acquire() {
  if (!isSupported()) return false;
  if (sentinel) return true;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    // El navegador lo libera solo si sales de la app
    sentinel.addEventListener('release', () => { sentinel = null; });
    // Por si mientras esperábamos ya no se necesitaba
    if (!wanted) await allowScreenOff();
    return sentinel !== null;
  } catch (err) {
    console.warn('Wake lock not available:', err);
    return false;
  }
}

// Al volver a la app (desde otra app o tras bloquear), lo pedimos de nuevo si corresponde
document.addEventListener('visibilitychange', () => {
  if (wanted && document.visibilityState === 'visible') acquire();
});
