// World map and professions: read side (tables written by scripts/world-import.ts) and the pure
// helpers the UI shares with the tests (cell outlines, route ordering, profession brackets).
import { existsSync, readFileSync } from 'node:fs';
import { withDb } from './load.ts';
import { jobSlug } from './world-shared.ts';

export * from './world-shared.ts';
import type { WorldData, WorldZone, WorldMarker, WorldMonster, JobSummary, GatherTier, RecipeInfo, IngredientSource, JobDetails } from './world-shared.ts';

const hasWorld = (db: import('node:sqlite').DatabaseSync) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'world_cell'").get();


/** Tile scales of the official artwork for a world, when scripts/fetch-worldmap.ts has copied them. */
function tilesFor(mapId: number): WorldData['tiles'] {
  const f = /*turbopackIgnore: true*/ 'public/ankama/worldmap/index.json';
  if (!existsSync(f)) return null;
  try { return (JSON.parse(readFileSync(f, 'utf8')).worlds?.[mapId]?.scales as WorldData['tiles']) ?? null; } catch { return null; }
}

export function loadWorld(path: string, mapId: number): WorldData | null {
  return withDb(path, (db) => {
    if (!hasWorld(db)) return null;
    const row = db.prepare('SELECT id, name, origin_x, origin_y, map_w, map_h, total_w, total_h FROM world_map WHERE id = ?').get(mapId) as Record<string, any> | undefined;
    if (!row) return null;
    const map = { id: row.id as number, name: row.name as string, originX: row.origin_x, originY: row.origin_y, mapW: row.map_w, mapH: row.map_h, totalW: row.total_w, totalH: row.total_h };
    const version = (db.prepare('SELECT id FROM game_version').get() as { id: string }).id;
    const src = db.prepare("SELECT url, retrieved_at FROM data_source WHERE dataset = 'world_map'").get() as { url: string; retrieved_at: string } | undefined;
    const gathered = new Map((db.prepare(`SELECT g.item_id, MIN(g.level_min) lv, MIN(g.job_id) job, i.name, i.icon_id FROM gather_skill g
      JOIN item i ON i.id = g.item_id GROUP BY g.item_id`).all() as { item_id: number; lv: number; job: number; name: string; icon_id: number | null }[])
      .map((r) => [r.item_id, r]));
    const zonesRaw = db.prepare(`SELECT s.id, s.name, a.name area, s.level, s.cx, s.cy, s.zaap_x, s.zaap_y, s.harvestables, s.monsters
      FROM world_subarea s LEFT JOIN world_area a ON a.id = s.area_id WHERE s.world_map = ?`).all(mapId) as Record<string, any>[];
    const zones: WorldZone[] = zonesRaw.map((z) => ({
      id: z.id, name: z.name, area: z.area, level: z.level, cx: z.cx, cy: z.cy,
      zaap: z.zaap_x == null ? null : [z.zaap_x, z.zaap_y],
      resources: [...new Set((JSON.parse(z.harvestables) as number[]).filter((id) => gathered.has(id)))],
      monsters: JSON.parse(z.monsters),
    }));
    const zoneIds = new Set(zones.map((z) => z.id));
    const resIds = new Set(zones.flatMap((z) => z.resources));
    const monIds = [...new Set(zones.flatMap((z) => z.monsters))];
    const monsters = monIds.length ? (db.prepare(`SELECT id, name, level_min levelMin, level_max levelMax FROM monster WHERE id IN (${monIds.map(() => '?').join(',')})`)
      .all(...monIds) as Record<string, any>[]).map((m) => ({ ...m })) as WorldMonster[] : [];
    const npcs = (db.prepare(`SELECT n.npc_id, n.name, n.x, n.y, q.id, q.name qname, q.category_id FROM world_npc n JOIN quest q ON q.id = n.quest_id
      WHERE n.world_map = ? AND n.name IS NOT NULL`).all(mapId) as Record<string, any>[])
      .map((r) => ({ npcId: r.npc_id, name: r.name, x: r.x, y: r.y, quest: { id: r.id, name: r.qname, category: r.category_id } }));
    return {
      version, retrievedAt: src?.retrieved_at ?? null, source: src?.url ?? null, map, tiles: tilesFor(mapId),
      dungeons: (db.prepare('SELECT id, name, level, x, y FROM world_dungeon WHERE world_map = ? ORDER BY level').all(mapId) as Record<string, any>[]).map((d) => ({ ...d })) as WorldData['dungeons'],
      maps: (db.prepare('SELECT id, name, cells FROM world_map ORDER BY cells DESC').all() as Record<string, any>[]).map((m) => ({ ...m })) as WorldData['maps'],
      cells: (db.prepare('SELECT x, y, subarea_id s FROM world_cell WHERE world_map = ?').all(mapId) as { x: number; y: number; s: number }[]).map((c) => [c.x, c.y, c.s]),
      zones,
      markers: (db.prepare('SELECT id, category, category_id categoryId, name, x, y, subarea_id zone FROM world_hint WHERE world_map = ?').all(mapId) as Record<string, any>[])
        .map((m) => ({ ...m, zone: zoneIds.has(m.zone) ? m.zone : null })) as WorldMarker[],
      zaaps: (db.prepare('SELECT x, y, subarea_id zone FROM world_zaap WHERE world_map = ?').all(mapId) as Record<string, any>[]).map((z) => ({ ...z })) as WorldData['zaaps'],
      resources: [...resIds].map((id) => { const r = gathered.get(id)!; return { id, name: r.name, iconId: r.icon_id, jobId: r.job, levelMin: r.lv }; }),
      monsters,
      jobs: (db.prepare('SELECT id, name, kind FROM job ORDER BY name').all() as Record<string, any>[]).map((j) => ({ id: j.id, name: j.name, kind: j.kind, slug: jobSlug(j.name) })),
      npcs,
    };
  });
}

// ---------------------------------------------------------------- professions
export function loadJobs(path: string): JobSummary[] | null {
  return withDb(path, (db) => {
    if (!hasWorld(db)) return null;
    return (db.prepare(`SELECT j.id, j.name, j.kind, j.icon_id iconId,
        (SELECT COUNT(DISTINCT item_id) FROM gather_skill g WHERE g.job_id = j.id) resources,
        (SELECT COUNT(*) FROM recipe r WHERE r.job_id = j.id) recipes
      FROM job j ORDER BY j.name`).all() as Record<string, any>[]).map((j) => ({ ...j, slug: jobSlug(j.name) })) as JobSummary[];
  });
}

export function loadJob(path: string, slug: string): JobDetails | null {
  return withDb(path, (db) => {
    if (!hasWorld(db)) return null;
    const job = loadJobsFrom(db).find((j) => j.slug === slug);
    if (!job) return null;
    const version = (db.prepare('SELECT id FROM game_version').get() as { id: string }).id;
    const zones = (db.prepare(`SELECT s.id, s.name, a.name area, s.level, s.zaap_x, s.zaap_y, s.harvestables FROM world_subarea s
      LEFT JOIN world_area a ON a.id = s.area_id WHERE s.world_map = 1 ORDER BY s.level, s.name`).all() as Record<string, any>[])
      .map((z) => ({ id: z.id as number, name: z.name as string, area: z.area as string | null, level: z.level as number,
        zaap: (z.zaap_x == null ? null : [z.zaap_x, z.zaap_y]) as [number, number] | null, res: new Set(JSON.parse(z.harvestables) as number[]) }));
    const tiers = (db.prepare(`SELECT g.item_id itemId, MIN(g.level_min) levelMin, i.name, i.icon_id iconId FROM gather_skill g JOIN item i ON i.id = g.item_id
      WHERE g.job_id = ? GROUP BY g.item_id ORDER BY levelMin, i.name`).all(job.id) as Record<string, any>[])
      .map((t) => ({ ...t, zones: zones.filter((z) => z.res.has(t.itemId)).map(({ res: _r, ...z }) => z) })) as GatherTier[];
    const item = db.prepare('SELECT name, icon_id FROM item WHERE id = ?');
    const gatheredBy = new Map((db.prepare('SELECT g.item_id, MIN(g.level_min) lv, g.job_id, j.name FROM gather_skill g JOIN job j ON j.id = g.job_id GROUP BY g.item_id').all() as Record<string, any>[])
      .map((r) => [r.item_id as number, r]));
    const craftedBy = new Map((db.prepare('SELECT r.result_id, MIN(r.level) lv, r.job_id, j.name FROM recipe r JOIN job j ON j.id = r.job_id GROUP BY r.result_id').all() as Record<string, any>[])
      .map((r) => [r.result_id as number, r]));
    const source = (id: number): IngredientSource => {
      const g = gatheredBy.get(id);
      if (g) return { kind: 'gathered', jobId: g.job_id, jobName: g.name, levelMin: g.lv };
      const c = craftedBy.get(id);
      return c ? { kind: 'crafted', jobId: c.job_id, jobName: c.name, level: c.lv } : { kind: 'other' };
    };
    const recipes = (db.prepare('SELECT r.result_id, r.level, r.ingredients, i.name, i.icon_id FROM recipe r JOIN item i ON i.id = r.result_id WHERE r.job_id = ? ORDER BY r.level, i.name')
      .all(job.id) as Record<string, any>[]).map((r): RecipeInfo => ({
      resultId: r.result_id, name: r.name, iconId: r.icon_id, level: r.level,
      ingredients: (JSON.parse(r.ingredients) as [number, number][]).map(([id, qty]) => {
        const it = item.get(id) as { name: string; icon_id: number | null } | undefined;
        return { id, qty, name: it?.name ?? `objet n°${id}`, iconId: it?.icon_id ?? null, source: source(id) };
      }),
    }));
    return { job, tiers, recipes, version };
  });
}
const loadJobsFrom = (db: import('node:sqlite').DatabaseSync) => (db.prepare(`SELECT j.id, j.name, j.kind, j.icon_id iconId,
    (SELECT COUNT(DISTINCT item_id) FROM gather_skill g WHERE g.job_id = j.id) resources,
    (SELECT COUNT(*) FROM recipe r WHERE r.job_id = j.id) recipes FROM job j`).all() as Record<string, any>[])
  .map((j) => ({ ...j, slug: jobSlug(j.name) })) as JobSummary[];

