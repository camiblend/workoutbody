// chart.js — gráfico de línea simple en SVG (sin librerías).
//
// lineChart([{ date: '2026-11-23', value: 65.4 }, ...], { unit: 'kg' })
// devuelve un elemento listo para insertar en la pantalla.
//
// Tocar (o pasar el mouse) sobre el gráfico muestra el valor del punto más
// cercano. Los datos exactos también están en el historial debajo.

import { daysBetween, formatDDMM } from './weeks.js';

const W = 320;   // ancho interno del dibujo (se escala al ancho de la pantalla)
const H = 180;   // alto interno
const PAD = { top: 16, right: 16, bottom: 26, left: 40 };

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Crea un elemento SVG con atributos (los SVG necesitan createElementNS). */
function svgEl(tag, attrs = {}, text) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text != null) el.textContent = text;
  return el;
}

/** Redondea para mostrar: 65.43 → "65.4", 80 → "80". */
function fmt(value) {
  return String(Math.round(value * 10) / 10);
}

export function lineChart(points, { unit }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'chart';

  if (points.length < 2) {
    wrapper.classList.add('chart-empty');
    wrapper.textContent = points.length === 0
      ? 'No data yet.'
      : 'Log at least 2 entries to see the trend.';
    return wrapper;
  }

  // ---------- Escalas: dato → posición en el dibujo ----------
  const first = points[0].date;
  const totalDays = Math.max(1, daysBetween(first, points[points.length - 1].date));
  const values = points.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  // Margen arriba/abajo para que la línea no toque los bordes
  const margin = Math.max((max - min) * 0.15, 0.5);
  min -= margin;
  max += margin;

  const x = (date) => PAD.left + (daysBetween(first, date) / totalDays) * (W - PAD.left - PAD.right);
  const y = (value) => PAD.top + (1 - (value - min) / (max - min)) * (H - PAD.top - PAD.bottom);

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Trend in ${unit}` });

  // ---------- Grilla horizontal (3 líneas) con valores ----------
  for (const value of [min + margin, (min + max) / 2, max - margin]) {
    svg.append(
      svgEl('line', { class: 'grid', x1: PAD.left, x2: W - PAD.right, y1: y(value), y2: y(value) }),
      svgEl('text', { class: 'axis', x: PAD.left - 6, y: y(value) + 4, 'text-anchor': 'end' }, fmt(value)),
    );
  }

  // ---------- Fechas: primera y última ----------
  svg.append(
    svgEl('text', { class: 'axis', x: PAD.left, y: H - 6, 'text-anchor': 'start' }, formatDDMM(first)),
    svgEl('text', { class: 'axis', x: W - PAD.right, y: H - 6, 'text-anchor': 'end' }, formatDDMM(points[points.length - 1].date)),
  );

  // ---------- Línea + puntos ----------
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  svg.append(svgEl('path', { class: 'line', d }));
  for (const p of points) {
    svg.append(svgEl('circle', { class: 'point', cx: x(p.date), cy: y(p.value), r: 4 }));
  }

  // Etiqueta directa solo en el último punto (el valor más reciente)
  // La ponemos al lado contrario de donde viene la línea: si bajó, debajo; si subió, arriba.
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const labelY = last.value <= prev.value ? y(last.value) + 18 : y(last.value) - 10;
  svg.append(svgEl('text', {
    class: 'value-label', x: x(last.date) - 6, y: labelY, 'text-anchor': 'end',
  }, `${fmt(last.value)} ${unit}`));

  // ---------- Interacción: línea vertical + tooltip en el punto más cercano ----------
  const crosshair = svgEl('line', { class: 'crosshair', y1: PAD.top, y2: H - PAD.bottom, visibility: 'hidden' });
  const focus = svgEl('circle', { class: 'point focus', r: 6, visibility: 'hidden' });
  svg.append(crosshair, focus);

  const tooltip = document.createElement('div');
  tooltip.className = 'chart-tooltip';
  tooltip.hidden = true;

  const showNearest = (event) => {
    const rect = svg.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width) * W; // a coordenadas del dibujo
    const nearest = points.reduce((best, p) =>
      Math.abs(x(p.date) - pointerX) < Math.abs(x(best.date) - pointerX) ? p : best);
    const px = x(nearest.date);
    const py = y(nearest.value);
    crosshair.setAttribute('x1', px);
    crosshair.setAttribute('x2', px);
    focus.setAttribute('cx', px);
    focus.setAttribute('cy', py);
    crosshair.setAttribute('visibility', 'visible');
    focus.setAttribute('visibility', 'visible');
    tooltip.hidden = false;
    tooltip.textContent = `${formatDDMM(nearest.date)} · ${fmt(nearest.value)} ${unit}`;
    // Posición del tooltip en píxeles reales, sin salirse por los lados
    const left = Math.min(Math.max((px / W) * rect.width, 60), rect.width - 60);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${(py / H) * rect.height - 44}px`;
  };
  const hide = () => {
    crosshair.setAttribute('visibility', 'hidden');
    focus.setAttribute('visibility', 'hidden');
    tooltip.hidden = true;
  };
  svg.addEventListener('pointerdown', showNearest);
  svg.addEventListener('pointermove', showNearest);
  svg.addEventListener('pointerleave', hide);

  wrapper.append(svg, tooltip);
  return wrapper;
}
