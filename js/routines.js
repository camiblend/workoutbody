// routines.js — lee data/routines.json y lo entrega listo para usar.
//
// El JSON tiene dos partes:
//   "exercises": catálogo de ejercicios (nombre, implemento, imagen...), por id.
//   "routines":  lista de rutinas; cada una tiene "items" que APUNTAN a un
//                ejercicio del catálogo por su id y dicen series/reps.
// Así un mismo ejercicio (ej. goblet squat) se define una sola vez aunque
// aparezca en varias rutinas, y las estadísticas lo agrupan bien.

let cache = null; // guardamos el resultado para no leer el archivo dos veces

/**
 * Carga y valida routines.json. Devuelve { exercises, routines }.
 * Cada item de rutina viene "completado" con los datos de su ejercicio.
 */
export async function loadRoutines() {
  if (cache) return cache;
  const [data, details] = await Promise.all([
    fetch('./data/routines.json').then((r) => r.json()),
    // Instrucciones del dataset (generado por tools/fetch_images.py). Si falta, seguimos sin él.
    fetch('./data/exercise-details.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
  ]);
  cache = prepareRoutines(data, details);
  return cache;
}

/**
 * Valida el contenido y une cada item con su ejercicio del catálogo.
 * Está separada de loadRoutines() para poder probarla sin navegador (ver tests/).
 * Si hay un error en el JSON (ej. un exercise_id mal escrito) lanza un error
 * que dice exactamente dónde está.
 */
export function prepareRoutines(data, details = {}) {
  const exercises = data.exercises;
  const routines = data.routines.map((routine) => {
    const items = routine.items.map((item, index) => {
      const where = `routine "${routine.id}", item ${index + 1}`;
      const exercise = exercises[item.exercise_id];
      if (!exercise) throw new Error(`Unknown exercise_id "${item.exercise_id}" in ${where}`);
      if (!item.sets) throw new Error(`Missing "sets" in ${where}`);
      if (!item.reps === !item.seconds) {
        throw new Error(`Use exactly one of "reps" or "seconds" in ${where}`);
      }
      return {
        exercise_id: item.exercise_id,
        sets: item.sets,
        reps: item.reps ?? null,
        seconds: item.seconds ?? null,
        per_side: item.per_side === true,
        ...exercise, // name, implement, image, video_url, note
        // { source_name, match, instructions } o null si no hay imagen del dataset
        details: details[item.exercise_id] ?? null,
      };
    });
    return { ...routine, items };
  });
  return { exercises, routines };
}

/** Texto de dosis: "3×12", "3×8 per side", "3×20 s". */
export function doseLabel(item) {
  const amount = item.seconds ? `${item.seconds} s` : `${item.reps}`;
  return `${item.sets}×${amount}${item.per_side ? ' per side' : ''}`;
}

/**
 * ¿Se muestra el campo de kg? Si el ejercicio usa mancuernas, o si en
 * data/routines.json tiene "track_weight": true (ej. una miniband de 5 kg).
 */
export function usesWeight(item) {
  return item.implement === 'dumbbell' || item.track_weight === true;
}
