// Classes, monsters and the character XP table, from the same game-data release as the rest (ledouxm/dofus-sqlite).
// Everything is copied from the game files: class roles and complexity, monster grades (level, XP, life),
// the zones each monster lives in, drop chances per grade, and the XP needed per character level.
// Nothing here is estimated or computed from community data.
//
// Called at the end of scripts/import.ts, or alone on an existing game database:
//   node --max-old-space-size=8192 scripts/creatures-import.ts
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

type Row = Record<string, any>;
const arr = (x: any): any[] => x?.Array ?? [];

export const CREATURE_FILES = ['breedsdata', 'breedrolesdata', 'monstersdata', 'monsterracesdata', 'characterxpmappingsdata', 'activitysuggestionsdata', 'activitysuggestioncategoriesdata', 'mapsinformationdata', 'i18n_fr'] as const;

export function importCreatures(db: DatabaseSync, rawDir: string, sourceUrl: string) {
  const read = (f: string): Row[] => JSON.parse(readFileSync(`${rawDir}/${f}.json`, 'utf8')).references.RefIds.map((r: Row) => r.data).filter(Boolean);
  const fr: Record<string, string> = JSON.parse(readFileSync(`${rawDir}/i18n_fr.json`, 'utf8'));
  const t = (id: unknown) => (id == null || id === 0 || id === '0' ? null : fr[String(id)] ?? null);

  db.exec(`
    DROP TABLE IF EXISTS breed_info; DROP TABLE IF EXISTS monster; DROP TABLE IF EXISTS monster_grade;
    DROP TABLE IF EXISTS monster_subarea; DROP TABLE IF EXISTS monster_drop; DROP TABLE IF EXISTS xp_level; DROP TABLE IF EXISTS activity;
    -- roles: JSON [{ name, value }], the game's own score per role (0–12 in 3.7.14.18, no stated maximum);
    -- complexity: the game's scale (1–5 in 3.7.14.18); sort_index: the game's class order
    CREATE TABLE breed_info(breed_id INTEGER PRIMARY KEY, title TEXT, description TEXT, complexity INTEGER, sort_index INTEGER, roles TEXT);
    CREATE TABLE monster(id INTEGER PRIMARY KEY, name TEXT, race TEXT);
    CREATE TABLE monster_grade(monster_id INTEGER NOT NULL, grade INTEGER NOT NULL, level INTEGER, xp INTEGER, life INTEGER, PRIMARY KEY(monster_id, grade));
    CREATE TABLE monster_subarea(monster_id INTEGER NOT NULL, subarea_id INTEGER NOT NULL, PRIMARY KEY(monster_id, subarea_id));
    CREATE INDEX monster_subarea_zone ON monster_subarea(subarea_id);
    -- chances: JSON [grade1..grade5] in percent, before prospection; criterion: the game's raw drop condition ('' = none)
    CREATE TABLE monster_drop(monster_id INTEGER NOT NULL, item_id INTEGER NOT NULL, chances TEXT, criterion TEXT);
    CREATE INDEX monster_drop_item ON monster_drop(item_id);
    CREATE INDEX monster_drop_monster ON monster_drop(monster_id);
    -- xp: total experience needed to reach the level
    CREATE TABLE xp_level(level INTEGER PRIMARY KEY, xp INTEGER);
    -- the game's own activity suggestions (dungeons, quests, archmonsters, wanted, discoveries…) that have a level
    CREATE TABLE activity(id INTEGER PRIMARY KEY, name TEXT, description TEXT, category TEXT, level INTEGER, subarea_id INTEGER);
  `);
  const insert = (table: string, cols: string[], data: unknown[][]) => {
    const st = db.prepare(`INSERT INTO ${table}(${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
    for (const r of data) st.run(...(r as any[]));
  };

  const roleName = new Map(read('breedrolesdata').map((r) => [r.id as number, t(r.nameId)]));
  const breeds = read('breedsdata').map((b) => ({
    id: b.id as number, name: t(b.shortNameId), title: t(b.gameplayDescriptionId), description: t(b.descriptionId),
    complexity: (b.complexity ?? null) as number | null, sortIndex: (b.sortIndex ?? null) as number | null,
    roles: arr(b.breedRoles).filter((r) => roleName.get(r.roleId)).map((r) => ({ name: roleName.get(r.roleId) as string, value: r.value as number })),
  }));
  insert('breed_info', ['breed_id', 'title', 'description', 'complexity', 'sort_index', 'roles'],
    breeds.map((b) => [b.id, b.title, b.description, b.complexity, b.sortIndex, JSON.stringify(b.roles)]));
  // the class list the site's client code needs (19 small entries), in the game's order; strongest 3 roles first
  writeFileSync('src/breed-data.json', JSON.stringify(breeds.filter((b) => b.name).sort((a, b) => (a.sortIndex ?? 99) - (b.sortIndex ?? 99)).map((b) => ({
    id: b.id, name: b.name, title: b.title, complexity: b.complexity,
    roles: [...b.roles].sort((x, y) => y.value - x.value).slice(0, 3).map((r) => r.name),
    summary: b.description?.split(/(?<=[.!?])\s/)[0] ?? null,
  })), null, 2) + '\n');

  const raceName = new Map<number, string | null>(read('monsterracesdata').map((r) => [r.id as number, t(r.nameId)]));
  const monsters = read('monstersdata');
  const named = monsters.filter((m) => t(m.nameId));
  insert('monster', ['id', 'name', 'race'], named.map((m) => [m.id, t(m.nameId), raceName.get(m.race) ?? null]));
  const grades: unknown[][] = [], zones: unknown[][] = [], drops: unknown[][] = [];
  for (const m of named) {
    for (const g of arr(m.grades)) grades.push([m.id, g.grade, g.level ?? null, g.xp ?? null, g.lifePoints ?? null]);
    for (const s of new Set(arr(m.subareas) as number[])) zones.push([m.id, s]);
    for (const d of arr(m.drops)) {
      const chances = [1, 2, 3, 4, 5].map((i) => d[`percentDropForGrade${i}`] ?? null);
      drops.push([m.id, d.objectId, JSON.stringify(chances), d.criterions ?? '']);
    }
  }
  insert('monster_grade', ['monster_id', 'grade', 'level', 'xp', 'life'], grades);
  insert('monster_subarea', ['monster_id', 'subarea_id'], zones);
  insert('monster_drop', ['monster_id', 'item_id', 'chances', 'criterion'], drops);

  // entry n = experience to reach level n + 1 (entry 0 = level 1 = 0 XP); only levels 1–200 are character levels
  const xp = read('characterxpmappingsdata').map((x) => x.experiencePoints as number);
  insert('xp_level', ['level', 'xp'], xp.slice(0, 200).map((v, i) => [i + 1, v]));

  // map → zone, to place each suggestion; only suggestions with a level, without event dates (3 are dated)
  const zoneOfMap = new Map(read('mapsinformationdata').map((m) => [m.id as number, m.subAreaId as number]));
  const category = new Map(read('activitysuggestioncategoriesdata').map((c) => [c.id as number, t(c.nameId)]));
  const activities = read('activitysuggestionsdata').filter((a) => a.level > 0 && !a.startDate && !a.endDate && t(a.nameId));
  insert('activity', ['id', 'name', 'description', 'category', 'level', 'subarea_id'], activities.map((a) => [
    a.id, t(a.nameId), t(a.descriptionId), category.get(a.categoryId) ?? null, a.level, a.mapId ? zoneOfMap.get(a.mapId) ?? null : null,
  ]));

  const now = new Date().toISOString();
  db.prepare('INSERT OR REPLACE INTO data_source(dataset, url, retrieved_at) VALUES (?, ?, ?)').run('creatures', sourceUrl, now);
  return { breeds: read('breedsdata').length, monsters: named.length, grades: grades.length, zones: zones.length, drops: drops.length, xpLevels: Math.min(200, xp.length), activities: activities.length };
}

// standalone: rebuild these tables in the newest existing game database
if (import.meta.main) {
  const db = readdirSync('data').filter((f) => /^game-[\d.]+\.sqlite$/.test(f)).sort().pop();
  if (!db) throw new Error('no game database: run npm run import first');
  const version = db.match(/game-([\d.]+)\.sqlite/)![1];
  const rawDir = readdirSync('data/raw').map((d) => `data/raw/${d}`).find((d) => d.endsWith(`_${version}`) && existsSync(`${d}/monstersdata.json`));
  if (!rawDir) throw new Error(`raw files for ${version} not found`);
  const missing = CREATURE_FILES.filter((f) => !existsSync(`${rawDir}/${f}.json`));
  if (missing.length) throw new Error(`missing ${missing.join(', ')} in ${rawDir}: run npm run import`);
  const conn = new DatabaseSync(`data/${db}`);
  conn.exec('BEGIN');
  const res = importCreatures(conn, rawDir, `https://github.com/ledouxm/dofus-sqlite/releases/tag/${rawDir.split('/').pop()}`);
  conn.exec('COMMIT');
  conn.exec('VACUUM');
  conn.close();
  console.log(res);
}
