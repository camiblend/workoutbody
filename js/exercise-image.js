// exercise-image.js — imagen de un ejercicio.
//
// El dataset free-exercise-db trae 2 fotos por ejercicio (posición inicial y final).
// Las alternamos cada ~1 segundo para simular un GIF.
// En routines.json, "image" es la carpeta con esas fotos, ej:
//     "image": "img/exercises/db_goblet_squat"   → usa 0.jpg y 1.jpg de esa carpeta
// Si "image" es null, se muestra un ícono según el implemento (placeholder).

const FRAME_MS = 1000;

const PLACEHOLDER_ICONS = {
  // mancuerna
  dumbbell: '<rect x="8" y="22" width="32" height="4" rx="2"/><rect x="10" y="14" width="6" height="20" rx="2"/><rect x="32" y="14" width="6" height="20" rx="2"/><rect x="5" y="18" width="4" height="12" rx="1.5"/><rect x="39" y="18" width="4" height="12" rx="1.5"/>',
  // banda elástica (un aro)
  miniband: '<ellipse cx="24" cy="24" rx="15" ry="9" fill="none" stroke="currentColor" stroke-width="4.5"/>',
  // peso corporal (figura)
  bodyweight: '<circle cx="24" cy="10" r="5"/><path d="M15 18h18v3h-6v10l4 11h-4l-3-9-3 9h-4l4-11V21h-6z"/>',
};

/**
 * Devuelve un elemento con la imagen (animada) del ejercicio.
 * @param {object} item  item de rutina (tiene image e implement)
 */
export function exerciseImage(item) {
  if (!item.image) {
    const box = document.createElement('div');
    box.className = 'ex-img placeholder-img';
    box.innerHTML = `<svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">${PLACEHOLDER_ICONS[item.implement] ?? ''}</svg>`;
    return box;
  }

  const frames = [`./${item.image}/0.jpg`, `./${item.image}/1.jpg`];
  const img = document.createElement('img');
  img.className = 'ex-img';
  img.alt = item.name;
  img.loading = 'lazy';
  img.src = frames[0];

  let frame = 0;
  const timer = setInterval(() => {
    // Si la imagen ya no está en pantalla (cambiaste de pantalla), paramos el reloj
    if (!img.isConnected) {
      clearInterval(timer);
      return;
    }
    frame = 1 - frame; // 0 → 1 → 0 → 1 ...
    img.src = frames[frame];
  }, FRAME_MS);

  return img;
}
