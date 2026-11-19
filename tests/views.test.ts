import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Graph, type NodeInput } from '../src/graph.ts';
import { focusView } from '../src/views.ts';

const q = (id: number, criterion: string, category = 1): NodeInput =>
  ({ id: `quest:${id}`, kind: 'quest', refId: id, label: `Q${id}`, criterion, category });

const g = new Graph([
  q(1, '', 2), q(2, 'Qf=1'), q(3, 'Qf=2&(Qf=7|Qf=8)'), q(4, 'Qf=3'), q(7, '', 2), q(8, '', 2), q(9, 'Qf=4', 3),
]);

test('focus view: all ancestors and direct unlocks only', () => {
  const v = focusView(g, 'quest:3');
  const quests = [...v.nodes].filter((n) => n.startsWith('quest:')).sort();
  assert.deepEqual(quests, ['quest:1', 'quest:2', 'quest:3', 'quest:4', 'quest:7', 'quest:8']);
  assert.ok(!v.nodes.has('quest:9'));
});

import { connected, prerequisitesToComplete, validateGraph } from '../src/views.ts';
import { packLayout } from '../src/layout.ts';

test('complete with prerequisites: whole chain upstream, one alternative per choice', () => {
  assert.deepEqual(prerequisitesToComplete(g, 'quest:4', new Set()).sort(), ['quest:1', 'quest:2', 'quest:3', 'quest:7']);
  // an alternative already done is kept, the other is not added
  assert.deepEqual(prerequisitesToComplete(g, 'quest:4', new Set(['quest:8'])).sort(), ['quest:1', 'quest:2', 'quest:3']);
  assert.deepEqual(prerequisitesToComplete(g, 'quest:1', new Set()), []);
});

test('selection highlight: ancestors and descendants along view edges', () => {
  const edges = [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'x', to: 'c' }, { from: 'c', to: 'd' }];
  const r = connected(edges, 'b');
  assert.deepEqual([...r.up], ['a']);
  assert.deepEqual([...r.down].sort(), ['c', 'd']);
});

test('graph validation: missing references and cycles', () => {
  const bad = new Graph([q(1, 'Qf=2'), q(2, 'Qf=1'), q(3, 'Qf=99')]);
  const v = validateGraph(bad);
  assert.deepEqual(v.missing, ['quest:99']);
  assert.equal(v.cycles.length, 1);
  assert.deepEqual(validateGraph(g), { missing: [], cycles: [] });
});

test('packed layout: chains framed apart, no overlap, standalone quests grouped, collapse', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 's1', 's2'];
  const edges = [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'd', to: 'e' }];
  const lvl: Record<string, number> = { a: 5, b: 6, c: 7, d: 1, e: 2, s1: 3, s2: 4 };
  const l = packLayout(ids, edges, () => ({ w: 200, h: 50 }), (id) => lvl[id]);
  assert.deepEqual(l.chains.map((c) => c.id), ['d', 'a', 'singles']); // by level, standalone last
  const boxes = l.chains.map((c) => [c.x, c.y, c.x + c.w, c.y + c.h]);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const [a, b] = [boxes[i], boxes[j]];
    assert.ok(a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1], 'chains overlap');
  }
  for (const c of l.chains) for (const n of c.nodes) {
    const p = l.pos.get(n)!;
    assert.ok(p.x >= c.x && p.x + 200 <= c.x + c.w && p.y >= c.y && p.y + 50 <= c.y + c.h, `${n} outside its frame`);
  }
  assert.ok(l.pos.get('a')!.y < l.pos.get('b')!.y && l.pos.get('b')!.y < l.pos.get('c')!.y); // top to bottom
  const folded = packLayout(ids, edges, () => ({ w: 200, h: 50 }), (id) => lvl[id], new Set(['a']));
  assert.ok(!folded.pos.has('a') && folded.chains.find((c) => c.id === 'a')!.collapsed);
});

test('packed layout: a quest unlocking many dead-end quests does not make one endless row', () => {
  const kids = Array.from({ length: 40 }, (_, i) => `k${i}`);
  const l = packLayout(['root', ...kids], kids.map((k) => ({ from: 'root', to: k })), () => ({ w: 200, h: 50 }), () => 1);
  const c = l.chains[0];
  assert.ok(c.w < 1000, `chain width ${c.w}`);
  const ys = kids.map((k) => l.pos.get(k)!.y);
  assert.ok(Math.min(...ys) > l.pos.get('root')!.y); // still below their parent
  const seen = new Set(kids.map((k) => `${l.pos.get(k)!.x},${l.pos.get(k)!.y}`));
  assert.equal(seen.size, kids.length); // no two quests on the same spot
});
