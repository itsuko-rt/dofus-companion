import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeBuild, isMetaEffect, type Item, type ItemEffect, type ItemSet } from '../src/stats.ts';
import { latestDb, loadItems } from '../src/load.ts';

const fx = (characteristic: number | null, max: number, sign = 1, text = 'x'): ItemEffect =>
  ({ actionId: 0, min: max, max, text, characteristic, sign });
const kw = new Map([[1, 'actionPoints'], [11, 'vitality'], [15, 'intelligence'], [10, 'strength'], [44, 'initiative'], [19, 'range']]);
const item = (id: number, effects: ItemEffect[], setId: number | null = null): Item =>
  ({ id, name: `I${id}`, typeId: 1, typeName: 'Chapeau', level: 100, setId, effects });

test('adds items at max roll, maluses, base AP/MP, points, scrolls and exos', () => {
  const items = new Map([
    [1, item(1, [fx(11, 150), fx(15, 50), fx(44, 200, -1)])],
    [2, item(2, [fx(1, 1), fx(15, 40)])],
  ]);
  const s = computeBuild({ level: 200, items: [1, 2, 99, { id: 5, type: 'mount' }],
    characteristics: { intelligence: 398 }, scrolls: { intelligence: 100, vitality: 100 }, exos: { ap: true, range: true } },
  items, new Map(), kw);
  assert.equal(s.totals.actionPoints, 7 + 1 + 1);
  assert.equal(s.totals.movementPoints, 3);
  assert.equal(s.totals.vitality, 150 + 100);
  assert.equal(s.totals.intelligence, 50 + 40 + 398 + 100);
  assert.equal(s.totals.initiative, -200);
  assert.equal(s.totals.range, 1);
  assert.deepEqual(s.missing, [99]);
  assert.deepEqual(s.elements, ['Feu']);
  assert.equal(computeBuild({ level: 50, items: [] }, items, new Map(), kw).totals.actionPoints, 6);
});

test('set bonus uses bonuses[pieces - 1]', () => {
  const set: ItemSet = { id: 7, name: 'Bouftou', itemIds: [1, 2, 3], bonuses: [[], [fx(10, 10)], [fx(10, 30)]] };
  const items = new Map([[1, item(1, [], 7)], [2, item(2, [], 7)]]);
  const s = computeBuild({ level: 10, items: [1, 2] }, items, new Map([[7, set]]), kw);
  assert.equal(s.totals.strength, 10);
  assert.equal(s.sets[0].pieces, 2);
});

test('multi-element and meta effects', () => {
  const items = new Map([[1, item(1, [fx(15, 100), fx(10, 80)])]]);
  assert.deepEqual(computeBuild({ level: 100, items: [1] }, items, new Map(), kw).elements, ['Feu', 'Terre']);
  // uniform scrolls must not turn a single-element build into a multi-element one
  const scrolls = { strength: 100, intelligence: 100, chance: 100, agility: 100 };
  assert.deepEqual(computeBuild({ level: 60, items: [], characteristics: { agility: 150 }, scrolls }, items, new Map(), kw).elements, ['Air']);
  assert.ok(isMetaEffect(fx(null, 0, 1, 'Échangeable : 0')));
  assert.ok(!isMetaEffect(fx(11, 10, 1, '10 Vitalité')));
});

const db = latestDb();
test('real data: a Fashionista Cra build resolves every item', { skip: db ? false : 'run `npm run import` first' }, () => {
  // items of "Ocra full inte 200" (fashionista-build, 2026-11-19)
  const ids = [23272, 18663, 19586, 13583, 19589, 14062, 13584, 7754, 694, 8666, 739, 13659, 6981, 7711];
  const { items, sets, keywords } = loadItems(db!, ids);
  const s = computeBuild({ level: 200, items: ids, characteristics: { intelligence: 398, agility: 3 }, exos: { ap: true, mp: true } }, items, sets, keywords);
  assert.deepEqual(s.missing, []);
  assert.ok(s.totals.actionPoints >= 9);
  assert.ok(s.elements.includes('Feu'));
});
