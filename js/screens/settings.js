// screens/settings.js — pantalla Settings.
// Etapa 1: marcador de posición. URL/token, estatura, sync y respaldo llegan en la etapa 6.
import { h } from '../ui.js';

export const title = 'Settings';
export const tab = null; // no corresponde a ninguna pestaña inferior

export function render(container) {
  container.append(
    h('div', { class: 'card placeholder' },
      h('div', { class: 'big' }, '⚙️'),
      h('h2', {}, 'Settings'),
      h('p', { class: 'muted' }, 'Coming in stage 6.'),
    ),
    // Muestra si el modo offline quedó activo (útil para probar la etapa 1)
    h('div', { class: 'card' },
      h('p', { class: 'muted' }, 'Offline mode: ',
        h('strong', {}, navigator.serviceWorker?.controller ? 'ready ✓' : 'not yet (reopen the app)'),
      ),
    ),
  );
}
