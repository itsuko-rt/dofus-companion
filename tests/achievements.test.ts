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
