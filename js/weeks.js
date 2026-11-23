// weeks.js — todo lo relacionado con fechas y semanas.
//
// IDEA CLAVE: trabajamos con fechas como TEXTO "YYYY-MM-DD" (ej. "2026-11-23"),
// igual que en el Sheet. Así evitamos los líos de horas y cambios de horario
// (Chile cambia la hora en abril y septiembre).
//
// La única vez que miramos el reloj es en todayISO()/nowLocal(), y ahí
// forzamos la zona America/Santiago aunque el teléfono esté en otra zona.

export const TIME_ZONE = 'America/Santiago';

// ---------- "Ahora" en Santiago ----------

/**
 * Devuelve las partes de fecha y hora de Santiago para un instante dado.
 * `now` es opcional (por defecto: este momento); los tests le pasan una fecha fija.
 */
function santiagoParts(now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  });
  // formatToParts entrega [{type:'year', value:'2026'}, ...] → lo pasamos a un objeto
  const parts = {};
  for (const { type, value } of formatter.formatToParts(now)) parts[type] = value;
  return parts;
}

/** Fecha de hoy en Santiago: "2026-11-23". */
export function todayISO(now = new Date()) {
  const p = santiagoParts(now);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Fecha y hora de Santiago, legible en el Sheet: "2026-11-23 18:45:10". Se usa en completed_at. */
export function nowLocal(now = new Date()) {
  const p = santiagoParts(now);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

// ---------- Aritmética de fechas "YYYY-MM-DD" ----------
// Internamente convertimos a un Date en UTC a mediodía (nunca hay cambio de
// horario en UTC, así que sumar días es exacto) y volvemos a texto.

function toDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}
function toISO(date) {
  return date.toISOString().slice(0, 10);
}

/** Suma (o resta, si n es negativo) días: addDays("2026-11-30", 1) → "2026-12-01". */
export function addDays(iso, n) {
  const date = toDate(iso);
  date.setUTCDate(date.getUTCDate() + n);
  return toISO(date);
}

/** Días entre dos fechas (b - a). */
export function daysBetween(a, b) {
  return Math.round((toDate(b) - toDate(a)) / 86_400_000);
}

/** Lunes de la semana de esa fecha: weekStart("2026-11-29") (domingo) → "2026-11-23". */
export function weekStart(iso) {
  const day = toDate(iso).getUTCDay();   // 0 = domingo, 1 = lunes, ... 6 = sábado
  const sinceMonday = (day + 6) % 7;     // lunes → 0, domingo → 6
  return addDays(iso, -sinceMonday);
}

/**
 * Número de semana ("Week N"), contando desde la semana de la primera sesión.
 * weekNumber("2026-11-30", "2026-11-23") → 2
 */
export function weekNumber(weekStartIso, firstWeekStartIso) {
  return daysBetween(firstWeekStartIso, weekStartIso) / 7 + 1;
}

/** "2026-11-23" → "23/11" (formato de los círculos completados). */
export function formatDDMM(iso) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/** Rango de la semana para mostrar: "23/11 – 29/11". */
export function weekRangeLabel(weekStartIso) {
  return `${formatDDMM(weekStartIso)} – ${formatDDMM(addDays(weekStartIso, 6))}`;
}
