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
  for (const a of list) {
    // same rows, same order; `place` is added from the name (tested on its own below)
    assert.deepEqual(a.objectives.map(({ id, name, criterion }) => ({ id, name, criterion })), one.all(a.id).map((r) => ({ ...r })), `achievement ${a.id}`);
    for (const o of a.objectives) if (o.place) assert.ok(o.name, `objective ${o.id} has a place but no name`);
  }
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
  // XP 0 is "not set": never shown as a value; archmonsters, quest monsters, wanted targets and Dopeuls are not zone population
  const { DatabaseSync } = await import('node:sqlite');
  const g = new DatabaseSync(db!, { readOnly: true });
  const race = new Map((g.prepare('SELECT id, race FROM monster').all() as { id: number; race: string | null }[]).map((m) => [m.id, m.race ?? '']));
  g.close();
  const { NOT_REGULAR } = await import('../src/zones.ts');
  for (const z of data.zones) for (const m of z.monsters) {
    assert.ok(m.xpMin !== 0 && m.xpMax !== 0, `${m.name}: XP 0 shown`);
    assert.ok(!NOT_REGULAR.test(race.get(m.id)!), `${z.name}: ${m.name} (${race.get(m.id)})`);
  }
  // the excluded races exist in those zones in the game data (so the rule is doing something) and stay in the database
  assert.ok([...race.values()].filter((r) => NOT_REGULAR.test(r)).length > 1000);
  assert.equal(race.size, 5135);
  // summons: every "Invocations…" race is matched (285 monsters in 3.7.14.18), and none appears in a zone list
  const summons = [...race].filter(([, r]) => r.startsWith('Invocations'));
  assert.ok(summons.length > 200 && summons.every(([, r]) => NOT_REGULAR.test(r)));
  const shown = new Set(data.zones.flatMap((z) => z.monsters.map((m) => m.id)));
  assert.ok(summons.every(([id]) => !shown.has(id)));
  // ordinary monsters remain: Bouftous live in "Coin des Bouftous" with a known base XP
  const coin = data.zones.find((z) => z.name === 'Coin des Bouftous')!;
  assert.ok(coin.monsters.some((m) => m.name === 'Bouftou' && m.xpMax != null && m.xpMax > 0));
  assert.ok(forLevel(data, 26, 5).zones.some((z) => z.name === 'Coin des Bouftous')); // Bouftou grades: levels 22–30
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
});

test('real data: Almanax season entries never replace the day’s own offering (review finding H1)', { skip }, async () => {
  const { loadAlmanax } = await import('../src/load.ts');
  const { almanaxFor, addDays } = await import('../src/almanax-shared.ts');
  const entries = loadAlmanax(db!)!;
  // the day's own entry, read from the calendar itself (no expected offering is written into the code)
  const own = (d: { day: number; month: number }) => entries.find((e) => e.dates.length === 1 && e.dates[0] === `${String(d.day).padStart(2, '0')}/${String(d.month).padStart(2, '0')}/*`);
  const exactYear = (d: { day: number; month: number; year: number }) => entries.find((e) => e.dates.includes(`${String(d.day).padStart(2, '0')}/${String(d.month).padStart(2, '0')}/${d.year}`));
  // a season entry lists the day explicitly among other days (the cause of the bug)
  const seasonOn = (d: { day: number; month: number }) => entries.filter((e) => e.dates.length > 1 && e.dates.some((p) => p === `${String(d.day).padStart(2, '0')}/${String(d.month).padStart(2, '0')}/*`));

  // 1 March and 21 December 2026: the days named in the review
  for (const d of [{ day: 1, month: 3, year: 2026 }, { day: 21, month: 12, year: 2026 }]) {
    const r = almanaxFor(entries, d);
    assert.ok(own(d) && seasonOn(d).length > 0, `${d.day}/${d.month}: a season entry lists this day`);
    assert.equal(r.offering?.id, own(d)!.id, `${d.day}/${d.month}`);
    for (const s of seasonOn(d)) assert.ok(r.period.includes(s), `${d.day}/${d.month}: season bonus #${s.id} still shown`);
  }
  assert.equal(almanaxFor(entries, { day: 1, month: 3, year: 2026 }).offering?.item, 'La Chaîne Nhanor Kibrill');

  // every day of 2026 and 2027: exactly one offering; an exact-year entry (events) wins; otherwise the day's own entry
  let affected = 0;
  let d = { day: 1, month: 1, year: 2026 };
  for (let i = 0; i < 730; i++, d = addDays(d, 1)) {
    const r = almanaxFor(entries, d);
    assert.ok(r.offering, `${d.day}/${d.month}/${d.year}: no offering`);
    const expected = exactYear(d) ?? own(d);
    if (expected) assert.equal(r.offering.id, expected.id, `${d.day}/${d.month}/${d.year}`);
    assert.ok(!r.period.includes(r.offering), `${d.day}/${d.month}/${d.year}: offering repeated as a period bonus`);
    if (d.year === 2026 && own(d) && !exactYear(d) && seasonOn(d).length) affected++;
  }
  // 122 days of 2026 where a season competes with the day's own entry; before the fix the 81 of them whose season
  // entry had the lower id showed the season's offering. All are checked above.
  assert.equal(affected, 122);

  // a month-wide season (January has no explicit days in #130) stays a period bonus
  assert.ok(almanaxFor(entries, { day: 15, month: 1, year: 2026 }).period.some((e) => e.id === 130));
});

test('real data: craft demand ranks zone loot by how many game recipes use it', { skip }, async () => {
  const { loadZoneData, forLevel } = await import('../src/zones.ts');
  const w = forLevel(loadZoneData(db!)!, 30, 10).wanted;
  assert.ok(w.length > 0 && w.length <= 10);
  for (let i = 1; i < w.length; i++) assert.ok(w[i - 1].uses >= w[i].uses);
  assert.ok(w.every((x) => x.uses > 0 && x.zones.length > 0));
  // every unconditional drop counts, not only each monster's 3 most likely ones (162 zone monsters have more than 3)
  const data = loadZoneData(db!)!;
  assert.ok(Object.values(data.drops).some((d) => d.length > 3));
  assert.ok(forLevel(data, 60, 10).wanted.some((x) => x.item === 'Capsule Explosive')); // 4th+ drop of its monsters
});

test('real data: achievement search covers names, objectives and dungeons, without accents', { skip }, async () => {
  const { searchAchievements } = await import('../src/load.ts');
  const byName = searchAchievements(db!, 'kardorim');
  assert.equal(byName[0].match, 'name');
  assert.ok(byName.some((h) => h.text === 'Crypte de Kardorim'));
  assert.ok(searchAchievements(db!, 'foret').some((h) => h.text.includes('Forêt'))); // "foret" finds "Forêt"
  assert.ok(searchAchievements(db!, 'scoliopode').some((h) => h.match === 'objective')); // a monster named only in objectives
  assert.deepEqual(searchAchievements(db!, 'x'), []); // one letter: nothing
  for (const h of searchAchievements(db!, 'frigost')) assert.ok(h.text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').includes('frigost'));
});

test('real data: achievements by id keep their order and carry their dungeons', { skip }, async () => {
  const { loadAchievementsByIds, loadAchievements } = await import('../src/load.ts');
  assert.deepEqual(loadAchievementsByIds(db!, [9064, 9097, 9065, 999999]).map((a) => a.id), [9064, 9097, 9065]);
  const crypt = loadAchievements(db!, [11]).find((a) => a.name === 'Crypte de Kardorim')!;
  assert.deepEqual(crypt.dungeons, [{ name: 'Crypte de Kardorim', level: 10 }]);
});

test('real data: objectives name their monster, zone or dungeon; Dofus carry their guide slug', { skip }, async () => {
  const { loadAchievementsByIds } = await import('../src/load.ts');
  const { dofusSlugs, guideContext } = await import('../src/guides-data.ts');
  const [necro, pourpre] = loadAchievementsByIds(db!, [1129, 1101]);
  // a monster named only in an objective: its level range and the zones it lives in, from the game's monster data
  assert.deepEqual(necro.objectives.find((o) => o.name === 'Scoliopode')?.place, { kind: 'monster', level: [172, 180], zones: ['Catacombres'] });
  assert.ok(necro.objectives.every((o) => !o.place || ['monster', 'zone', 'dungeon'].includes(o.place.kind)));
  // the slug is the one the Dofus guide pages are generated from
  const c = guideContext()!;
  const slug = dofusSlugs(c.dofus).get(694);
  assert.deepEqual(pourpre.dofus, [{ name: 'Dofus Pourpre', slug }]);
  assert.ok(slug);
});
