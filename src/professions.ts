// Professions guide: read side of the tables written by scripts/professions-import.ts.
import { withDb } from './load.ts';
import { jobSlug } from './professions-shared.ts';

export * from './professions-shared.ts';
import type { JobSummary, GatherTier, RecipeInfo, IngredientSource, JobDetails, DropSource } from './professions-shared.ts';

const hasWorld = (db: import('node:sqlite').DatabaseSync) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'world_subarea'").get();


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
    const source = itemSources(db);
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
/** Where an item comes from in the game data: harvested by a profession, crafted, or dropped by monsters (3 best base chances).
 *  Shared by the profession pages and the quest objectives. */
export function itemSources(db: import('node:sqlite').DatabaseSync): (id: number) => IngredientSource {
  const gatheredBy = new Map((db.prepare('SELECT g.item_id, MIN(g.level_min) lv, g.job_id, j.name FROM gather_skill g JOIN job j ON j.id = g.job_id GROUP BY g.item_id').all() as Record<string, any>[])
    .map((r) => [r.item_id as number, r]));
  const craftedBy = new Map((db.prepare('SELECT r.result_id, MIN(r.level) lv, r.job_id, j.name FROM recipe r JOIN job j ON j.id = r.job_id GROUP BY r.result_id').all() as Record<string, any>[])
    .map((r) => [r.result_id as number, r]));
  // monsters dropping an item (game files, scripts/creatures-import.ts)
  const dropQuery = db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'monster_drop'").get()
    ? db.prepare('SELECT m.name, d.chances, d.criterion FROM monster_drop d JOIN monster m ON m.id = d.monster_id WHERE d.item_id = ?') : null;
  const drops = (id: number): DropSource[] => !dropQuery ? [] : (dropQuery.all(id) as Record<string, any>[]).map((r) => {
    const c = (JSON.parse(r.chances) as (number | null)[]).filter((x): x is number => x != null);
    return { monster: r.name as string, min: c.length ? Math.min(...c) : 0, max: c.length ? Math.max(...c) : 0, conditional: !!r.criterion };
  }).sort((a, b) => b.max - a.max || a.monster.localeCompare(b.monster, 'fr')).slice(0, 3);
  return (id: number): IngredientSource => {
    const g = gatheredBy.get(id);
    if (g) return { kind: 'gathered', jobId: g.job_id, jobName: g.name, levelMin: g.lv };
    const c = craftedBy.get(id);
    return c ? { kind: 'crafted', jobId: c.job_id, jobName: c.name, level: c.lv } : { kind: 'other', drops: drops(id) };
  };
}

const loadJobsFrom = (db: import('node:sqlite').DatabaseSync) => (db.prepare(`SELECT j.id, j.name, j.kind, j.icon_id iconId,
    (SELECT COUNT(DISTINCT item_id) FROM gather_skill g WHERE g.job_id = j.id) resources,
    (SELECT COUNT(*) FROM recipe r WHERE r.job_id = j.id) recipes FROM job j`).all() as Record<string, any>[])
  .map((j) => ({ ...j, slug: jobSlug(j.name) })) as JobSummary[];

