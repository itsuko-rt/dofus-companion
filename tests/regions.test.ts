import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Graph, type NodeInput } from '../src/graph.ts';
import { regionSummaries, regionLayout, nextSteps, isRecommended } from '../src/regions.ts';
import type { Progress } from '../src/criteria.ts';

const q = (id: number, criterion: string, category: number, level: number): NodeInput =>
  ({ id: `quest:${id}`, kind: 'quest', refId: id, label: `Q${id}`, criterion, category, level });
const prog = (level: number, done: string[] = []): Progress => ({ level, done: new Set(done), active: new Set() });

// region 1: chain 1 → 2 → (3|4) → 5, single 6; region 2: 7 needs 2 (external); Almanax 31: 8
const g = new Graph([
  q(1, '', 1, 2), q(2, 'Qf=1', 1, 4), q(3, '', 1, 5), q(4, '', 1, 5), q(5, 'Qf=2&(Qf=3|Qf=4)', 1, 8), q(6, '', 1, 6),
  q(7, 'Qf=2', 2, 30), q(8, '', 31, 1),
]);
const cats = [{ id: 1, name: 'Incarnam' }, { id: 2, name: 'Astrub' }, { id: 31, name: 'Almanax' }];

test('regions sorted by median level, side content last, with progress', () => {
  const p = prog(5, ['quest:1']);
  const r = regionSummaries(g, cats, (id) => g.status(id, p));
  assert.deepEqual(r.map((x) => x.name), ['Incarnam', 'Astrub', 'Almanax']);
  assert.deepEqual([r[0].total, r[0].done, r[0].levelMin, r[0].levelMax], [6, 1, 2, 8]);
  assert.ok(isRecommended(r[0], 5));
  assert.ok(!isRecommended(r[2], 5)); // Almanax is never "recommended"
});

test('region layout: linked chain with gate, singles apart, external prerequisites', () => {
  const l = regionLayout(g, 1);
  for (const id of ['quest:1', 'quest:2', 'quest:3', 'quest:4', 'quest:5']) assert.ok(l.linked.has(id), id);
  assert.deepEqual(l.singles.map((n) => n.id), ['quest:6']);
  assert.ok([...l.linked].some((id) => id.startsWith('gate:')));
  const astrub = regionLayout(g, 2);
  assert.deepEqual(astrub.singles.map((n) => n.id), ['quest:7']);
  assert.deepEqual(astrub.external.get('quest:7')?.map((n) => n.id), ['quest:2']);
});

test('next steps: available now, and "do X to unlock Y"', () => {
  const p = prog(5, ['quest:1']);
  const s = nextSteps(g, (id) => g.status(id, p), p);
  assert.ok(s.now.some((x) => x.node.id === 'quest:2'));
  assert.ok(!s.now.some((x) => x.node.id === 'quest:8')); // Almanax excluded
  assert.deepEqual(s.soon, []); // quest 7 is level 30 (> level + 10): not suggested yet; at level 25 it is
  const p25 = prog(25, ['quest:1']);
  const s25 = nextSteps(g, (id) => g.status(id, p25), p25);
  assert.deepEqual(s25.soon.map((x) => [x.node.id, x.missing?.via.id]), [['quest:7', 'quest:2']]);
});
