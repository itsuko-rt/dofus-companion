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

test('real data: graph validation (missing references, prerequisite cycles)', { skip }, async () => {
  const { validateGraph } = await import('../src/views.ts');
  const v = validateGraph(loadGraph(db!));
  console.log(`  missing references: ${v.missing.length} ${v.missing.slice(0, 10).join(', ')} · cycles: ${v.cycles.length}`);
  for (const c of v.cycles.slice(0, 5)) console.log(`  cycle: ${c.join(' → ')}`);
  assert.equal(v.cycles.length, 0, 'a prerequisite cycle would make quests impossible to unlock');
});

test('real data: quest chains stay compact (no endless row)', { skip }, async () => {
  const { regionLayout } = await import('../src/regions.ts');
  const { packLayout } = await import('../src/layout.ts');
  const { loadGraphData } = await import('../src/load.ts');
  const g = loadGraph(db!);
  for (const c of loadGraphData(db!).categories) {
    const r = regionLayout(g, c.id);
    const l = packLayout([...r.linked, ...r.singles.map((n) => n.id)], r.edges, (id) => (id.startsWith('gate:') ? { w: 30, h: 30 } : { w: 204, h: 54 }), (id) => g.nodes.get(id)?.level ?? 0);
    // 5 500 px ≈ 25 quests side by side; Frigost (the largest) is about 5 000 since bundling
    assert.ok(l.width < 5500, `${c.name}: ${Math.round(l.width)} px wide`);
  }
});
