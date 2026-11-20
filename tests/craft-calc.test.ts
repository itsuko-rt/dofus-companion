import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkInput, plan } from '../src/craft-calc.ts';

test('crafts needed come from the XP shown in game, rounded up, and resources multiply', () => {
  const r = plan({ xpNow: 1200, xpNext: 2000, xpPerAction: 30 }, [{ id: 1, name: 'Blé', qty: 4 }, { id: 2, name: 'Eau', qty: 1 }]);
  assert.equal(r.remaining, 800);
  assert.equal(r.actions, 27); // 800 / 30 = 26.7 → 27
  assert.deepEqual(r.resources.map((g) => g.total), [108, 27]);
  assert.equal(plan({ xpNow: 2000, xpNext: 2000, xpPerAction: 10 }).actions, 0);
});

test('the calculator refuses numbers that cannot come from the game', () => {
  assert.equal(checkInput({ xpNow: 10, xpNext: 100, xpPerAction: 5 }), null);
  assert.match(checkInput({ xpNow: 200, xpNext: 100, xpPerAction: 5 })!, /dépasse/);
  assert.match(checkInput({ xpNow: 0, xpNext: 100, xpPerAction: 0 })!, /XP par fabrication/);
  assert.match(checkInput({ xpNow: -1, xpNext: 100, xpPerAction: 5 })!, /entier positif/);
  assert.match(checkInput({ xpNow: 1.5, xpNext: 100, xpPerAction: 5 })!, /entier positif/);
  assert.match(checkInput({ xpNow: Number.NaN, xpNext: 100, xpPerAction: 5 })!, /entier positif/);
});
