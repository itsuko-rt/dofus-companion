import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import { brackets, currentBracket } from '../src/professions-shared.ts';
import { sanitizeCharacter } from '../src/character.ts';
import { latestDb } from '../src/load.ts';
import { loadJob, loadJobs } from '../src/professions.ts';

test('profession brackets: each tier lasts until the next unlock, up to 200', () => {
  const tiers = [{ levelMin: 1, n: 'Frêne' }, { levelMin: 20, n: 'Châtaignier' }, { levelMin: 40, n: 'Noyer' }, { levelMin: 90, n: 'Pin' }, { levelMin: 90, n: 'Oliviolet' }];
  const b = brackets(tiers);
  assert.deepEqual(b.map((x) => [x.from, x.to, x.items.length]), [[1, 19, 1], [20, 39, 1], [40, 89, 1], [90, 200, 2]]);
  const at45 = currentBracket(tiers, 45);
  assert.equal(at45.current!.items[0].n, 'Noyer');
  assert.equal(at45.next!.from, 90);
  assert.equal(currentBracket(tiers, 200).next, null);
});

test('characters keep valid profession levels; routes of the removed map are dropped', () => {
  const c = sanitizeCharacter({
    id: 'cabc', jobs: { 2: 45, 24: 999, x: 3, 26: 1.5 },
    routes: [{ id: 'r1', name: 'Frêne', stops: [6, 95] }],
  }, 'cabc')!;
  assert.deepEqual(c.jobs, { 2: 45 });
  assert.ok(!('routes' in c));
  assert.deepEqual(sanitizeCharacter({}, 'c0')!.jobs, {});
});

const db = latestDb();
test('professions: lumberjack tiers match the game unlocks, recipes cite ingredient origin', { skip: !db && 'no game database' }, () => {
  const jobs = loadJobs(db!);
  if (!jobs) return;
  assert.ok(jobs.some((j) => j.slug === 'bucheron' && j.kind === 'gathering'));
  const lj = loadJob(db!, 'bucheron')!;
  assert.deepEqual(lj.tiers.slice(0, 3).map((t) => [t.name, t.levelMin]), [['Bois de Frêne', 1], ['Bois de Châtaignier', 20], ['Bois de Noyer', 40]]);
  assert.ok(lj.tiers.every((t) => t.levelMin >= 1 && t.levelMin <= 200));
  const tailor = loadJob(db!, 'tailleur')!;
  assert.ok(tailor.recipes.length > 100);
  const kinds = new Set(tailor.recipes.flatMap((r) => r.ingredients.map((g) => g.source.kind)));
  assert.ok(kinds.has('gathered') && kinds.has('crafted'));
  assert.equal(loadJob(db!, 'pas-un-metier'), null);
});

test('profession zones come from the game data; zone zaaps are real waypoints; map tables are gone', { skip: !db && 'no game database' }, () => {
  const lj = loadJob(db!, 'bucheron');
  if (!lj) return;
  const ash = lj.tiers.find((t) => t.name === 'Bois de Frêne')!;
  assert.ok(ash.zones.length > 5, 'ash grows in several zones');
  assert.ok(ash.zones.some((z) => z.area === 'Amakna'));
  const conn = new DatabaseSync(db!, { readOnly: true });
  const tables = new Set((conn.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((r) => r.name));
  conn.close();
  for (const t of ['world_cell', 'world_hint', 'world_zaap', 'world_map', 'world_npc', 'world_dungeon', 'world_map_alt']) assert.ok(!tables.has(t), `${t} removed`);
  assert.ok(lj.tiers.flatMap((t) => t.zones).some((z) => z.zaap && Number.isInteger(z.zaap[0])), 'zones with a waypoint carry its coordinates');
});
