import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avertedShareFor, compareClasses, defaultInputs, excessAtBmi, projectCohort } from './model.js';

const close = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} ≉ ${b}`);

test('excess-cost curve hits the class anchors', () => {
  close(excessAtBmi(25), 0);
  close(excessAtBmi(37.5), 4300);
  close(excessAtBmi(44), 14300);
});

test('averted share grows with weight loss and realization', () => {
  assert.ok(avertedShareFor('II', 18, 70) > avertedShareFor('II', 10, 70));
  close(avertedShareFor('II', 14, 50) * 2, avertedShareFor('II', 14, 100));
});

test('full persistence, one year: hand-checked arithmetic', () => {
  const inp = { ...defaultInputs('II'), members: 1, tenure: 1, persistY1: 100 };
  const r = projectCohort(inp).rows[0];
  close(r.drug, inp.drugCost + inp.monitoringCost);
  close(r.subs, 0.15 * inp.sickDays * inp.subRate);
});

test('events are carved out of excess cost, not double counted', () => {
  const base = { ...defaultInputs('II'), eventReduction: 0 };
  const a = projectCohort(base).totals.medical;
  const b = projectCohort({ ...base, eventProb: 0 }).totals.medical;
  assert.ok(a < b, 'moving cost into an unreduced event bucket should lower routine savings');
});

test('break-even price zeroes the net impact', () => {
  const inp = defaultInputs('III');
  const price = projectCohort(inp).breakEvenPrice;
  close(projectCohort({ ...inp, drugCost: price }).totals.net, 0, 1e-3);
});

test('savings rank with severity', () => {
  const [I, II, III] = compareClasses(defaultInputs('II'));
  assert.ok(I.totals.net < II.totals.net && II.totals.net < III.totals.net);
});
