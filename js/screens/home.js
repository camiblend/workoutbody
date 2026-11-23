// screens/home.js — pantalla Home (timeline de semanas).
// Etapa 1: solo un marcador de posición. La timeline real llega en la etapa 3.
import { h } from '../ui.js';

export const title = 'Home';
export const tab = 'home';

export function render(container) {
  container.append(
    h('div', { class: 'card placeholder' },
      h('div', { class: 'big' }, '🏋️'),
      h('h2', {}, 'Your weeks will appear here'),
      h('p', { class: 'muted' }, 'Coming in stage 3.'),
    ),
    h('button', { class: 'btn', onclick: () => alert('Start — coming in stage 3') }, 'Start'),
  );
}
