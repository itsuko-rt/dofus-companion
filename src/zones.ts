// Server-side loader of the level page data (game database). Types and the level filter: src/zones-shared.ts.
import { withDb } from './load.ts';
import type { Activity, Dungeon, Drop, Zone, ZoneData, ZoneMonster } from './zones-shared.ts';
export * from './zones-shared.ts';

export const loadZoneData = (path: string) => withDb(path, (db): ZoneData | null => {
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'activity'").get()) return null; // creatures import not run
  const all = <T>(sql: string) => (db.prepare(sql).all() as Record<string, any>[]).map((r) => ({ ...r })) as T[];
  const version = (db.prepare('SELECT id FROM game_version').get() as { id: string }).id;
  const activities = all<Activity>(`SELECT a.id, a.name, a.description, a.category, a.level, s.name zone
    FROM activity a LEFT JOIN world_subarea s ON s.id = a.subarea_id ORDER BY a.level, a.name`);
  const itemName = new Map(all<{ id: number; name: string }>('SELECT id, name FROM item').map((i) => [i.id, i.name]));
  const monsters = new Map<number, ZoneMonster>();
  for (const m of all<ZoneMonster>(`SELECT m.id, m.name, MIN(g.level) lmin, MAX(g.level) lmax, MIN(g.xp) xpMin, MAX(g.xp) xpMax
    FROM monster m JOIN monster_grade g ON g.monster_id = m.id GROUP BY m.id`)) monsters.set(m.id, m);
  const zones = all<{ id: number; name: string; area: string | null; harvestables: string | null }>(`SELECT s.id, s.name, a.name area, s.harvestables
    FROM world_subarea s LEFT JOIN world_area a ON a.id = s.area_id WHERE s.world_map = 1 ORDER BY s.name`);
  const inZone = new Map<number, number[]>();
  for (const r of all<{ m: number; s: number }>('SELECT monster_id m, subarea_id s FROM monster_subarea')) inZone.set(r.s, [...(inZone.get(r.s) ?? []), r.m]);
  const used = new Set<number>();
  const zoneList: Zone[] = zones.map((z) => {
    const ms = (inZone.get(z.id) ?? []).map((id) => monsters.get(id)).filter((m): m is ZoneMonster => !!m);
    ms.forEach((m) => used.add(m.id));
    return { id: z.id, name: z.name, area: z.area, monsters: ms, harvest: (JSON.parse(z.harvestables ?? '[]') as number[]).map((i) => itemName.get(i)).filter((n): n is string => !!n) };
  }).filter((z) => z.monsters.length);
  // best 3 drops per monster of those zones (base chance before prospection, lowest–highest grade); drops with a game
  // condition (events such as Pwâk or Halouine, quests, level ranges) are left out: they are not what the zone gives every day
  const uses = new Map<number, number>();
  for (const r of all<{ ingredients: string }>('SELECT ingredients FROM recipe')) for (const [id] of JSON.parse(r.ingredients) as [number, number][]) uses.set(id, (uses.get(id) ?? 0) + 1);
  const drops: Record<number, Drop[]> = {};
  for (const d of all<{ m: number; i: number; chances: string }>("SELECT monster_id m, item_id i, chances FROM monster_drop WHERE criterion = ''")) {
    if (!used.has(d.m) || !itemName.has(d.i)) continue;
    const c = (JSON.parse(d.chances) as (number | null)[]).filter((x): x is number => x != null);
    if (!c.length) continue;
    (drops[d.m] ??= []).push({ item: itemName.get(d.i)!, min: Math.min(...c), max: Math.max(...c), uses: uses.get(d.i) ?? 0 });
  }
  for (const k of Object.keys(drops)) drops[+k] = drops[+k].sort((a, b) => b.max - a.max).slice(0, 3);
  const bosses = new Map<number, string[]>();
  for (const b of all<{ d: number; name: string }>('SELECT b.dungeon_id d, m.name FROM dungeon_boss b JOIN monster m ON m.id = b.monster_id')) bosses.set(b.d, [...(bosses.get(b.d) ?? []), b.name]);
  const dungeons = all<{ id: number; name: string; min_level: number; optimal_level: number }>('SELECT id, name, min_level, optimal_level FROM dungeon WHERE name IS NOT NULL ORDER BY optimal_level, name')
    .map((d) => ({ id: d.id, name: d.name, minLevel: d.min_level, optimalLevel: d.optimal_level, bosses: bosses.get(d.id) ?? [] }));
  return { version, activities, zones: zoneList, drops, dungeons };
});

