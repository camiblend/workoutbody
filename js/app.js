// app.js — punto de entrada de la app.
// Hace dos cosas:
//   1. Navegación ("router"): según la parte de la URL después de "#",
//      decide qué pantalla dibujar. Ej: index.html#/body → pantalla Body.
//   2. Registra el service worker (sw.js) para que la app funcione sin internet.

import * as home from './screens/home.js';
import * as body from './screens/body.js';
import * as settings from './screens/settings.js';

// Tabla de rutas: "nombre en la URL" → módulo de la pantalla.
// Cada módulo de pantalla exporta:
//   - title:  texto de la barra superior
//   - tab:    qué pestaña inferior se marca ('home', 'body' o null)
//   - render(container): dibuja la pantalla dentro de container
// En etapas siguientes agregaremos: choose, routine, session.
const routes = {
  home,
  body,
  settings,
};

const screenEl = document.getElementById('screen');
const titleEl = document.getElementById('screen-title');

/** Lee la ruta actual desde la URL. "#/body" → "body". Si no hay, "home". */
function currentRoute() {
  const name = location.hash.replace(/^#\/?/, '').split('/')[0];
  return routes[name] ? name : 'home';
}

/** Dibuja la pantalla correspondiente a la URL actual. */
async function render() {
  const name = currentRoute();
  const screen = routes[name];

  titleEl.textContent = screen.title;

  // Marca la pestaña activa en la barra inferior
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === screen.tab);
  });
  document.getElementById('settings-btn').classList.toggle('active', name === 'settings');

  // Borra la pantalla anterior y dibuja la nueva
  screenEl.replaceChildren();
  await screen.render(screenEl);
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
