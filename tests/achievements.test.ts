import { test } from 'node:test';
import assert from 'node:assert/strict';
import { achievementProgress, objectiveState } from '../src/achievements.ts';
import type { Progress } from '../src/criteria.ts';

const prog = (done: string[], level = 50): Progress => ({ level, done: new Set(done), active: new Set() });

test('objective: ticked, inferred from official condition, to do, or unverifiable', () => {
  assert.equal(objectiveState(1, 'Qf=10', prog(['quest:10'])), 'inferred');
  assert.equal(objectiveState(1, 'Qf=10', prog([])), 'todo');
  assert.equal(objectiveState(1, 'PL>99', prog([], 120)), 'inferred');
  assert.equal(objectiveState(1, '(EM>147,0,d)', prog([])), 'unknown'); // monster kill: not knowable here
  assert.equal(objectiveState(1, '(EM>147,0,d)', prog(['obj:1'])), 'confirmed');
  assert.equal(objectiveState(2, '', prog([])), 'unknown');
});

test('achievement: never obtained without confirmation, even with every objective met', () => {
  const objs: [number, string][] = [[1, 'Qf=10'], [2, 'Qf=11'], [3, '(EM>147,0,d)']];
  assert.deepEqual(achievementProgress(7, objs, prog([])).state, 'not_started');
  const half = achievementProgress(7, objs, prog(['quest:10']));
  assert.deepEqual([half.state, half.met, half.total], ['in_progress', 1, 3]);
  assert.equal(achievementProgress(7, objs, prog(['quest:10', 'quest:11', 'obj:3'])).state, 'ready');
  assert.equal(achievementProgress(7, objs, prog(['ach:7'])).state, 'obtained');
});

test('an objective made only of server-side conditions is never counted as met', () => {
  const empty = { level: 1, done: new Set<string>(), active: new Set<string>() };
  assert.equal(objectiveState(7662, 'Sc=4012', empty), 'unknown');
  // a server condition next to a real one does not change that one's result
  assert.equal(objectiveState(1, 'Sc=4012&PL>9', empty), 'todo');
  assert.equal(achievementProgress(2676, [[7663, 'OA=2316'], [7662, 'Sc=4012'], [7447, 'PL>9']], empty).state, 'not_started');
});
