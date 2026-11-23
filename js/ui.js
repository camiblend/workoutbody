// ui.js — funciones pequeñas de ayuda para dibujar pantallas.
// "export" hace que otros archivos puedan importarlas (como "from ui import h" en Python).

/**
 * h() crea un elemento HTML. Es un atajo para no escribir
 * document.createElement + setAttribute + appendChild cada vez.
 *
 * Ejemplo:
 *   h('button', { class: 'btn', onclick: hacerAlgo }, 'Start')
 *   → <button class="btn">Start</button>  (y al tocarlo llama a hacerAlgo)
 *
 * @param {string} tag        nombre de la etiqueta: 'div', 'p', 'button'...
 * @param {object} attrs      atributos; los que empiezan con "on" son eventos
 * @param {...any} children   texto u otros elementos que van dentro
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on') && typeof value === 'function') {
      // onclick → evento "click"
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== false && value != null) {
      el.setAttribute(key, value === true ? '' : value);
    }
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    // Si es texto lo convertimos en nodo de texto (esto evita inyectar HTML por error)
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}
