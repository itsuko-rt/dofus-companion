// Encyclopaedia, atelier, drop odds and companion guides: pure logic with fixtures, then checks on the real game DB.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dropOdds, encyHref } from '../src/encyclopedia-shared.ts';
import { expand, formatLines, parseLines, type RecipeRow } from '../src/atelier-shared.ts';
import { nextStep, startStep } from '../src/companion-shared.ts';
import { latestDb } from '../src/load.ts';

const db = latestDb();
const skip = db ? false : 'run `npm run import` first';

test('drop odds: exact probability, checked by hand', () => {
  // 1 % per fight: P(≥1 in 100) = 1 − 0.99^100 = 0.633967…; 50 % after ln(0.5)/ln(0.99) = 68.97 → 69 fights
  const o = dropOdds(1, 100);
  assert.ok(Math.abs(o.atLeastOne - 0.6339676587) < 1e-9);
  assert.equal(o.expected, 1);
  assert.equal(o.for50, 69);
  assert.equal(o.for90, 230); // ln(0.1)/ln(0.99) = 229.1
  assert.deepEqual([dropOdds(0, 50).atLeastOne, dropOdds(0, 50).for90], [0, null]); // rate 0: never
  assert.deepEqual([dropOdds(100, 1).atLeastOne, dropOdds(100, 1).for99], [1, 1]);
  assert.equal(dropOdds(150, 3).atLeastOne, 1); // clamped
  assert.equal(dropOdds(50, 0).atLeastOne, 0);
});

test('atelier: totals with and without sub-crafts, done lines, uncraftable items, cycles', () => {
  const r = (id: number, ingredients: [number, number][]): RecipeRow => ({ id, name: `#${id}`, job: 'Forgeron', level: 1, ingredients });
  // sword (1) = 2 planks (2) + 3 ore (10); plank (2) = 4 wood (11)
  const recipes = new Map([[1, r(1, [[2, 2], [10, 3]])], [2, r(2, [[11, 4]])]]);
  assert.deepEqual(expand([{ id: 1, qty: 2 }], recipes, false), { resources: [{ id: 10, qty: 6 }, { id: 2, qty: 4 }], intermediates: [], uncraftable: [] });
  assert.deepEqual(expand([{ id: 1, qty: 2 }], recipes, true), { resources: [{ id: 11, qty: 16 }, { id: 10, qty: 6 }], intermediates: [{ id: 2, qty: 4 }], uncraftable: [] });
  assert.deepEqual(expand([{ id: 1, qty: 2, done: true }, { id: 99, qty: 5 }], recipes, true), { resources: [{ id: 99, qty: 5 }], intermediates: [], uncraftable: [99] });
  // a malformed cycle (a needs b, b needs a) stops instead of looping forever
  const cyclic = new Map([[20, r(20, [[21, 1]])], [21, r(21, [[20, 1]])]]);
  assert.deepEqual(expand([{ id: 20, qty: 1 }], cyclic, true), { resources: [{ id: 20, qty: 1 }], intermediates: [{ id: 21, qty: 1 }], uncraftable: [] });
});

test('atelier: lines from a URL are validated and merged', () => {
  assert.deepEqual(parseLines('8463:2,44:10,8463:1,x:3,5:0,6:-2,7:999999999'), [{ id: 8463, qty: 3 }, { id: 44, qty: 10 }]);
  assert.equal(formatLines([{ id: 1, qty: 2 }, { id: 3, qty: 1, done: true }]), '1:2');
  assert.deepEqual(parseLines(''), []);
});

test('companion: where a guide opens and where "finished" goes next', () => {
  const steps = [{ id: 'quest:1' }, { id: 'quest:2' }, { id: 'quest:3' }];
  const done = (ids: string[]) => (id: string) => ids.includes(id);
  assert.equal(startStep(steps, null, done(['quest:1'])), 1);   // first not done
  assert.equal(startStep(steps, 2, done([])), 2);               // saved position wins
  assert.equal(startStep(steps, 7, done([])), 0);               // invalid saved position ignored
  assert.equal(startStep(steps, null, done(['quest:1', 'quest:2', 'quest:3'])), 2); // all done: last
  assert.equal(startStep([], null, done([])), 0);
  assert.equal(nextStep(steps, 0, done(['quest:2'])), 2);       // skips what is already done
  assert.equal(nextStep(steps, 2, done([])), 2);                // stays on the last
});

test('encyclopaedia: sheet URLs', () => {
  assert.equal(encyHref('monster', 101, 'Bouftou'), '/encyclopedie/monstre/101-bouftou');
  assert.equal(encyHref('item', 8463, 'Abracaska Ancestral'), '/encyclopedie/objet/8463-abracaska-ancestral');
});

test('real data: search, monster, item, dungeon, zone and set sheets agree with each other', { skip }, async () => {
  const E = await import('../src/encyclopedia.ts');
  // the regular Bouftou comes before the summons and Dopeul variants of the same name
  const bouftou = E.searchEncyclopedia(db!, 'bouftou', ['monster']).filter((h) => h.name === 'Bouftou');
  assert.equal(bouftou[0].id, 101);
  assert.ok(E.searchEncyclopedia(db!, 'BOUFTOU royal').some((h) => h.kind === 'dungeon' && h.name === 'Cour du Bouftou Royal'));
  assert.deepEqual(E.searchEncyclopedia(db!, 'b'), []);

  const m = E.loadMonster(db!, 101)!;
  assert.equal(m.name, 'Bouftou');
  assert.ok(m.zones.some((z) => z.name === 'Coin des Bouftous'));
  assert.ok(m.drops.length > 0 && m.drops.every((d) => d.rates.every((x) => x >= 0 && x <= 100)));
  // every drop on the monster sheet lists the monster back on the item sheet
  for (const d of m.drops.slice(0, 5)) assert.ok(E.loadItem(db!, d.item.id)!.droppedBy.some((x) => x.monster.id === 101), d.item.name);

  // recipe ↔ "sert à fabriquer" both ways
  const hat = E.loadItem(db!, 8463)!;
  assert.equal(hat.set?.name, 'Panoplie Ancestrale');
  for (const g of hat.recipe!.ingredients) assert.ok(E.loadItem(db!, g.id)!.usedIn.some((u) => u.id === 8463), g.name);

  const court = E.loadDungeon(db!, 1)!;
  assert.deepEqual(court.bosses.map((b) => b.name), ['Bouftou Royal']);
  assert.deepEqual(court.keys.map((k) => k.name), ['Clef de la Cour du Bouftou Royal']);
  assert.ok(E.loadItem(db!, court.keys[0].id)!.opens.some((d) => d.id === 1)); // the key's sheet says what it opens
  assert.ok(court.achievements.length > 0 && court.achievements.every((a) => a.href.startsWith('/progression/succes?c=') && a.href.includes(`&a=${a.id}`)));

  const zone = E.loadZone(db!, m.zones.find((z) => z.name === 'Coin des Bouftous')!.id)!;
  assert.ok(zone.monsters.some((x) => x.id === 101));

  const set = E.loadSet(db!, 1)!;
  assert.equal(set.name, 'Panoplie du Bouftou');
  assert.equal(set.items.length, 8);
  assert.ok(set.bonuses.every((b) => b.count >= 2 && b.count <= set.items.length)); // a bonus needs at least 2 items worn
  assert.equal(E.loadMonster(db!, 999999999), null);
});

test('real data: atelier totals follow the game recipes', { skip }, async () => {
  const { computeAtelier } = await import('../src/atelier.ts');
  const E = await import('../src/encyclopedia.ts');
  const hat = E.loadItem(db!, 8463)!;
  const flat = computeAtelier(db!, [{ id: 8463, qty: 2 }], false);
  assert.deepEqual(flat.resources.map((r) => [r.id, r.qty]).sort(), hat.recipe!.ingredients.map((g) => [g.id, g.qty * 2]).sort());
  assert.equal(flat.items[0].craftable, true);
  const deep = computeAtelier(db!, [{ id: 8463, qty: 2 }], true);
  assert.ok(deep.resources.every((r) => r.source.kind !== 'crafted' || !deep.intermediates.some((i) => i.id === r.id)));
});

test('real data: companion guides come from the Dofus quest chains', { skip }, async () => {
  const { listGuides, loadGuide } = await import('../src/companion.ts');
  const list = listGuides();
  assert.ok(list.length > 10);
  const g = loadGuide('argente')!;
  assert.equal(g.name, 'Dofus Argenté');
  const steps = g.routes[0].steps;
  assert.ok(steps.length > 50);
  assert.ok(steps.every((s) => /^(quest|ach):\d+$/.test(s.id) && s.href.startsWith('/progression/')));
  assert.ok(steps.some((s) => s.parts.some((p) => p.objectives.length > 0)));
  assert.equal(loadGuide('pas-un-dofus'), null);
});
