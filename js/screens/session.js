// screens/session.js — la sesión en 3 pasos: Warm-up → Routine → Cool-down.
// URL: #/session
//
// Todo se guarda en el borrador apenas lo escribes o marcas. Si sales de la
// app a mitad de camino, al volver aparece "Workout in progress → Resume" en
// Home y retomas en el mismo paso donde quedaste (draft.step).
// Al tocar Finish la sesión pasa a "completed" y se pinta el punto verde.

import { h, showToast } from '../ui.js';
import { loadRoutines, doseLabel, usesWeight } from '../routines.js';
import { exerciseImage } from '../exercise-image.js';
import { dayLabel } from '../weeks.js';
import { getDraft, updateDraft, completeDraft } from '../data.js';

export const title = 'Workout';
export const tab = 'home';
export const back = () => '#/home'; // volver a Home NO borra el borrador

const STEPS = [
  { id: 'warmup', label: 'Warm-up' },
  { id: 'routine', label: 'Routine' },
  { id: 'cooldown', label: 'Cool-down' },
];

export async function render(container) {
  const draft = await getDraft();
  if (!draft) {
    location.hash = '#/home';
    return;
  }

  // Buscamos la rutina para mostrar imágenes y series×reps de cada ejercicio
  const { routines } = await loadRoutines();
  const routine = routines.find((r) => r.id === draft.routine_id);

  // Para cambiar de paso: guardamos el paso y volvemos a dibujar
  const goTo = async (step) => {
    await updateDraft({ step });
    container.replaceChildren();
    await render(container);
    window.scrollTo(0, 0);
  };

  container.append(
    h('div', { class: 'session-head' },
      h('h2', {}, routine?.name ?? draft.muscle_group),
      h('span', { class: 'muted' }, dayLabel(draft.date)),
    ),
    stepper(draft.step),
  );

  if (draft.step === 'warmup') container.append(warmupStep(draft, goTo));
  if (draft.step === 'routine') container.append(routineStep(draft, routine, goTo));
  if (draft.step === 'cooldown') container.append(cooldownStep(draft, goTo));
}

// ---------------------------------------------------------------------
// Indicador de pasos: (1) Warm-up — (2) Routine — (3) Cool-down

function stepper(currentStep) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
  return h('ol', { class: 'stepper' },
    STEPS.map((step, i) =>
      h('li', { class: i < currentIndex ? 'done' : i === currentIndex ? 'active' : '' },
        h('span', { class: 'step-num' }, i < currentIndex ? '✓' : String(i + 1)),
        h('span', { class: 'step-label' }, step.label),
      ),
    ),
  );
}

// ---------------------------------------------------------------------
// Paso 1 y 3: minutos caminados

/**
 * Campo de minutos reutilizado en Warm-up y Cool-down.
 * Devuelve { element, read } — read() entrega el número o null si es inválido.
 */
function minutesField(initialValue) {
  const input = h('input', {
    class: 'big-input',
    type: 'number',
    inputmode: 'numeric', // teclado numérico en iPhone
    pattern: '[0-9]*',
    min: '0',
    max: '300',
    placeholder: '0',
    value: initialValue ?? '',
  });
  const error = h('p', { class: 'field-error', hidden: true }, 'Enter the minutes (0 if you skipped it).');

  const read = () => {
    const value = Number(input.value);
    const valid = input.value.trim() !== '' && Number.isInteger(value) && value >= 0 && value <= 300;
    error.hidden = valid;
    return valid ? value : null;
  };

  const element = h('div', { class: 'minutes-field' },
    h('div', { class: 'big-input-row' }, input, h('span', { class: 'unit' }, 'min')),
    error,
  );
  return { element, read, input };
}

function warmupStep(draft, goTo) {
  const field = minutesField(draft.warmup_min);
  return h('div', { class: 'step-body' },
    h('div', { class: 'card' },
      h('h3', {}, 'Warm-up'),
      h('p', { class: 'muted' }, 'How many minutes did you walk?'),
      field.element,
    ),
    h('button', {
      class: 'btn',
      onclick: async () => {
        const minutes = field.read();
        if (minutes === null) return;
        await updateDraft({ warmup_min: minutes });
        await goTo('routine');
      },
    }, 'OK'),
  );
}

function cooldownStep(draft, goTo) {
  const field = minutesField(draft.cooldown_min);
  return h('div', { class: 'step-body' },
    h('div', { class: 'card' },
      h('h3', {}, 'Cool-down'),
      h('p', { class: 'muted' }, 'How many minutes did you walk?'),
      field.element,
    ),
    h('button', {
      class: 'btn finish-btn',
      onclick: async (event) => {
        const minutes = field.read();
        if (minutes === null) return;
        event.currentTarget.disabled = true; // evita guardar dos veces
        await completeDraft({ cooldown_min: minutes });
        location.hash = '#/home';
        showToast('Workout saved! 💪');
      },
    }, 'Finish'),
    h('button', { class: 'link-btn back-step', onclick: () => goTo('routine') }, '‹ Back to routine'),
  );
}

// ---------------------------------------------------------------------
// Paso 2: checklist de ejercicios + kg opcional

function routineStep(draft, routine, goTo) {
  // Copia de los ejercicios del borrador; cada cambio se guarda al tiro
  const exercises = draft.exercises.map((e) => ({ ...e }));
  const save = () => updateDraft({ exercises });

  const counter = h('span', { class: 'muted' });
  const updateCounter = () => {
    const done = exercises.filter((e) => e.done).length;
    counter.textContent = `${done}/${exercises.length} done`;
  };
  updateCounter();

  const rows = exercises.map((exercise) => {
    // Datos de la rutina (imagen, series×reps). Si la rutina cambió en el JSON
    // y ya no está, igual mostramos el nombre guardado.
    const item = routine?.items.find((i) => i.exercise_id === exercise.exercise_id)
      ?? { name: exercise.exercise_name, implement: null, image: null };

    const row = h('li', { class: `check-row${exercise.done ? ' done' : ''}` });

    const toggle = async () => {
      exercise.done = !exercise.done;
      row.classList.toggle('done', exercise.done);
      updateCounter();
      await save();
    };

    // Campo de kg: solo para ejercicios con mancuernas
    let weightField = null;
    if (usesWeight(item)) {
      const input = h('input', {
        class: 'kg-input',
        type: 'text',
        inputmode: 'decimal', // teclado numérico con coma/punto
        placeholder: '–',
        'aria-label': `${item.name} weight in kg`,
        value: exercise.weight_kg ?? '',
        onclick: (e) => e.stopPropagation(), // tocar el campo no marca el ejercicio
        oninput: async () => {
          // Acepta "4,5" o "4.5". Vacío o inválido → null.
          const value = parseFloat(input.value.replace(',', '.'));
          exercise.weight_kg = Number.isFinite(value) && value > 0 ? value : null;
          await save();
        },
      });
      weightField = h('label', { class: 'kg-field', onclick: (e) => e.stopPropagation() },
        input, h('span', {}, 'kg'));
    }

    row.append(
      exerciseImage(item),
      h('div', { class: 'exercise-info' },
        h('div', { class: 'exercise-name' }, item.name),
        item.sets ? h('div', { class: 'exercise-dose' }, doseLabel(item)) : null,
        weightField,
      ),
      h('button', {
        class: 'check-btn',
        'aria-label': `Mark ${item.name} as done`,
        onclick: (e) => { e.stopPropagation(); toggle(); },
      }, checkIcon()),
    );
    // Tocar cualquier parte de la fila también marca/desmarca
    row.addEventListener('click', toggle);
    return row;
  });

  return h('div', { class: 'step-body' },
    h('div', { class: 'routine-step-head' }, h('h3', {}, 'Routine'), counter),
    h('ul', { class: 'exercise-list' }, rows),
    h('div', { class: 'sticky-action' },
      h('button', { class: 'btn', onclick: () => goTo('cooldown') }, 'OK'),
    ),
    h('button', { class: 'link-btn back-step', onclick: () => goTo('warmup') }, '‹ Back to warm-up'),
  );
}

function checkIcon() {
  const span = document.createElement('span');
  span.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return span.firstChild;
}
