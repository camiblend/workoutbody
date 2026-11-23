// silhouette.js — dibuja una figura humana simple (SVG) con músculos resaltados.
//
// La figura está hecha de formas básicas (círculos, elipses, rectángulos)
// en un lienzo de 100 × 160. Cada zona muscular es un grupo de formas con
// nombre; las zonas del grupo elegido se pintan en azul y el resto en gris.
//
// Para cambiar cómo se ve un grupo muscular, edita MUSCLE_GROUPS (al final).

// ---------- Formas de la figura ----------
// Cada zona: lista de formas SVG escritas como texto.
const BASE = [
  // cabeza y cuello
  '<circle cx="50" cy="14" r="9"/>',
  '<rect x="45.5" y="21" width="9" height="8" rx="3"/>',
  // tronco (silueta del torso hasta la cadera)
  '<path d="M33 30 Q50 26 67 30 L64 58 Q63 72 62 82 L38 82 Q37 72 36 58 Z"/>',
  // manos
  '<circle cx="22" cy="86" r="3.5"/>', '<circle cx="78" cy="86" r="3.5"/>',
  // pies
  '<ellipse cx="42" cy="155" rx="5" ry="3"/>', '<ellipse cx="58" cy="155" rx="5" ry="3"/>',
];

const FRONT_ZONES = {
  shoulders: [
    '<circle cx="31.5" cy="35" r="7"/>', '<circle cx="68.5" cy="35" r="7"/>',
  ],
  chest: [
    '<ellipse cx="42.5" cy="42" rx="8.5" ry="6.5"/>', '<ellipse cx="57.5" cy="42" rx="8.5" ry="6.5"/>',
  ],
  abs: [
    '<rect x="41" y="51" width="18" height="27" rx="4"/>',
  ],
  arms: [
    // brazo (bíceps/tríceps)
    '<rect x="23" y="40" width="9" height="22" rx="4.5" transform="rotate(8 27 51)"/>',
    '<rect x="68" y="40" width="9" height="22" rx="4.5" transform="rotate(-8 73 51)"/>',
    // antebrazo
    '<rect x="20" y="59" width="7.5" height="24" rx="3.75" transform="rotate(4 23 72)"/>',
    '<rect x="72.5" y="59" width="7.5" height="24" rx="3.75" transform="rotate(-4 77 72)"/>',
  ],
  hips: [
    '<path d="M38 80 L62 80 L64 92 L36 92 Z"/>',
  ],
  legs: [
    // muslos
    '<rect x="36.5" y="88" width="12" height="35" rx="6"/>', '<rect x="51.5" y="88" width="12" height="35" rx="6"/>',
    // pantorrillas
    '<rect x="37.5" y="124" width="9" height="29" rx="4.5"/>', '<rect x="53.5" y="124" width="9" height="29" rx="4.5"/>',
  ],
};

const BACK_ZONES = {
  shoulders: FRONT_ZONES.shoulders,
  arms: FRONT_ZONES.arms,
  upperBack: [
    // trapecio + dorsales (forma de "V")
    '<path d="M38 31 Q50 28 62 31 L65 40 L59 62 L50 66 L41 62 L35 40 Z"/>',
  ],
  lowerBack: [
    '<rect x="43" y="64" width="14" height="14" rx="4"/>',
  ],
  legs: FRONT_ZONES.legs,
  // glúteos después de las piernas, para que se dibujen encima de los muslos
  glutes: [
    '<ellipse cx="43.5" cy="88" rx="7.5" ry="7" class="sil-edge"/>', '<ellipse cx="56.5" cy="88" rx="7.5" ry="7" class="sil-edge"/>',
  ],
};

// ---------- Qué se resalta en cada grupo muscular ----------
// view: 'front' (de frente) o 'back' (de espaldas)
// highlight: zonas que se pintan en azul
export const MUSCLE_GROUPS = {
  full_body: { view: 'front', highlight: ['shoulders', 'chest', 'abs', 'arms', 'hips', 'legs'] },
  abs:       { view: 'front', highlight: ['abs'] },
  butt_leg:  { view: 'back',  highlight: ['glutes', 'legs'] },
  arm:       { view: 'front', highlight: ['arms'] },
  shoulder:  { view: 'front', highlight: ['shoulders'] },
  back:      { view: 'back',  highlight: ['upperBack', 'lowerBack'] },
  chest:     { view: 'front', highlight: ['chest'] },
};

/**
 * Devuelve un elemento <div> que contiene el SVG del grupo muscular.
 * @param {string} muscleGroup  ej. 'chest'
 */
export function silhouette(muscleGroup) {
  const { view, highlight } = MUSCLE_GROUPS[muscleGroup];
  const zones = view === 'front' ? FRONT_ZONES : BACK_ZONES;

  // Primero las zonas grises, después las azules (así quedan encima)
  const grey = [];
  const blue = [];
  for (const [name, shapes] of Object.entries(zones)) {
    (highlight.includes(name) ? blue : grey).push(...shapes);
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'silhouette';
  // Seguro usar innerHTML aquí: el texto es fijo, nunca viene de lo que escribe el usuario
  wrapper.innerHTML = `
    <svg viewBox="0 0 100 160" aria-hidden="true">
      <g class="sil-base">${BASE.join('')}</g>
      <g class="sil-zone">${grey.join('')}</g>
      <g class="sil-hi">${blue.join('')}</g>
    </svg>`;
  return wrapper;
}
