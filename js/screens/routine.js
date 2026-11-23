// screens/routine.js — "Today's routine": la lista de ejercicios antes de empezar.
// URL: #/routine/<routine_id>/<fecha>
// Tocar un ejercicio muestra la imagen grande y sus instrucciones.
// El botón "Let's go!" crea el borrador de la sesión y abre el paso Warm-up.

import { h } from '../ui.js';
import { loadRoutines, doseLabel } from '../routines.js';
import { exerciseImage } from '../exercise-image.js';
import { silhouette } from '../silhouette.js';
import { todayISO, isISODate, dayLabel } from '../weeks.js';
import { createDraft, getDraft } from '../data.js';

export const title = "Today's routine";
export const tab = 'home';
export const back = ([, date]) => `#/choose/${isISODate(date) ? date : todayISO()}`;

export async function render(container, [routineId, date]) {
  if (!isISODate(date)) date = todayISO();
  const { routines } = await loadRoutines();
  const routine = routines.find((r) => r.id === routineId);
  if (!routine) throw new Error(`Routine "${routineId}" not found`);

  async function letsGo(event) {
    event.currentTarget.disabled = true; // evita doble toque
    if (await getDraft()) {
      alert('You already have a workout in progress. Resume or discard it from Home.');
      location.hash = '#/home';
      return;
    }
    await createDraft(date, routine);
    location.hash = '#/session';
  }

  container.append(
    // Encabezado: silueta + nombre + fecha
    h('div', { class: 'routine-head' },
      silhouette(routine.muscle_group),
      h('div', {},
        h('h2', {}, routine.name),
        h('div', { class: 'muted' }, `${dayLabel(date)} · ${routine.items.length} exercises`),
      ),
    ),

    // Lista de ejercicios (tocar uno abre/cierra su detalle)
    h('ul', { class: 'exercise-list' }, routine.items.map(exerciseRow)),

    // Botón fijo abajo
    h('div', { class: 'sticky-action' },
      h('button', { class: 'btn', onclick: letsGo }, "Let's go!"),
    ),
  );
}

function exerciseRow(item) {
  const detail = exerciseDetail(item);
  const row = h('li', { class: 'exercise-row expandable', 'aria-expanded': 'false' },
    h('div', { class: 'exercise-summary' },
      exerciseImage(item),
      h('div', { class: 'exercise-info' },
        h('div', { class: 'exercise-name' }, item.name),
        h('div', { class: 'exercise-dose' }, doseLabel(item)),
        item.note ? h('div', { class: 'exercise-note muted' }, item.note) : null,
      ),
      h('span', { class: 'chevron', 'aria-hidden': 'true' }, '›'),
    ),
    detail,
  );
  row.addEventListener('click', (event) => {
    if (event.target.closest('a')) return; // tocar el link de video no cierra el detalle
    const open = row.classList.toggle('open');
    row.setAttribute('aria-expanded', String(open));
  });
  return row;
}

/** Detalle: imagen grande + instrucciones + video. */
function exerciseDetail(item) {
  const d = item.details;
  return h('div', { class: 'exercise-detail' },
    item.image ? exerciseImage(item, { large: true }) : null,
    d?.match === 'approx'
      ? h('p', { class: 'muted small' }, `Image shows a similar exercise (${d.source_name}).`)
      : null,
    d?.instructions?.length
      ? h('ol', { class: 'instructions' }, d.instructions.map((step) => h('li', {}, step)))
      : null,
    !item.image && !item.video_url
      ? h('p', { class: 'muted small' }, 'No image for this exercise yet. You can add a video_url in routines.json.')
      : null,
    // video_url se abre fuera de la app (Safari / Instagram)
    item.video_url
      ? h('a', { class: 'video-link', href: item.video_url, target: '_blank', rel: 'noopener' }, '▶ Watch video')
      : null,
  );
}
