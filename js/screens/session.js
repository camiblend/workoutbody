// screens/session.js — la sesión en 3 pasos (Warm-up → Routine → Cool-down).
// Etapa 3: marcador de posición. Los 3 pasos llegan en la etapa 4.
import { h } from '../ui.js';
import { getDraft, discardDraft } from '../data.js';
import { formatDDMM } from '../weeks.js';

export const title = 'Workout';
export const tab = 'home';
export const back = () => '#/home';

export async function render(container) {
  const draft = await getDraft();
  if (!draft) {
    location.hash = '#/home';
    return;
  }
  container.append(
    h('div', { class: 'card placeholder' },
      h('div', { class: 'big' }, '🚧'),
      h('h2', {}, `Workout started · ${formatDDMM(draft.date)}`),
      h('p', { class: 'muted' }, 'Warm-up, routine and cool-down steps are coming in stage 4.'),
    ),
    h('button', {
      class: 'btn secondary',
      onclick: async () => {
        await discardDraft();
        location.hash = '#/home';
      },
    }, 'Discard workout'),
  );
}
