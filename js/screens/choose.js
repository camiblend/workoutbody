// screens/choose.js — "What do you want to train today?"
// URL: #/choose/<fecha>   (la fecha se registró al tocar Start en Home)
// Grilla con los 7 grupos musculares; tocar uno abre "Today's routine".

import { h } from '../ui.js';
import { loadRoutines } from '../routines.js';
import { silhouette } from '../silhouette.js';
import { todayISO, isISODate } from '../weeks.js';

export const title = 'New workout';
export const tab = 'home';
export const back = () => '#/home';

export async function render(container, [date]) {
  // Si la URL no trae una fecha válida, usamos hoy
  if (!isISODate(date)) date = todayISO();
  const { routines } = await loadRoutines();

  container.append(
    h('h2', { class: 'screen-question' }, 'What do you want to train today?'),
    h('div', { class: 'group-grid' },
      routines.map((routine) =>
        h('a', {
          class: `group-card${routine.muscle_group === 'full_body' ? ' wide' : ''}`,
          href: `#/routine/${routine.id}/${date}`,
        },
          silhouette(routine.muscle_group),
          h('span', { class: 'group-name' }, routine.name),
        ),
      ),
    ),
  );
}
