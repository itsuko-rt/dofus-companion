import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Graph, compileEdges, type NodeInput } from '../src/graph.ts';
import { parse, type Progress } from '../src/criteria.ts';

const q = (id: number, criterion: string): NodeInput =>
  ({ id: `quest:${id}`, kind: 'quest', refId: id, label: `Q${id}`, criterion });
const prog = (level: number, done: string[] = []): Progress => ({ level, done: new Set(done), active: new Set() });

test('AND edges, OR gate and exclusion', () => {
  const { edges, gates } = compileEdges('quest:9', parse('Qf=1&(Qf=2|Qf=3)&Qf!4&PL>10'));
  assert.equal(gates.length, 1);
  const g = gates[0].id;
  assert.deepEqual(edges, [
    { from: 'quest:1', to: 'quest:9', kind: 'requires' },
    { from: g, to: 'quest:9', kind: 'requires' },
    { from: 'quest:2', to: g, kind: 'any_of' },
    { from: 'quest:3', to: g, kind: 'any_of' },
    { from: 'quest:4', to: 'quest:9', kind: 'excludes' },
  ]);
});

test('status and unlocks follow the criterion', () => {
  const g = new Graph([q(1, ''), q(2, 'Qf=1'), q(3, 'Qf=1|Qf=9'), q(4, 'Qf=2&PL>50'), q(5, 'Qf!1')]);
  const p = prog(30);
  assert.equal(g.status('quest:1', p), 'available');
  assert.equal(g.status('quest:2', p), 'locked');
  assert.equal(g.status('quest:5', p), 'available');
  assert.deepEqual(g.unlockedBy('quest:1', p).sort(), ['quest:2', 'quest:3']);
  const p2 = prog(30, ['quest:1', 'quest:2']);
  assert.equal(g.status('quest:4', p2), 'locked'); // level too low
  assert.equal(g.status('quest:4', prog(51, ['quest:1', 'quest:2'])), 'available');
  assert.equal(g.status('quest:5', p2), 'locked'); // excluded by finishing quest 1
  assert.equal(g.status('quest:1', p2), 'done');
});

test('achievement prerequisites and point thresholds', () => {
  const ach = (id: number, criterion: string, points: number): NodeInput =>
    ({ id: `ach:${id}`, kind: 'achievement', refId: id, label: `A${id}`, criterion, points });
  const g = new Graph([ach(1, '', 10), ach(2, '', 15), ach(3, 'OA=1', 5), ach(4, 'Oa>20', 5), q(5, 'OA=2|Qf=9')]);
  assert.ok(g.edges.some((e) => e.from === 'ach:1' && e.to === 'ach:3' && e.kind === 'requires'));
  assert.ok(g.edges.some((e) => e.from === 'ach:2' && e.kind === 'any_of'));
  const p = prog(1, ['ach:1']);
  assert.equal(g.status('ach:3', p), 'available');
  assert.equal(g.status('ach:4', p), 'locked'); // 10 points
  assert.deepEqual(g.unlockedBy('ach:2', p).sort(), ['ach:4', 'quest:5']); // 25 points, OR branch
});

test('bad criterion is kept as unknown, not dropped', () => {
  const g = new Graph([q(1, 'Qf=1&Qf=2|Qf=3')]);
  assert.equal(g.errors.length, 1);
  assert.equal(g.status('quest:1', prog(200)), 'unknown');
});
