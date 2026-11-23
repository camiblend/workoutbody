// screens/home.js — pantalla Home: botón Start + timeline de semanas.
//
// Cada semana muestra 3 círculos conectados (la meta) y, al lado, la lista
// de lo que entrenaste. Las sesiones 4ª, 5ª... aparecen como "Extra".
// Se muestran la semana actual + las 3 anteriores; "Load more" agrega 4 más.

import { h } from '../ui.js';
import { loadRoutines } from '../routines.js';
import {
  todayISO, weekStart, addDays, weekNumber, weekRangeLabel, formatDDMM,
} from '../weeks.js';
import {
  WEEKLY_GOAL, listCompletedSessions, getDraft, discardDraft, deleteSession,
} from '../data.js';

export const title = 'Home';
export const tab = 'home';

const WEEKS_PER_PAGE = 4;
// Cuántas semanas se ven. Vive fuera de render() para que no se reinicie
// al volver a dibujar la pantalla (ej. después de borrar una sesión).
let visibleWeeks = WEEKS_PER_PAGE;

export async function render(container) {
  const [sessions, draft, { routines }] = await Promise.all([
    listCompletedSessions(), getDraft(), loadRoutines(),
  ]);

  // muscle_group → nombre bonito ("butt_leg" → "Butt & Leg")
  const groupName = Object.fromEntries(routines.map((r) => [r.muscle_group, r.name]));

  const today = todayISO();
  const currentWeek = weekStart(today);

  // Week 1 = semana de la primera sesión (o la actual si aún no hay ninguna)
  const firstWeek = sessions.length ? sessions[0].week_start : currentWeek;
  const totalWeeks = weekNumber(currentWeek, firstWeek);

  // Agrupar sesiones por semana: { "2026-11-23": [s1, s2], ... }
  const byWeek = {};
  for (const s of sessions) (byWeek[s.week_start] ??= []).push(s);

  const redraw = () => { container.replaceChildren(); render(container); };

  // ---------- Parte de arriba: Start o "Workout in progress" ----------
  container.append(draft ? draftBanner(draft, groupName, redraw) : startButton(today));

  // ---------- Timeline (semana más nueva arriba) ----------
  const shown = Math.min(visibleWeeks, totalWeeks);
  for (let i = 0; i < shown; i++) {
    const ws = addDays(currentWeek, -7 * i);
    container.append(weekCard({
      weekStartIso: ws,
      number: weekNumber(ws, firstWeek),
      sessions: byWeek[ws] ?? [],
      isCurrent: ws === currentWeek,
      groupName,
      redraw,
    }));
  }

  if (totalWeeks > shown) {
    container.append(
      h('button', {
        class: 'btn secondary',
        onclick: () => { visibleWeeks += WEEKS_PER_PAGE; redraw(); },
      }, 'Load more'),
    );
  }
}

// ---------------------------------------------------------------------

function startButton(today) {
  return h('a', { class: 'btn start-btn', href: `#/choose/${today}` }, 'Start');
}

/** Aviso de sesión a medio camino, con Resume y Discard. */
function draftBanner(draft, groupName, redraw) {
  return h('div', { class: 'card draft-banner' },
    h('div', {},
      h('div', { class: 'draft-title' }, 'Workout in progress'),
      h('div', { class: 'muted' }, `${groupName[draft.muscle_group] ?? draft.muscle_group} · ${formatDDMM(draft.date)}`),
    ),
    h('div', { class: 'draft-actions' },
      h('button', {
        class: 'link-btn muted',
        onclick: async () => {
          if (!confirm('Discard this workout? It will not be saved.')) return;
          await discardDraft();
          redraw();
        },
      }, 'Discard'),
      h('a', { class: 'btn small', href: '#/session' }, 'Resume'),
    ),
  );
}

/** Tarjeta de una semana: círculos + lista de lo entrenado. */
function weekCard({ weekStartIso, number, sessions, isCurrent, groupName, redraw }) {
  const extras = sessions.length - WEEKLY_GOAL;

  // --- Círculos conectados 1 → 2 → 3 ---
  const track = h('div', { class: 'track' });
  for (let k = 0; k < WEEKLY_GOAL; k++) {
    const session = sessions[k];
    if (k > 0) track.append(h('div', { class: `connector${session ? ' done' : ''}` }));
    track.append(
      h('div', { class: 'dot-wrap' },
        h('div', { class: `dot${session ? ' done' : ''}` }, session ? checkIcon() : String(k + 1)),
        h('div', { class: 'dot-date' }, session ? formatDDMM(session.date) : ''),
      ),
    );
  }
  if (extras > 0) {
    track.append(h('div', { class: 'extra-bubble', title: 'Extra workouts' }, `+${extras}`));
  }

  // --- Lista: "1. Back", "2. Chest", "3. —", "4. Arm  EXTRA" ---
  const list = h('ol', { class: 'week-list' });
  const rows = Math.max(WEEKLY_GOAL, sessions.length);
  for (let k = 0; k < rows; k++) {
    const session = sessions[k];
    if (!session) {
      list.append(h('li', { class: 'muted' }, `${k + 1}. —`));
      continue;
    }
    const name = groupName[session.muscle_group] ?? session.muscle_group;
    list.append(
      h('li', {},
        h('span', {}, `${k + 1}. ${name}`),
        session.is_extra ? h('span', { class: 'badge extra' }, 'Extra') : null,
        // Solo la semana actual permite borrar (las pasadas son de solo lectura)
        isCurrent ? h('button', {
          class: 'delete-btn',
          'aria-label': `Delete ${name} workout`,
          onclick: async () => {
            if (!confirm(`Delete the ${name} workout from ${formatDDMM(session.date)}?`)) return;
            await deleteSession(session.session_id);
            redraw();
          },
        }, '×') : null,
      ),
    );
  }

  return h('section', { class: `card week${isCurrent ? ' current' : ''}` },
    h('header', { class: 'week-head' },
      h('span', { class: 'week-title' }, `Week ${number}`),
      isCurrent ? h('span', { class: 'badge now' }, 'This week') : null,
      h('span', { class: 'week-range muted' }, weekRangeLabel(weekStartIso)),
    ),
    h('div', { class: 'week-body' }, track, list),
  );
}

/** Ícono ✓ en SVG (más nítido que el carácter de texto). */
function checkIcon() {
  const span = document.createElement('span');
  span.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return span.firstChild;
}
