// Tests de js/weeks.js. Correr con:  npm test
// Es como pytest: cada test() es un caso y assert.equal(actual, esperado) compara.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  todayISO, nowLocal, addDays, weekStart, weekNumber, formatDDMM, weekRangeLabel,
} from '../js/weeks.js';

test('weekStart: Monday stays Monday', () => {
  assert.equal(weekStart('2026-11-23'), '2026-11-23');
});

test('weekStart: Sunday belongs to the previous Monday', () => {
  assert.equal(weekStart('2026-11-29'), '2026-11-23');
});

test('weekStart: across month and year boundaries', () => {
  assert.equal(weekStart('2026-12-02'), '2026-11-30');
  assert.equal(weekStart('2027-01-01'), '2026-12-28'); // viernes
});

test('weekStart: on Chile DST change days (April and September)', () => {
  assert.equal(weekStart('2027-04-04'), '2027-03-29'); // domingo, se atrasa la hora
  assert.equal(weekStart('2027-09-05'), '2027-08-30'); // domingo, se adelanta la hora
});

test('addDays handles leap years', () => {
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2028-03-01', -1), '2028-02-29');
});

test('weekNumber counts from the first week', () => {
  assert.equal(weekNumber('2026-11-23', '2026-11-23'), 1);
  assert.equal(weekNumber('2026-11-30', '2026-11-23'), 2);
  assert.equal(weekNumber('2027-01-04', '2026-11-23'), 7);
});

test('todayISO uses Santiago time, not UTC', () => {
  // 02:59 UTC del lunes 23 = 23:59 del domingo 22 en Santiago (verano, UTC-3)
  assert.equal(todayISO(new Date('2026-11-23T02:59:00Z')), '2026-11-22');
  // 03:00 UTC = 00:00 del lunes en Santiago → semana nueva
  assert.equal(todayISO(new Date('2026-11-23T03:00:00Z')), '2026-11-23');
  // En invierno Santiago es UTC-4
  assert.equal(todayISO(new Date('2026-07-06T03:59:00Z')), '2026-07-05');
  assert.equal(todayISO(new Date('2026-07-06T04:00:00Z')), '2026-07-06');
});

test('new week starts exactly at Monday 00:00 Santiago', () => {
  const sundayNight = new Date('2026-11-30T02:59:59Z');  // dom 29, 23:59:59
  const mondayStart = new Date('2026-11-30T03:00:00Z');  // lun 30, 00:00:00
  assert.equal(weekStart(todayISO(sundayNight)), '2026-11-23');
  assert.equal(weekStart(todayISO(mondayStart)), '2026-11-30');
});

test('nowLocal formats Santiago date and time', () => {
  assert.equal(nowLocal(new Date('2026-11-23T21:45:10Z')), '2026-11-23 18:45:10');
});

test('labels', () => {
  assert.equal(formatDDMM('2026-11-05'), '05/11');
  assert.equal(weekRangeLabel('2026-11-23'), '23/11 – 29/11');
});
