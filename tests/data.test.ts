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

test('real data: batched achievement loading keeps every objective, in order', { skip }, async () => {
  const { loadAchievements } = await import('../src/load.ts');
  const { DatabaseSync } = await import('node:sqlite');
  const raw = new DatabaseSync(db!, { readOnly: true });
  const one = raw.prepare('SELECT id, name, criterion_raw AS criterion FROM achievement_objective WHERE achievement_id = ? ORDER BY ordinal');
  const list = loadAchievements(db!, [3, 11, 12, 13, 14, 59, 116, 15]);
  assert.ok(list.length > 700);
  for (const a of list) assert.deepEqual(a.objectives, one.all(a.id).map((r) => ({ ...r })), `achievement ${a.id}`);
  raw.close();
});

test('real data: classes, monsters and character XP come from the game files', { skip }, async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const raw = new DatabaseSync(db!, { readOnly: true });
  const one = (sql: string) => raw.prepare(sql).get() as Record<string, any>;
  // every class has its official title, description, complexity and roles
  assert.equal(one('SELECT COUNT(*) n FROM breed b LEFT JOIN breed_info i ON i.breed_id = b.id WHERE i.title IS NULL OR i.description IS NULL OR i.complexity IS NULL').n, 0);
  assert.equal(one("SELECT title FROM breed_info WHERE breed_id = 8").title, 'Guerrier téméraire');
  // character XP: level 2 = 110, level 200 = 5,555,424,000 (the game's table), strictly increasing
  assert.equal(one('SELECT xp FROM xp_level WHERE level = 2').xp, 110);
  assert.equal(one('SELECT xp FROM xp_level WHERE level = 200').xp, 5555424000);
  assert.equal(one('SELECT COUNT(*) n FROM xp_level a JOIN xp_level b ON b.level = a.level + 1 WHERE b.xp <= a.xp').n, 0);
  // monsters: grades, zones and drops are linked to existing monsters and items
  assert.ok(one('SELECT COUNT(*) n FROM monster').n > 4000);
  assert.equal(one('SELECT COUNT(*) n FROM monster_grade g LEFT JOIN monster m ON m.id = g.monster_id WHERE m.id IS NULL').n, 0);
  assert.equal(one('SELECT chances FROM monster_drop d JOIN monster m ON m.id = d.monster_id JOIN item i ON i.id = d.item_id WHERE m.name = \'Bouftou\' AND i.name = \'Laine de Bouftou\'').chances, '[53,53,53,53,53]');
  raw.close();
});

test('real data: class quests come from the class condition, never from guesses', { skip }, async () => {
  const { classQuests, classScope, reservedToOtherClass } = await import('../src/class-quests.ts');
  const g = loadGraph(db!);
  const exclusive = [...g.nodes.values()].filter((n) => n.kind === 'quest' && classScope(n.crit)?.kind === 'exclusive');
  assert.equal(exclusive.length, 38); // 19 Astrub class quests + 19 "Dévotion"
  for (const id of [8, 9, 12, 17]) {
    const mine = classQuests(g, id).map((n) => n.refId);
    assert.equal(mine.length, 4, `breed ${id}`); // Astrub quest, Dévotion, and the class branch of 1960 and 1938
    assert.ok(mine.includes(1960) && mine.includes(1938));
  }
  assert.ok(classQuests(g, 9).some((n) => n.refId === 1971)); // "C'est pour ta pomme", Crâ
  const crâQuest = g.nodes.get('quest:1971')!;
  assert.equal(reservedToOtherClass(crâQuest, 9), false);
  assert.equal(reservedToOtherClass(crâQuest, 8), true);
  assert.equal(reservedToOtherClass(crâQuest, undefined), false); // no class chosen: nothing hidden
  assert.equal(reservedToOtherClass(g.nodes.get('quest:1960')!, 8), false); // per-class branch: open to all
});

test('real data: achievements tied to a class through its class quests, and named after it', { skip }, async () => {
  const { classAchievements } = await import('../src/class-quests.ts');
  const { loadObjectiveIndex } = await import('../src/load.ts');
  const g = loadGraph(db!);
  const r = classAchievements(g, loadObjectiveIndex(db!), 8, 'Iop');
  assert.deepEqual(r.named.map((n) => n.label).sort(), ['Challenge Iop', 'Dopeul Iop']);
  assert.ok(r.linked.length >= 2 && r.linked.every((n) => n.kind === 'achievement'));
});

test('real data: level suggestions, zones and dungeons for a level come only from game values', { skip }, async () => {
  const { loadZoneData, forLevel } = await import('../src/zones.ts');
  const data = loadZoneData(db!)!;
  assert.ok(data.activities.length > 600 && data.zones.length > 100);
  const r = forLevel(data, 50, 10);
  for (const list of r.byCategory.values()) for (const a of list) assert.ok(Math.abs(a.level - 50) <= 10, a.name);
  assert.ok(r.byCategory.get('Donjon')!.some((a) => a.name === 'Donjon des Forgerons')); // the game suggests it at 50
  assert.ok(r.zones.length > 0 && r.zones.length <= 12);
  for (const z of r.zones) for (const m of z.monsters) assert.ok(m.lmax >= 40 && m.lmin <= 60, `${z.name}: ${m.name}`);
  assert.ok(r.dungeons.every((d) => Math.abs(d.optimalLevel - 50) <= 10 || (d.minLevel <= 50 && 50 <= d.optimalLevel)));
  assert.ok(r.dungeons.length > 0);
});

test('real data: quest objectives link to where monsters live and where items come from', { skip }, async () => {
  const { loadQuestDetails } = await import('../src/load.ts');
  const t = loadQuestDetails(db!, 64)!.targets;
  assert.deepEqual(t.monsters, [{ name: 'Sanglier agressif', zones: ['Champs de Cania'] }]);
  assert.equal(t.items[0].name, 'Défense de sanglier agressif');
  assert.equal(t.items[0].source.kind, 'other');
});

test('real data: Almanax offering of a day comes from the game calendar', { skip }, async () => {
  const { loadAlmanax } = await import('../src/load.ts');
  const { almanaxFor, addDays } = await import('../src/almanax-shared.ts');
  const entries = loadAlmanax(db!)!;
  assert.equal(entries.length, 376);
  const r = almanaxFor(entries, { day: 20, month: 11, year: 2026 });
  assert.equal(r.offering?.item, 'Sang coagulé');
  assert.equal(r.offering?.qty, 2);
  assert.ok(r.period.every((e) => e !== r.offering));
  // every day of a year has an offering
  let d = { day: 1, month: 1, year: 2027 };
  for (let i = 0; i < 365; i++, d = addDays(d, 1)) assert.ok(almanaxFor(entries, d).offering, `${d.day}/${d.month}`);
});
