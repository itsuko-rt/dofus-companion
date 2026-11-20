// World map and professions, from the same game-data release as the rest (ledouxm/dofus-sqlite):
// map coordinates (mapsinformation), zones (subareas, areas), official world-map markers (hints),
// zaaps (waypoints), professions (jobs), harvesting skills, recipes, and the monsters of each zone.
// Nothing here is estimated: a resource is linked to the zones whose game data lists it as harvestable;
// the exact cell of each spot is not part of these files and is never invented.
//
// Called at the end of scripts/import.ts, or alone on an existing game database:
//   node --max-old-space-size=8192 scripts/world-import.ts
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

type Row = Record<string, any>;
const arr = (x: any): any[] => x?.Array ?? [];

export const WORLD_FILES = ['mapsinformationdata', 'areasdata', 'superareasdata', 'worldmapsdata', 'hintsdata', 'hintcategoriesdata',
  'waypointsdata', 'jobsdata', 'skillsdata', 'recipesdata'] as const;

/** Minimum cells for a world map to be offered (tiny instance maps are left out). */
const MIN_CELLS = 20;

export function importWorld(db: DatabaseSync, rawDir: string, sourceUrl: string, monsters: Row[]) {
  const read = (f: string): Row[] => JSON.parse(readFileSync(`${rawDir}/${f}.json`, 'utf8')).references.RefIds.map((r: Row) => r.data).filter(Boolean);
  const fr: Record<string, string> = JSON.parse(readFileSync(`${rawDir}/i18n_fr.json`, 'utf8'));
  const t = (id: unknown) => (id == null ? null : fr[String(id)] ?? null);

  db.exec(`
    DROP TABLE IF EXISTS world_map; DROP TABLE IF EXISTS world_area; DROP TABLE IF EXISTS world_subarea; DROP TABLE IF EXISTS world_cell;
    DROP TABLE IF EXISTS world_hint; DROP TABLE IF EXISTS world_zaap; DROP TABLE IF EXISTS job; DROP TABLE IF EXISTS gather_skill;
    DROP TABLE IF EXISTS recipe; DROP TABLE IF EXISTS monster;
    CREATE TABLE world_map(id INTEGER PRIMARY KEY, name TEXT, cells INTEGER);
    CREATE TABLE world_area(id INTEGER PRIMARY KEY, name TEXT, super_area TEXT);
    -- one zone of the map; harvestables / monsters: JSON id lists from the game data
    CREATE TABLE world_subarea(id INTEGER PRIMARY KEY, name TEXT, area_id INTEGER, world_map INTEGER, level INTEGER,
      cx REAL, cy REAL, zaap_x INTEGER, zaap_y INTEGER, harvestables TEXT, monsters TEXT);
    CREATE TABLE world_cell(world_map INTEGER, x INTEGER, y INTEGER, subarea_id INTEGER, PRIMARY KEY(world_map, x, y));
    CREATE TABLE world_hint(id INTEGER PRIMARY KEY, category_id INTEGER, category TEXT, name TEXT, x INTEGER, y INTEGER,
      world_map INTEGER, subarea_id INTEGER);
    CREATE TABLE world_zaap(map_id INTEGER PRIMARY KEY, x INTEGER, y INTEGER, world_map INTEGER, subarea_id INTEGER);
    -- kind: gathering (harvests resources), crafting (recipes), forgemagus, other
    CREATE TABLE job(id INTEGER PRIMARY KEY, name TEXT, kind TEXT, icon_id INTEGER);
    CREATE TABLE gather_skill(skill_id INTEGER PRIMARY KEY, job_id INTEGER, item_id INTEGER, level_min INTEGER, name TEXT);
    CREATE TABLE recipe(result_id INTEGER, job_id INTEGER, level INTEGER, ingredients TEXT, PRIMARY KEY(result_id, job_id));
    CREATE TABLE monster(id INTEGER PRIMARY KEY, name TEXT, level_min INTEGER, level_max INTEGER);
    CREATE INDEX recipe_job ON recipe(job_id);
    CREATE INDEX gather_job ON gather_skill(job_id);
  `);
  const insert = (table: string, cols: string[], data: unknown[][]) => {
    const st = db.prepare(`INSERT INTO ${table}(${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
    for (const r of data) st.run(...(r as any[]));
  };

  // ---- cells: one per (world map, x, y); indoor maps share the coordinates of their outdoor map
  const maps = read('mapsinformationdata');
  const subareas = read('subareasdata');
  const shown = new Map(subareas.map((s) => [s.id as number, s]));
  const votes = new Map<string, Map<number, number>>();
  const mapPos = new Map<number, Row>();
  for (const m of maps) {
    mapPos.set(m.id, m);
    if (m.worldMap == null || m.worldMap < 1 || !shown.get(m.subAreaId)?.displayOnWorldMap) continue;
    const key = `${m.worldMap}|${m.posX}|${m.posY}`;
    const v = votes.get(key) ?? new Map<number, number>();
    v.set(m.subAreaId, (v.get(m.subAreaId) ?? 0) + 1);
    votes.set(key, v);
  }
  const cells: [number, number, number, number][] = [];
  for (const [key, v] of votes) {
    const [w, x, y] = key.split('|').map(Number);
    const best = [...v].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
    cells.push([w, x, y, best]);
  }
  const perWorld = new Map<number, number>();
  for (const c of cells) perWorld.set(c[0], (perWorld.get(c[0]) ?? 0) + 1);
  const worlds = read('worldmapsdata').filter((w) => (perWorld.get(w.id) ?? 0) >= MIN_CELLS);
  const worldIds = new Set(worlds.map((w) => w.id as number));
  insert('world_map', ['id', 'name', 'cells'], worlds.map((w) => [w.id, t(w.nameId), perWorld.get(w.id)]));
  const kept = cells.filter((c) => worldIds.has(c[0]));
  insert('world_cell', ['world_map', 'x', 'y', 'subarea_id'], kept);

  // ---- zones: centre of their cells, zaap position, resources and monsters
  const centre = new Map<number, { w: number; sx: number; sy: number; n: number }>();
  for (const [w, x, y, s] of kept) {
    const c = centre.get(s) ?? { w, sx: 0, sy: 0, n: 0 };
    c.sx += x; c.sy += y; c.n++;
    centre.set(s, c);
  }
  const superName = new Map(read('superareasdata').map((s) => [s.id as number, t(s.nameId)]));
  insert('world_area', ['id', 'name', 'super_area'], read('areasdata').map((a) => [a.id, t(a.nameId), superName.get(a.superAreaId) ?? null]));
  // the zone's own zaap, only when it is a real waypoint (the data uses map 0 at [0, 0] for "none")
  const waypointMaps = new Set(read('waypointsdata').map((w) => w.mapId as number));
  const zoneRows = subareas.filter((s) => centre.has(s.id)).map((s) => {
    const c = centre.get(s.id)!;
    const zaap = waypointMaps.has(s.associatedZaapMapId) ? mapPos.get(s.associatedZaapMapId) : undefined;
    return [s.id, t(s.nameId), s.areaId, c.w, s.level, c.sx / c.n, c.sy / c.n, zaap?.posX ?? null, zaap?.posY ?? null,
      JSON.stringify(arr(s.harvestables)), JSON.stringify(arr(s.monsters))];
  });
  insert('world_subarea', ['id', 'name', 'area_id', 'world_map', 'level', 'cx', 'cy', 'zaap_x', 'zaap_y', 'harvestables', 'monsters'], zoneRows);

  // ---- official world-map markers and zaaps
  const cat = new Map(read('hintcategoriesdata').map((c) => [c.id as number, t(c.nameId)]));
  insert('world_hint', ['id', 'category_id', 'category', 'name', 'x', 'y', 'world_map', 'subarea_id'],
    read('hintsdata').filter((h) => worldIds.has(h.worldMapId)).map((h) => [h.id, h.categoryId, cat.get(h.categoryId) ?? null, t(h.nameId), h.x, h.y, h.worldMapId, h.subareaId]));
  insert('world_zaap', ['map_id', 'x', 'y', 'world_map', 'subarea_id'], read('waypointsdata').flatMap((w) => {
    const m = mapPos.get(w.mapId);
    return m ? [[w.mapId, m.posX, m.posY, m.worldMap, w.subAreaId]] : [];
  }));

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

  // ---- monsters that live in a zone of the map (name and level range of their grades)
  const wanted = new Set(subareas.filter((s) => centre.has(s.id)).flatMap((s) => arr(s.monsters) as number[]));
  insert('monster', ['id', 'name', 'level_min', 'level_max'], monsters.filter((m) => wanted.has(m.id)).map((m) => {
    const lv = (arr(m.grades) as Row[]).map((g) => g.level as number).filter((x) => x > 0);
    return [m.id, t(m.nameId), lv.length ? Math.min(...lv) : null, lv.length ? Math.max(...lv) : null];
  }));

  const now = new Date().toISOString();
  const src = db.prepare('INSERT OR REPLACE INTO data_source(dataset, url, retrieved_at) VALUES (?, ?, ?)');
  for (const d of ['world_map', 'professions']) src.run(d, sourceUrl, now);
  return { worlds: worlds.length, cells: kept.length, zones: zoneRows.length, recipes: seen.size };
}

// standalone: add the world tables to the newest existing game database
if (import.meta.main) {
  const db = readdirSync('data').filter((f) => /^game-[\d.]+\.sqlite$/.test(f)).sort().pop();
  if (!db) throw new Error('no game database: run npm run import first');
  const version = db.match(/game-([\d.]+)\.sqlite/)![1];
  const rawDir = readdirSync('data/raw').map((d) => `data/raw/${d}`).find((d) => d.endsWith(`_${version}`) && existsSync(`${d}/subareasdata.json`));
  if (!rawDir) throw new Error(`raw files for ${version} not found`);
  const missing = WORLD_FILES.filter((f) => !existsSync(`${rawDir}/${f}.json`));
  if (missing.length) throw new Error(`missing ${missing.join(', ')} in ${rawDir}: run npm run import`);
  const conn = new DatabaseSync(`data/${db}`);
  const tag = rawDir.split('/').pop();
  const monsters = JSON.parse(readFileSync(`${rawDir}/monstersdata.json`, 'utf8')).references.RefIds.map((r: Row) => r.data).filter(Boolean);
  conn.exec('BEGIN');
  const res = importWorld(conn, rawDir, `https://github.com/ledouxm/dofus-sqlite/releases/tag/${tag}`, monsters);
  conn.exec('COMMIT');
  conn.close();
  console.log(res);
}
