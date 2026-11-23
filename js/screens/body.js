// screens/body.js — pantalla Body (peso y medidas).
// Etapa 1: marcador de posición. El formulario y gráfico llegan en la etapa 5.
import { h } from '../ui.js';

export const title = 'Body';
export const tab = 'body';

export function render(container) {
  container.append(
    h('div', { class: 'card placeholder' },
      h('div', { class: 'big' }, '📏'),
      h('h2', {}, 'Weight & measurements'),
      h('p', { class: 'muted' }, 'Coming in stage 5.'),
    ),
  );
}
