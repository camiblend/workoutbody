// app.js — punto de entrada de la app.
// Hace dos cosas:
//   1. Navegación ("router"): según la parte de la URL después de "#",
//      decide qué pantalla dibujar. Ej: index.html#/body → pantalla Body.
//   2. Registra el service worker (sw.js) para que la app funcione sin internet.

import { h } from './ui.js';
import * as home from './screens/home.js';
import * as choose from './screens/choose.js';
import * as routine from './screens/routine.js';
import * as session from './screens/session.js';
import * as body from './screens/body.js';
import * as settings from './screens/settings.js';

// Tabla de rutas: "nombre en la URL" → módulo de la pantalla.
// Cada módulo de pantalla exporta:
//   - title:  texto de la barra superior
//   - tab:    qué pestaña inferior se marca ('home', 'body' o null)
//   - back:   (opcional) función que devuelve a dónde va el botón "‹ Back"
//   - render(container, params): dibuja la pantalla dentro de container
//
// "params" son las partes extra de la URL. Ej: #/routine/chest_beginner/2026-11-23
//   → pantalla "routine", params = ['chest_beginner', '2026-11-23']
const routes = {
  home,
  choose,
  routine,
  session,
  body,
  settings,
};

const screenEl = document.getElementById('screen');
const titleEl = document.getElementById('screen-title');
const backEl = document.getElementById('back-btn');

/** Lee la ruta actual desde la URL. "#/routine/a/b" → { name: 'routine', params: ['a', 'b'] } */
function currentRoute() {
  const [name, ...params] = location.hash.replace(/^#\/?/, '').split('/');
  return routes[name] ? { name, params: params.map(decodeURIComponent) } : { name: 'home', params: [] };
}

/** Dibuja la pantalla correspondiente a la URL actual. */
async function render() {
  const { name, params } = currentRoute();
  const screen = routes[name];

  titleEl.textContent = screen.title;

  // Botón "‹" para volver (solo en pantallas que lo definen)
  const backHref = screen.back ? screen.back(params) : null;
  backEl.hidden = !backHref;
  if (backHref) backEl.href = backHref;

  // Marca la pestaña activa en la barra inferior
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === screen.tab);
  });
  document.getElementById('settings-btn').classList.toggle('active', name === 'settings');

  // Borra la pantalla anterior y dibuja la nueva
  screenEl.replaceChildren();
  try {
    await screen.render(screenEl, params);
  } catch (err) {
    // Si algo falla, mostramos el error en vez de una pantalla en blanco
    console.error(err);
    screenEl.replaceChildren(
      h('div', { class: 'card' },
        h('h2', {}, 'Something went wrong'),
        h('p', { class: 'muted' }, err.message),
      ),
    );
  }
  window.scrollTo(0, 0);
}

// "hashchange" ocurre cada vez que cambia lo que va después de "#"
// (por ejemplo al tocar un enlace href="#/body").
window.addEventListener('hashchange', render);
render();

// ---------- Service worker (modo offline) ----------
// Solo funciona en https o en localhost. En otros casos se ignora.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((err) => {
    console.warn('Service worker registration failed:', err);
  });
}
