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
