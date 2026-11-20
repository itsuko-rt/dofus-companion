// "What to do at my level": the game's own activity suggestions, the zones of the Monde des Douze whose monsters
// match a level (base XP per monster, drops), and dungeons. All values come from the game files. There are no prices,
// no XP per hour and no kamas estimates: they are not in the data.
// Types and the pure level filter, shared by the server loader (src/zones.ts) and the browser.
export interface Activity { id: number; name: string; description: string | null; category: string; level: number; zone: string | null }
/** xpMin/xpMax: base XP over the grades that have one; null when the data sets none (shown as unknown, never as 0) */
export interface ZoneMonster { id: number; name: string; lmin: number; lmax: number; xpMin: number | null; xpMax: number | null }
export interface Zone { id: number; name: string; area: string | null; monsters: ZoneMonster[]; harvest: string[] }
/** uses: how many recipes of the game take this item as an ingredient (craft demand from game data, not a price) */
export interface Drop { item: string; min: number; max: number; uses: number }
export interface Dungeon { id: number; name: string; minLevel: number; optimalLevel: number; bosses: string[] }
export interface ZoneData { version: string; activities: Activity[]; zones: Zone[]; drops: Record<number, Drop[]>; dungeons: Dungeon[] }

/** Everything within `band` levels of `level`: suggestions by category, the zones with the most matching monsters, dungeons. */
export function forLevel(data: ZoneData, level: number, band: number) {
  const near = (l: number) => Math.abs(l - level) <= band;
  const byCategory = new Map<string, Activity[]>();
  for (const a of data.activities.filter((a) => near(a.level)).sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level) || a.level - b.level)) {
    byCategory.set(a.category, [...(byCategory.get(a.category) ?? []), a]);
  }
  const zones = data.zones.map((z) => {
    const monsters = z.monsters.filter((m) => m.lmax >= level - band && m.lmin <= level + band).sort((a, b) => a.lmin - b.lmin);
    const loot = new Map<string, Drop>();
    for (const m of monsters) for (const d of data.drops[m.id] ?? []) if (!loot.has(d.item) || loot.get(d.item)!.max < d.max) loot.set(d.item, d);
    return { ...z, monsters, loot: [...loot.values()].sort((a, b) => b.max - a.max).slice(0, 8) };
  }).filter((z) => z.monsters.length >= 2)
    .sort((a, b) => b.monsters.length - a.monsters.length || a.name.localeCompare(b.name, 'fr')).slice(0, 12);
  // resources of those zones that crafters need most: the number of recipes using them (no price exists in the data)
  const demand = new Map<string, { item: string; uses: number; zones: string[]; max: number }>();
  for (const z of zones) for (const m of z.monsters) for (const d of data.drops[m.id] ?? []) {
    if (!d.uses) continue;
    const cur = demand.get(d.item) ?? { item: d.item, uses: d.uses, zones: [], max: 0 };
    if (!cur.zones.includes(z.name)) cur.zones.push(z.name);
    cur.max = Math.max(cur.max, d.max);
    demand.set(d.item, cur);
  }
  const wanted = [...demand.values()].sort((a, b) => b.uses - a.uses || b.max - a.max).slice(0, 10);
  const dungeons = data.dungeons.filter((d) => near(d.optimalLevel) || (d.minLevel <= level && level <= d.optimalLevel));
  return { byCategory, zones, dungeons, wanted };
}
