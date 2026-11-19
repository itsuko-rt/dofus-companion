// Runs against the imported game DB (npm run import). Skipped if it is missing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { latestDb, loadGraph } from '../src/load.ts';
import type { Progress } from '../src/criteria.ts';

const db = latestDb();
const skip = db ? false : 'run `npm run import` first';
const prog = (level: number, done: string[] = []): Progress => ({ level, done: new Set(done), active: new Set() });

test('real data: finishing quest 209 makes quest 211 available', { skip }, () => {
  const g = loadGraph(db!);
  assert.equal(g.nodes.get('quest:211')?.criterion, 'Qf=209');
  assert.equal(g.status('quest:211', prog(30)), 'locked');
  assert.ok(g.unlockedBy('quest:209', prog(30)).includes('quest:211'));
  assert.equal(g.status('quest:211', prog(30, ['quest:209'])), 'available');
});

test('real data: every Qf reference points to an existing quest', { skip }, () => {
  const g = loadGraph(db!);
  const dangling = g.edges.filter((e) => !g.nodes.has(e.from));
  assert.deepEqual(dangling, []);
  assert.ok(g.nodes.size > 4000);
});
