// screens/body.js — pestaña Body: registrar peso y medidas, ver gráfico e historial.
//
// - Formulario: fecha (hoy por defecto, editable) + 6 medidas opcionales.
// - Gráfico de línea de la medida elegida.
// - Historial: tocar un registro lo carga en el formulario para editarlo o borrarlo.

import { h, showToast, parseDecimal } from '../ui.js';
import { lineChart } from '../chart.js';
import { todayISO, formatDDMM, dayLabel, isISODate } from '../weeks.js';
import { saveMeasurement, deleteMeasurement, listMeasurements } from '../data.js';

export const title = 'Body';
export const tab = 'body';

// Las 6 medidas: campo en la base de datos, nombre y unidad
const FIELDS = [
  { key: 'weight_kg', label: 'Weight', unit: 'kg' },
  { key: 'waist_cm', label: 'Waist', unit: 'cm' },
  { key: 'hip_cm', label: 'Hip', unit: 'cm' },
  { key: 'bust_cm', label: 'Bust', unit: 'cm' },
  { key: 'arm_cm', label: 'Arm', unit: 'cm' },
  { key: 'thigh_cm', label: 'Thigh', unit: 'cm' },
];

// Estado que se mantiene al volver a dibujar la pantalla
let chartField = 'weight_kg'; // medida elegida en el gráfico
let editing = null;           // registro que se está editando (o null = nuevo)

// Al entrar a la pestaña Body, el formulario parte limpio (no en modo edición)
export async function render(container) {
  editing = null;
  await draw(container);
}

// Dibuja la pantalla. redraw() la vuelve a dibujar SIN perder el estado
// (medida elegida y registro en edición).
async function draw(container) {
  const measurements = await listMeasurements(); // más antiguo → más nuevo
  const redraw = () => { container.replaceChildren(); return draw(container); };

  container.append(
    formCard(redraw),
    chartCard(measurements, redraw),
    historyCard(measurements, redraw),
  );
}

// ---------------------------------------------------------------------
// Formulario

function formCard(redraw) {
  const today = todayISO();
  const dateInput = h('input', {
    class: 'text-input', type: 'date', max: today, value: editing?.date ?? today, required: true,
  });

  // Un campo por medida
  const inputs = {};
  const fieldEls = FIELDS.map((f) => {
    inputs[f.key] = h('input', {
      class: 'text-input',
      type: 'text',
      inputmode: 'decimal',
      placeholder: '–',
      value: editing?.[f.key] ?? '',
    });
    return h('label', { class: 'measure-field' },
      h('span', { class: 'measure-label' }, f.label),
      h('span', { class: 'measure-input' }, inputs[f.key], h('span', { class: 'unit-small' }, f.unit)),
    );
  });

  const error = h('p', { class: 'field-error', hidden: true });

  async function save(event) {
    // Validación: fecha válida, números válidos y al menos una medida
    const values = { measurement_id: editing?.measurement_id, date: dateInput.value };
    let count = 0;
    for (const f of FIELDS) {
      const value = parseDecimal(inputs[f.key].value);
      if (Number.isNaN(value) || (value !== null && (value <= 0 || value > 500))) {
        error.textContent = `${f.label}: enter a valid number.`;
        error.hidden = false;
        return;
      }
      values[f.key] = value;
      if (value !== null) count++;
    }
    if (!isISODate(values.date)) {
      error.textContent = 'Choose a date.';
      error.hidden = false;
      return;
    }
    if (count === 0) {
      error.textContent = 'Enter at least one measurement.';
      error.hidden = false;
      return;
    }
    event.currentTarget.disabled = true;
    await saveMeasurement(values);
    showToast(editing ? 'Entry updated' : 'Saved!');
    editing = null;
    await redraw();
  }

  const buttons = editing
    ? h('div', { class: 'form-actions' },
        h('button', { class: 'btn', onclick: save }, 'Update'),
        h('div', { class: 'form-secondary' },
          h('button', {
            class: 'link-btn muted',
            onclick: () => { editing = null; redraw(); },
          }, 'Cancel'),
          h('button', {
            class: 'link-btn danger',
            onclick: async () => {
              if (!confirm(`Delete the entry from ${formatDDMM(editing.date)}?`)) return;
              await deleteMeasurement(editing.measurement_id);
              editing = null;
              showToast('Entry deleted');
              await redraw();
            },
          }, 'Delete'),
        ),
      )
    : h('button', { class: 'btn', onclick: save }, 'Save');

  return h('section', { class: `card${editing ? ' editing' : ''}` },
    h('h3', { class: 'card-title' }, editing ? 'Edit entry' : 'Log measurements'),
    h('label', { class: 'date-field' }, h('span', { class: 'measure-label' }, 'Date'), dateInput),
    h('div', { class: 'measure-grid' }, fieldEls),
    error,
    buttons,
  );
}

// ---------------------------------------------------------------------
// Gráfico

function chartCard(measurements, redraw) {
  const field = FIELDS.find((f) => f.key === chartField);
  const points = measurements
    .filter((m) => m[field.key] != null)
    .map((m) => ({ date: m.date, value: m[field.key] }));

  return h('section', { class: 'card' },
    h('h3', { class: 'card-title' }, 'Progress'),
    // Botones para elegir la medida
    h('div', { class: 'chips', role: 'tablist' },
      FIELDS.map((f) =>
        h('button', {
          class: `chip${f.key === chartField ? ' active' : ''}`,
          role: 'tab',
          'aria-selected': f.key === chartField ? 'true' : 'false',
          onclick: () => { chartField = f.key; redraw(); },
        }, f.label),
      ),
    ),
    lineChart(points, { unit: field.unit }),
  );
}

// ---------------------------------------------------------------------
// Historial (más nuevo arriba). Tocar un registro → editarlo.

function historyCard(measurements, redraw) {
  if (measurements.length === 0) return h('div');

  const rows = [...measurements].reverse().map((m) => {
    const parts = FIELDS
      .filter((f) => m[f.key] != null)
      .map((f) => (f.key === 'weight_kg' ? `${m[f.key]} kg` : `${f.label} ${m[f.key]}`));
    return h('li', {},
      h('button', {
        class: `history-row${editing?.measurement_id === m.measurement_id ? ' active' : ''}`,
        onclick: () => {
          editing = m;
          redraw();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
      },
        h('span', { class: 'history-date' }, dayLabel(m.date)),
        h('span', { class: 'history-values' }, parts.join(' · ')),
        h('span', { class: 'chevron', 'aria-hidden': 'true' }, '›'),
      ),
    );
  });

  return h('section', { class: 'card' },
    h('h3', { class: 'card-title' }, 'History'),
    h('p', { class: 'muted small' }, 'Tap an entry to edit it. Measurements in cm.'),
    h('ul', { class: 'history-list' }, rows),
  );
}
