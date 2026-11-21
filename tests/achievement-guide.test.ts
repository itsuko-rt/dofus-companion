import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayState, familyOf, isLevelOnly, recommend, type AchNode, type AchProgress } from '../src/achievement-guide.ts';

const node = (id: number, level: number, category: number, points = 10): AchNode => ({ id, label: `A${id}`, level, points, category });
const prog = (state: AchProgress['state'], met = 0, total = 0, objectives: string[] = []): AchProgress => ({ state, met, total, objectives });
const ROOTS: Record<number, string> = { 1: 'Quêtes', 2: 'Donjons', 3: 'Temporis', 4: 'Exploration' };

test('families: main progression first, Temporis and events apart, unknown categories still listed', () => {
  assert.equal(familyOf('Quêtes'), 'main');
  assert.equal(familyOf('Temporis'), 'seasonal');
  assert.equal(familyOf('Compagnons'), 'activities');
  assert.equal(familyOf('Une catégorie future'), 'other');
});

test('display state: "later" only for an untouched achievement well above a real character', () => {
  assert.equal(displayState('not_started', 80, 50, true), 'later');
  assert.equal(displayState('not_started', 60, 50, true), 'todo');
  assert.equal(displayState('not_started', 80, 1, false), 'todo'); // no character: nothing is "later"
  assert.equal(displayState('in_progress', 200, 1, true), 'in_progress'); // progress always wins
});

test('recommendations: ready, then nearly done, then class, then level; each with its reason; no duplicates', () => {
  const nodes = [node(1, 50, 1), node(2, 52, 1), node(3, 55, 2), node(4, 40, 1), node(5, 150, 1), node(6, 50, 3), node(7, 48, 4), node(8, 51, 2)];
  const progress = new Map<number, AchProgress>([
    [1, prog('ready', 2, 2)],
    [2, prog('in_progress', 1, 3, ['inferred', 'todo', 'todo'])],
    [3, prog('not_started', 0, 1)],
    [4, prog('obtained', 1, 1)],
    [5, prog('in_progress', 1, 2)], // too far above: not "almost"
    [6, prog('not_started')],       // Temporis: never a level recommendation
    [7, prog('not_started')],
    [8, prog('not_started')],
  ]);
  const r = recommend({ nodes, progress, level: 50, classReasons: new Map([[3, 'demande vos quêtes de classe'], [4, 'porte le nom de votre classe']]), rootName: (c) => ROOTS[c] });
  assert.deepEqual(r.ready.map((x) => x.id), [1]);
  assert.deepEqual(r.almost.map((x) => x.id), [2]);
  assert.match(r.almost[0].reason, /1 objectif sur 3 rempli \(1 déduit de vos quêtes et succès\)/);
  assert.deepEqual(r.forClass.map((x) => x.id), [3]); // 4 is already obtained
  assert.deepEqual(r.forLevel.map((x) => x.id), [8, 7]); // closest level first; 3 is already in forClass, 6 is Temporis
  assert.match(r.forLevel[0].reason, /Niveau 51, proche du vôtre \(50\) · Donjons/);
  const all = [...r.ready, ...r.almost, ...r.forClass, ...r.forLevel].map((x) => x.id);
  assert.equal(new Set(all).size, all.length);
});

test('"almost": a level condition alone is not progress; Temporis left out; at most 2 per category', () => {
  const nodes = [node(1, 10, 2), node(2, 10, 2), node(3, 10, 2), node(4, 10, 2), node(5, 10, 3)];
  const progress = new Map<number, AchProgress>([
    [1, { ...prog('in_progress', 1, 2, ['inferred', 'todo']), levelOnly: 1 }], // only "PL>9" is met
    [2, prog('in_progress', 1, 2, ['inferred', 'todo'])],
    [3, prog('in_progress', 1, 2, ['confirmed', 'todo'])],
    [4, prog('in_progress', 1, 3, ['inferred', 'todo', 'todo'])], // third of the same category: cut
    [5, prog('in_progress', 1, 2, ['confirmed', 'todo'])],        // Temporis
  ]);
  const r = recommend({ nodes, progress, level: 50, classReasons: new Map(), rootName: (c) => ROOTS[c] });
  assert.deepEqual(r.almost.map((x) => x.id), [2, 3]);
  assert.match(r.almost[1].reason, /1 coché/);
  assert.ok(isLevelOnly('PL>49') && !isLevelOnly('PL>49&Qf=12') && !isLevelOnly('Qf=12'));
});

test('level recommendations: at most 3 per root category', () => {
  const nodes = Array.from({ length: 10 }, (_, i) => node(i + 1, 20, 1));
  const progress = new Map(nodes.map((n) => [n.id, prog('not_started')]));
  const r = recommend({ nodes, progress, level: 20, classReasons: new Map(), rootName: (c) => ROOTS[c] });
  assert.equal(r.forLevel.length, 3);
});
