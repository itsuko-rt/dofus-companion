import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import { brackets, cellsOutline, currentBracket, mapSteps, orderStops } from '../src/world-shared.ts';
import { sanitizeCharacter } from '../src/character.ts';
import { latestDb } from '../src/load.ts';
import { loadJob, loadJobs, loadWorld } from '../src/world.ts';

test('map steps: one map per step, four directions', () => {
  assert.equal(mapSteps({ x: 0, y: 0 }, { x: 3, y: -4 }), 7);
  assert.equal(mapSteps({ x: -2, y: 5 }, { x: -2, y: 5 }), 0);
});

test('route order: nearest neighbour then 2-opt, never longer than the input order', () => {
  const pts = [{ x: 0, y: 0, id: 'a' }, { x: 10, y: 0, id: 'b' }, { x: 1, y: 0, id: 'c' }, { x: 9, y: 0, id: 'd' }, { x: 2, y: 0, id: 'e' }];
  const r = orderStops(pts);
  assert.deepEqual(r.order.map((p) => p.id), ['a', 'c', 'e', 'd', 'b']);
  assert.equal(r.total, 10);
  const naive = pts.slice(1).reduce((s, p, i) => s + mapSteps(pts[i], p), 0);
  assert.ok(r.total <= naive);
  assert.equal(r.legs.length, pts.length - 1);
  assert.deepEqual(orderStops([]), { order: [], legs: [], total: 0 });
});

test('route order: a zaap is used only when it shortens the leg', () => {
  const far = [{ x: 0, y: 0 }, { x: 50, y: 50 }];
  const r = orderStops(far, null, [{ x: 49, y: 50 }]);
  assert.equal(r.total, 1);
  assert.deepEqual(r.legs[0].zaap, { x: 49, y: 50 });
  const near = orderStops([{ x: 0, y: 0 }, { x: 1, y: 0 }], null, [{ x: 40, y: 40 }]);
  assert.equal(near.legs[0].zaap, null);
});

test('profession brackets: each tier lasts until the next unlock, up to 200', () => {
  const tiers = [{ levelMin: 1, n: 'Frêne' }, { levelMin: 20, n: 'Châtaignier' }, { levelMin: 40, n: 'Noyer' }, { levelMin: 90, n: 'Pin' }, { levelMin: 90, n: 'Oliviolet' }];
  const b = brackets(tiers);
  assert.deepEqual(b.map((x) => [x.from, x.to, x.items.length]), [[1, 19, 1], [20, 39, 1], [40, 89, 1], [90, 200, 2]]);
  const at45 = currentBracket(tiers, 45);
  assert.equal(at45.current!.items[0].n, 'Noyer');
  assert.equal(at45.next!.from, 90);
  assert.equal(currentBracket(tiers, 200).next, null);
});

test('zone outline: only edges between the zone and the outside', () => {
  // a 2×1 block: 6 outer unit edges, the shared middle edge is skipped
  assert.equal(cellsOutline([[0, 0], [1, 0]]).match(/M/g)!.length, 6);
});

test('characters keep profession levels and saved routes, cleaned', () => {
  const c = sanitizeCharacter({
    id: 'cabc', jobs: { 2: 45, 24: 999, x: 3, 26: 1.5 },
    routes: [{ id: 'r1', name: 'Frêne', stops: [6, 95, -1, 'x'], jobId: 2, resourceId: 303 }, { id: 'bad id', stops: [1] }, { id: 'r2', stops: [] }],
  }, 'cabc')!;
  assert.deepEqual(c.jobs, { 2: 45 });
  assert.equal(c.routes.length, 1);
  assert.deepEqual(c.routes[0].stops, [6, 95]);
  assert.equal(c.routes[0].resourceId, 303);
  assert.deepEqual(sanitizeCharacter({}, 'c0')!.jobs, {});
});

const db = latestDb();
test('world data from the game files: zones, cells, markers, gathered resources only', { skip: !db && 'no game database' }, () => {
  const w = loadWorld(db!, 1);
  if (!w) return; // database imported before the world tables: skip
  assert.equal(w.map.name, 'Monde des Douze');
  assert.ok(w.cells.length > 5000);
  const zones = new Set(w.zones.map((z) => z.id));
  assert.ok(w.cells.every(([, , z]) => zones.has(z)), 'every cell belongs to a known zone');
  const res = new Set(w.resources.map((r) => r.id));
  assert.ok(w.zones.every((z) => z.resources.every((r) => res.has(r))), 'only harvested items are listed as resources');
  assert.ok(!w.resources.some((r) => /Boîte de Rékloot/.test(r.name)));
  // a zone's zaap is a real waypoint (of any world: the Hakam tree uses the Canopy village's)
  const all = new DatabaseSync(db!, { readOnly: true });
  const waypoints = new Set((all.prepare('SELECT x, y FROM world_zaap').all() as { x: number; y: number }[]).map((p) => `${p.x},${p.y}`));
  all.close();
  assert.ok(w.zones.every((z) => !z.zaap || waypoints.has(`${z.zaap[0]},${z.zaap[1]}`)), 'a zone zaap is a real waypoint');
  assert.ok(w.markers.some((m) => m.category === 'Donjons'));
});

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
