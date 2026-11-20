// Professions, from the same game-data release as the rest (ledouxm/dofus-sqlite): professions (jobs),
// harvesting skills, recipes, and the zones (subareas, areas) whose game data lists each resource.
// Nothing here is estimated: a resource is linked to the zones whose game data lists it as harvestable.
//
// Called at the end of scripts/import.ts, or alone on an existing game database:
//   node --max-old-space-size=8192 scripts/professions-import.ts
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

type Row = Record<string, any>;
const arr = (x: any): any[] => x?.Array ?? [];

export const PROFESSION_FILES = ['mapsinformationdata', 'areasdata', 'superareasdata', 'waypointsdata', 'jobsdata', 'skillsdata', 'recipesdata'] as const;

/** Tables of the former in-site world map (removed): dropped on import so old databases are cleaned. */
const RETIRED = ['world_map', 'world_cell', 'world_map_alt', 'world_hint', 'world_zaap', 'world_dungeon', 'world_npc', 'monster'];

export function importProfessions(db: DatabaseSync, rawDir: string, sourceUrl: string) {
  const read = (f: string): Row[] => JSON.parse(readFileSync(`${rawDir}/${f}.json`, 'utf8')).references.RefIds.map((r: Row) => r.data).filter(Boolean);
  const fr: Record<string, string> = JSON.parse(readFileSync(`${rawDir}/i18n_fr.json`, 'utf8'));
  const t = (id: unknown) => (id == null ? null : fr[String(id)] ?? null);

  db.exec(`
    ${RETIRED.map((n) => `DROP TABLE IF EXISTS ${n};`).join(' ')}
    DROP TABLE IF EXISTS world_area; DROP TABLE IF EXISTS world_subarea; DROP TABLE IF EXISTS job; DROP TABLE IF EXISTS gather_skill; DROP TABLE IF EXISTS recipe;
    CREATE TABLE world_area(id INTEGER PRIMARY KEY, name TEXT, super_area TEXT);
    -- a zone of the Monde des Douze (world_map = 1) or another world; harvestables: JSON id list from the game data;
    -- zaap: coordinates of the zone's own waypoint, when it has one
    CREATE TABLE world_subarea(id INTEGER PRIMARY KEY, name TEXT, area_id INTEGER, world_map INTEGER, level INTEGER,
      zaap_x INTEGER, zaap_y INTEGER, harvestables TEXT);
    -- kind: gathering (harvests resources), crafting (recipes), forgemagus, other
    CREATE TABLE job(id INTEGER PRIMARY KEY, name TEXT, kind TEXT, icon_id INTEGER);
    CREATE TABLE gather_skill(skill_id INTEGER PRIMARY KEY, job_id INTEGER, item_id INTEGER, level_min INTEGER, name TEXT);
    CREATE TABLE recipe(result_id INTEGER, job_id INTEGER, level INTEGER, ingredients TEXT, PRIMARY KEY(result_id, job_id));
    CREATE INDEX recipe_job ON recipe(job_id);
    CREATE INDEX gather_job ON gather_skill(job_id);
  `);
  const insert = (table: string, cols: string[], data: unknown[][]) => {
    const st = db.prepare(`INSERT INTO ${table}(${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
    for (const r of data) st.run(...(r as any[]));
  };

  // ---- zones shown on the world map, with the world they belong to (most of their placed maps)
  const maps = read('mapsinformationdata');
  const subareas = read('subareasdata');
  const shown = new Map(subareas.map((s) => [s.id as number, s]));
  const mapPos = new Map<number, Row>();
  const worldVotes = new Map<number, Map<number, number>>();
  for (const m of maps) {
    mapPos.set(m.id, m);
    // bit 20: set on every placed map, never on the instance maps the game parks at [0, 0]
    if (m.worldMap == null || m.worldMap < 1 || !shown.get(m.subAreaId)?.displayOnWorldMap || ((m.m_flags >>> 20) & 1) !== 1) continue;
    const v = worldVotes.get(m.subAreaId) ?? new Map<number, number>();
    v.set(m.worldMap, (v.get(m.worldMap) ?? 0) + 1);
    worldVotes.set(m.subAreaId, v);
  }
  const superName = new Map(read('superareasdata').map((s) => [s.id as number, t(s.nameId)]));
  insert('world_area', ['id', 'name', 'super_area'], read('areasdata').map((a) => [a.id, t(a.nameId), superName.get(a.superAreaId) ?? null]));
  // the zone's own zaap, only when it is a real waypoint (the data uses map 0 at [0, 0] for "none")
  const waypointMaps = new Set(read('waypointsdata').map((w) => w.mapId as number));
  const zoneRows = subareas.filter((s) => worldVotes.has(s.id)).map((s) => {
    const world = [...worldVotes.get(s.id)!].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
    const zaap = waypointMaps.has(s.associatedZaapMapId) ? mapPos.get(s.associatedZaapMapId) : undefined;
    return [s.id, t(s.nameId), s.areaId, world, s.level, zaap?.posX ?? null, zaap?.posY ?? null, JSON.stringify(arr(s.harvestables))];
  });
  insert('world_subarea', ['id', 'name', 'area_id', 'world_map', 'level', 'zaap_x', 'zaap_y', 'harvestables'], zoneRows);

  // ---- professions
  const skills = read('skillsdata');
  const recipes = read('recipesdata');
  const gathering = new Set(skills.filter((s) => s.gatheredRessourceItem > 0).map((s) => s.parentJobId as number));
  const magus = new Set(skills.filter((s) => s.isForgemagus).map((s) => s.parentJobId as number));
  const crafting = new Set(recipes.map((r) => r.jobId as number));
  insert('job', ['id', 'name', 'kind', 'icon_id'], read('jobsdata').filter((j) => j.id !== 1).map((j) => [j.id, t(j.nameId),
    gathering.has(j.id) ? 'gathering' : magus.has(j.id) ? 'forgemagus' : crafting.has(j.id) ? 'crafting' : 'other', j.iconId ?? null]));
  insert('gather_skill', ['skill_id', 'job_id', 'item_id', 'level_min', 'name'],
    skills.filter((s) => s.gatheredRessourceItem > 0).map((s) => [s.id, s.parentJobId, s.gatheredRessourceItem, s.levelMin, t(s.nameId)]));
  const seen = new Set<string>();
  insert('recipe', ['result_id', 'job_id', 'level', 'ingredients'], recipes.flatMap((r) => {
    const key = `${r.resultId}|${r.jobId}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const ids = arr(r.ingredientIds) as number[], qty = arr(r.quantities) as number[];
    return [[r.resultId, r.jobId, r.resultLevel, JSON.stringify(ids.map((id, i) => [id, qty[i] ?? 1]))]];
  }));

  const now = new Date().toISOString();
  db.prepare("DELETE FROM data_source WHERE dataset = 'world_map'").run();
  db.prepare('INSERT OR REPLACE INTO data_source(dataset, url, retrieved_at) VALUES (?, ?, ?)').run('professions', sourceUrl, now);
  return { zones: zoneRows.length, recipes: seen.size };
}

// standalone: rebuild the profession tables of the newest existing game database
if (import.meta.main) {
  const db = readdirSync('data').filter((f) => /^game-[\d.]+\.sqlite$/.test(f)).sort().pop();
  if (!db) throw new Error('no game database: run npm run import first');
  const version = db.match(/game-([\d.]+)\.sqlite/)![1];
  const rawDir = readdirSync('data/raw').map((d) => `data/raw/${d}`).find((d) => d.endsWith(`_${version}`) && existsSync(`${d}/subareasdata.json`));
  if (!rawDir) throw new Error(`raw files for ${version} not found`);
  const missing = PROFESSION_FILES.filter((f) => !existsSync(`${rawDir}/${f}.json`));
  if (missing.length) throw new Error(`missing ${missing.join(', ')} in ${rawDir}: run npm run import`);
  const conn = new DatabaseSync(`data/${db}`);
  conn.exec('BEGIN');
  const res = importProfessions(conn, rawDir, `https://github.com/ledouxm/dofus-sqlite/releases/tag/${rawDir.split('/').pop()}`);
  conn.exec('COMMIT');
  conn.exec('VACUUM');
  conn.close();
  console.log(res);
}
