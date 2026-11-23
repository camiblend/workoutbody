// Tests de data/routines.json y js/routines.js. Correr con:  npm test
// Si editas routines.json y te equivocas (ej. un exercise_id mal escrito),
// este test te dice dónde.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareRoutines, doseLabel, usesWeight } from '../js/routines.js';

const raw = JSON.parse(readFileSync(new URL('../data/routines.json', import.meta.url)));

test('routines.json is valid and every exercise_id exists', () => {
  assert.doesNotThrow(() => prepareRoutines(raw));
});

test('the 7 muscle groups exist, in the grid order', () => {
  const groups = prepareRoutines(raw).routines.map((r) => r.muscle_group);
  assert.deepEqual(groups, ['full_body', 'abs', 'butt_leg', 'arm', 'shoulder', 'back', 'chest']);
});

test('routine ids are unique', () => {
  const ids = raw.routines.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('only allowed implements are used', () => {
  for (const [id, ex] of Object.entries(raw.exercises)) {
    assert.ok(['dumbbell', 'miniband', 'bodyweight'].includes(ex.implement), id);
  }
});

test('dose labels', () => {
  const { routines } = prepareRoutines(raw);
  const abs = routines.find((r) => r.id === 'abs_beginner');
  assert.deepEqual(abs.items.map(doseLabel),
    ['3×15', '3×8 per side', '3×20 s', '3×10 per side', '3×10']);
});

test('kg field only for dumbbell exercises', () => {
  const { routines } = prepareRoutines(raw);
  const chest = routines.find((r) => r.id === 'chest_beginner');
  assert.deepEqual(chest.items.map(usesWeight), [true, true, true, true, false]);
});

test('a wrong exercise_id gives a clear error', () => {
  const broken = structuredClone(raw);
  broken.routines[0].items[0].exercise_id = 'typo';
  assert.throws(() => prepareRoutines(broken), /Unknown exercise_id "typo" in routine "full_body_beginner", item 1/);
});
