// sw.js — "service worker": un script que el navegador corre en segundo plano.
// Su trabajo aquí: guardar una copia de la app en el teléfono (caché)
// para que abra y funcione SIN internet.
//
// Estrategia "stale-while-revalidate":
//   - Cuando la app pide un archivo, se entrega al tiro la copia guardada (rápido, offline).
//   - En paralelo, si hay internet, se descarga la versión nueva y se guarda
//     para la PRÓXIMA vez que abras la app.
//   → Después de publicar cambios, se ven al segundo abrir de la app.
//
// Si alguna vez la app queda "pegada" en una versión vieja, sube el número de
// CACHE_VERSION, publica, y abre la app dos veces.

const CACHE_VERSION = 'v17';
const CACHE_NAME = `workoutbody-${CACHE_VERSION}`;

// Archivos que se guardan apenas se instala la app (el "cascarón").
// Las imágenes de ejercicios se irán guardando a medida que se usen.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/ui.js',
  './js/db.js',
  './js/data.js',
  './js/weeks.js',
  './js/routines.js',
  './js/silhouette.js',
  './js/exercise-image.js',
  './js/chart.js',
  './js/sync.js',
  './js/wake-lock.js',
  './data/routines.json',
  './data/exercise-details.json',
  './js/screens/home.js',
  './js/screens/choose.js',
  './js/screens/routine.js',
  './js/screens/session.js',
  './js/screens/body.js',
  './js/screens/settings.js',
  './img/icons/icon-192.png',
  './img/icons/apple-touch-icon.png',
];

// "install": primera vez que se registra el service worker → guarda el cascarón.
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // cache: 'reload' = pedir SIEMPRE la versión fresca al servidor (y no una copia
    // vieja que el navegador tenga guardada), para que la actualización quede completa.
    await cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'reload' })));
    // Imágenes de ejercicios: las leemos de routines.json y las guardamos todas,
    // así funcionan sin internet desde el primer uso. Si alguna falla, no se
    // bloquea la instalación (se guardará cuando se vea con internet).
    try {
      const routines = await (await cache.match('./data/routines.json')).json();
      const images = Object.values(routines.exercises)
        .filter((e) => e.image)
        .flatMap((e) => [`./${e.image}/0.jpg`, `./${e.image}/1.jpg`]);
      await Promise.allSettled(images.map((url) => cache.add(url)));
    } catch (err) {
      console.warn('Could not pre-cache exercise images', err);
    }
  })());
  self.skipWaiting(); // activarse sin esperar a que se cierren pestañas viejas
});

// "activate": borra cachés de versiones anteriores.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names
        .filter((name) => name.startsWith('workoutbody-') && name !== CACHE_NAME)
        .map((name) => caches.delete(name)),
    )),
  );
  self.clients.claim(); // tomar control de la página ya abierta
});

// "fetch": cada vez que la app pide un archivo.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  // Solo manejamos lecturas (GET) de NUESTRO sitio.
  // Las llamadas al Apps Script (POST, otro dominio) pasan directo sin tocar.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    // ignoreSearch: "index.html?x=1" usa la misma copia que "index.html"
    const cached = await cache.match(request, { ignoreSearch: true });

    // Descarga en segundo plano la versión nueva y actualiza la caché
    const network = fetch(request)
      .then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
      .catch(() => null); // sin internet: no pasa nada

    if (cached) {
      event.waitUntil(network); // dejar terminar la actualización
      return cached;
    }
    // No había copia guardada: esperamos a la red
    const fresh = await network;
    return fresh || new Response('Offline', { status: 503 });
  })());
});
