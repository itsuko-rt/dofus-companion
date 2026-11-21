// Encyclopaedia: monsters, items, dungeons, zones and sets from the game database, every sheet linked both ways
// (monster ↔ drops ↔ zones ↔ dungeons ↔ achievements ↔ quests; item ↔ recipe ↔ uses ↔ sources ↔ set).
// Only game values: drop rates are the game's base rates per monster grade; a condition on a drop is shown, never guessed.
import type { DatabaseSync } from 'node:sqlite';
import { readdirSync } from 'node:fs';
import { dofusSlugs, foldText, withDb } from './load.ts';
import { objectiveTargets } from './objective-targets.ts';
import { regionSlugMap } from './regions.ts';
import { slugify } from './site.ts';
import { NOT_REGULAR } from './zones.ts';
import { encyHref, type EncyKind, type SearchEntry } from './encyclopedia-shared.ts';

export * from './encyclopedia-shared.ts';

const rows = <T>(db: DatabaseSync, sql: string, ...args: (number | string)[]) => db.prepare(sql).all(...args) as T[];
const row = <T>(db: DatabaseSync, sql: string, ...args: (number | string)[]) => db.prepare(sql).get(...args) as T | undefined;
const json = <T>(s: string | null | undefined, fallback: T): T => { try { return s ? JSON.parse(s) as T : fallback; } catch { return fallback; } };
/** "31-bouftou" → 31 */
export const idFromParam = (p: string) => { const n = Number.parseInt(p, 10); return Number.isInteger(n) && n > 0 ? n : null; };

// ---- index, built once per database file -------------------------------------------------------------------------
interface Index {
  search: (SearchEntry & { folded: string; minor?: boolean })[];
  questHref: Map<number, { name: string; level: number | null; href: string }>;
  questsByMonster: Map<string, number[]>;
  questsByItem: Map<string, number[]>;
  usedIn: Map<number, number[]>;              // ingredient item id → crafted item ids
  harvestedIn: Map<number, number[]>;         // resource item id → zone ids
  keyOf: Map<number, number[]>;               // item id → dungeons it opens
  achievementsByName: Map<string, number[]>;  // objective text (monster, zone, dungeon name) → achievement ids
}
const indexes = new Map<string, Index>();
function index(db: DatabaseSync, path: string): Index {
  const hit = indexes.get(path);
  if (hit) return hit;
  const push = <K, V>(m: Map<K, V[]>, k: K, v: V) => { const l = m.get(k); if (!l) m.set(k, [v]); else if (!l.includes(v)) l.push(v); };
  const search: Index['search'] = [];
  const add = (e: SearchEntry, minor = false) => search.push({ ...e, folded: foldText(e.name), minor });
  for (const m of rows<{ id: number; name: string; race: string | null; lo: number | null; hi: number | null }>(db,
    'SELECT m.id, m.name, m.race, MIN(g.level) lo, MAX(g.level) hi FROM monster m LEFT JOIN monster_grade g ON g.monster_id = m.id WHERE m.name IS NOT NULL GROUP BY m.id')) {
    add({ kind: 'monster', id: m.id, name: m.name, sub: [m.race, m.lo != null ? (m.lo === m.hi ? `niv. ${m.lo}` : `niv. ${m.lo}–${m.hi}`) : null].filter(Boolean).join(' · '), level: m.lo, href: encyHref('monster', m.id, m.name) }, NOT_REGULAR.test(m.race ?? ''));
  }
  for (const i of rows<{ id: number; name: string; type: string | null; level: number | null }>(db, 'SELECT i.id, i.name, t.name type, i.level FROM item i LEFT JOIN item_type t ON t.id = i.type_id WHERE i.name IS NOT NULL')) {
    add({ kind: 'item', id: i.id, name: i.name, sub: [i.type, i.level ? `niv. ${i.level}` : null].filter(Boolean).join(' · '), level: i.level, href: encyHref('item', i.id, i.name) });
  }
  for (const d of rows<{ id: number; name: string; level: number | null }>(db, 'SELECT id, name, optimal_level level FROM dungeon WHERE name IS NOT NULL')) {
    add({ kind: 'dungeon', id: d.id, name: d.name, sub: `Donjon${d.level ? ` · niv. ${d.level}` : ''}`, level: d.level, href: encyHref('dungeon', d.id, d.name) });
  }
  for (const z of rows<{ id: number; name: string; area: string | null; level: number | null }>(db, 'SELECT s.id, s.name, a.name area, s.level FROM world_subarea s LEFT JOIN world_area a ON a.id = s.area_id WHERE s.name IS NOT NULL')) {
    add({ kind: 'zone', id: z.id, name: z.name, sub: ['Zone', z.area, z.level ? `niv. ${z.level}` : null].filter(Boolean).join(' · '), level: z.level, href: encyHref('zone', z.id, z.name) });
  }
  for (const s of rows<{ id: number; name: string }>(db, 'SELECT id, name FROM item_set WHERE name IS NOT NULL')) {
    add({ kind: 'set', id: s.id, name: s.name, sub: 'Panoplie', level: null, href: encyHref('set', s.id, s.name) });
  }

  const slugs = regionSlugMap(rows<{ id: number; name: string }>(db, 'SELECT id, name FROM quest_category'));
  const questHref = new Map<number, { name: string; level: number | null; href: string }>();
  for (const q of rows<{ id: number; name: string; category_id: number; level: number | null }>(db,
    'SELECT q.id, q.name, q.category_id, MIN(s.optimal_level) level FROM quest q LEFT JOIN quest_step s ON s.quest_id = q.id GROUP BY q.id')) {
    questHref.set(q.id, { name: q.name, level: q.level || null, href: `/progression/quetes/${slugs.get(q.category_id) ?? q.category_id}#quest:${q.id}` });
  }
  const questsByMonster = new Map<string, number[]>(), questsByItem = new Map<string, number[]>();
  for (const s of rows<{ quest_id: number; objectives: string | null }>(db, 'SELECT quest_id, objectives FROM quest_step')) {
    for (const o of json<string[]>(s.objectives, [])) {
      const t = objectiveTargets(o);
      if (t.monster) push(questsByMonster, t.monster, s.quest_id);
      else if (t.item) push(questsByItem, t.item, s.quest_id);
    }
  }
  const usedIn = new Map<number, number[]>();
  for (const r of rows<{ result_id: number; ingredients: string }>(db, 'SELECT result_id, ingredients FROM recipe')) {
    for (const [id] of json<[number, number][]>(r.ingredients, [])) push(usedIn, id, r.result_id);
  }
  const harvestedIn = new Map<number, number[]>();
  for (const z of rows<{ id: number; harvestables: string | null }>(db, 'SELECT id, harvestables FROM world_subarea')) {
    for (const id of json<number[]>(z.harvestables, [])) push(harvestedIn, id, z.id);
  }
  const keyOf = new Map<number, number[]>();
  for (const d of rows<{ id: number; required_objects: string | null }>(db, 'SELECT id, required_objects FROM dungeon')) {
    for (const o of json<{ id: number }[]>(d.required_objects, [])) push(keyOf, o.id, d.id);
  }
  const achievementsByName = new Map<string, number[]>();
  for (const o of rows<{ achievement_id: number; name: string }>(db, 'SELECT achievement_id, name FROM achievement_objective WHERE name IS NOT NULL')) push(achievementsByName, o.name, o.achievement_id);

  const idx = { search, questHref, questsByMonster, questsByItem, usedIn, harvestedIn, keyOf, achievementsByName };
  indexes.set(path, idx);
  return idx;
}

// ---- search ------------------------------------------------------------------------------------------------------
const KIND_RANK: Record<EncyKind, number> = { dungeon: 0, zone: 1, monster: 2, set: 3, item: 4 };
/** Every word must appear in the name (accents ignored). Exact names first, then names starting with the query, then by kind and level. */
export const searchEncyclopedia = (path: string, query: string, kinds?: EncyKind[], limit = 30) => withDb(path, (db): SearchEntry[] => {
  const q = foldText(query.trim());
  const words = q.split(/\s+/).filter((w) => w.length >= 2).slice(0, 6);
  if (!words.length) return [];
  const out = index(db, path).search.filter((e) => (!kinds || kinds.includes(e.kind)) && words.every((w) => e.folded.includes(w)));
  const rank = (e: { folded: string }) => (e.folded === q ? 0 : e.folded.startsWith(q) ? 1 : 2);
  // summons, quest and wanted monsters share names with the real ones: they come after them
  return out.sort((a, b) => rank(a) - rank(b) || Number(!!a.minor) - Number(!!b.minor) || KIND_RANK[a.kind] - KIND_RANK[b.kind] || (a.level ?? 0) - (b.level ?? 0) || a.name.localeCompare(b.name, 'fr'))
    .slice(0, limit).map(({ folded: _f, minor: _m, ...e }) => e);
});

// ---- shared bits -------------------------------------------------------------------------------------------------
export interface Ref { id: number; name: string; href: string; sub?: string }
export interface DropRow { item: Ref; type: string | null; rates: number[]; conditional: boolean }
export interface AchievementRef { id: number; name: string; level: number; points: number; category: number; href: string }
const achievementRefs = (db: DatabaseSync, ids: number[]): AchievementRef[] => !ids.length ? [] :
  rows<{ id: number; name: string; level: number; points: number; category_id: number; parent: number | null }>(db,
    `SELECT a.id, a.name, a.level, a.points, a.category_id, c.parent_id parent FROM achievement a LEFT JOIN achievement_category c ON c.id = a.category_id
     WHERE a.id IN (${ids.map(() => '?').join(',')}) ORDER BY a.level, a.name`, ...ids)
    .map((a) => ({ id: a.id, name: a.name, level: a.level, points: a.points, category: a.category_id,
      href: `/progression/succes?c=${a.parent ?? a.category_id}${a.parent ? `&s=${a.category_id}` : ''}&a=${a.id}` }));
const quests = (idx: Index, ids: number[] = []) => ids.map((id) => ({ id, ...idx.questHref.get(id)! })).filter((q) => q.name)
  .sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
const zoneRef = (z: { id: number; name: string; area: string | null; level: number | null }): Ref =>
  ({ id: z.id, name: z.name, href: encyHref('zone', z.id, z.name), sub: [z.area, z.level ? `niv. ${z.level}` : null].filter(Boolean).join(' · ') });
const rates = (s: string) => json<(number | null)[]>(s, []).filter((x): x is number => x != null);

// ---- monster -----------------------------------------------------------------------------------------------------
export interface MonsterSheet {
  id: number; name: string; race: string | null; regular: boolean;
  grades: { grade: number; level: number | null; xp: number | null; life: number | null }[];
  zones: Ref[]; drops: DropRow[]; bossOf: Ref[];
  quests: { id: number; name: string; level: number | null; href: string }[]; achievements: AchievementRef[];
}
export const loadMonster = (path: string, id: number) => withDb(path, (db): MonsterSheet | null => {
  const m = row<{ id: number; name: string; race: string | null }>(db, 'SELECT id, name, race FROM monster WHERE id = ?', id);
  if (!m) return null;
  const idx = index(db, path);
  const bossOf = rows<{ id: number; name: string; level: number | null }>(db,
    'SELECT d.id, d.name, d.optimal_level level FROM dungeon_boss b JOIN dungeon d ON d.id = b.dungeon_id WHERE b.monster_id = ? ORDER BY d.optimal_level', id);
  // achievements naming the monster in an objective, and those of the dungeons it guards
  const ach = new Set(idx.achievementsByName.get(m.name) ?? []);
  for (const d of bossOf) for (const r of rows<{ a: number }>(db, 'SELECT achievement_id a FROM dungeon_achievement WHERE dungeon_id = ?', d.id)) ach.add(r.a);
  return {
    id: m.id, name: m.name, race: m.race, regular: !NOT_REGULAR.test(m.race ?? ''),
    grades: rows<{ grade: number; level: number | null; xp: number | null; life: number | null }>(db, 'SELECT grade, level, xp, life FROM monster_grade WHERE monster_id = ? ORDER BY grade', id),
    zones: rows<{ id: number; name: string; area: string | null; level: number | null }>(db,
      'SELECT s.id, s.name, a.name area, s.level FROM monster_subarea ms JOIN world_subarea s ON s.id = ms.subarea_id LEFT JOIN world_area a ON a.id = s.area_id WHERE ms.monster_id = ? ORDER BY s.level, s.name', id).map(zoneRef),
    drops: rows<{ item_id: number; name: string | null; type: string | null; chances: string; criterion: string | null }>(db,
      `SELECT d.item_id, i.name, t.name type, d.chances, d.criterion FROM monster_drop d LEFT JOIN item i ON i.id = d.item_id LEFT JOIN item_type t ON t.id = i.type_id
       WHERE d.monster_id = ?`, id)
      .filter((d) => d.name)
      .map((d) => ({ item: { id: d.item_id, name: d.name!, href: encyHref('item', d.item_id, d.name!) }, type: d.type, rates: rates(d.chances), conditional: !!d.criterion }))
      .sort((a, b) => Number(a.conditional) - Number(b.conditional) || Math.max(...b.rates, 0) - Math.max(...a.rates, 0)),
    bossOf: bossOf.map((d) => ({ id: d.id, name: d.name, href: encyHref('dungeon', d.id, d.name), sub: d.level ? `niv. ${d.level}` : undefined })),
    quests: quests(idx, idx.questsByMonster.get(m.name)),
    achievements: achievementRefs(db, [...ach]),
  };
});

// item icons copied locally (scripts/fetch-assets.ts); others are not requested at all (no 404 per sheet)
let localIcons: Set<number> | null = null;
const hasIcon = (id: number | null) => {
  if (id == null) return false;
  if (!localIcons) {
    try { localIcons = new Set(readdirSync(/*turbopackIgnore: true*/ 'public/ankama/items').map((f) => Number.parseInt(f, 10)).filter(Number.isInteger)); }
    catch { localIcons = new Set(); }
  }
  return localIcons.has(id);
};

// ---- item --------------------------------------------------------------------------------------------------------
export interface ItemSheet {
  id: number; name: string; type: string | null; level: number | null; iconId: number | null;
  effects: string[]; set: Ref | null;
  recipe: { job: string | null; jobSlug: string | null; level: number; ingredients: (Ref & { qty: number })[] } | null;
  usedIn: (Ref & { level: number | null })[]; droppedBy: { monster: Ref; rates: number[]; conditional: boolean }[];
  harvestedIn: Ref[]; opens: Ref[]; quests: { id: number; name: string; level: number | null; href: string }[];
  dofusGuide: string | null;
}
export const loadItem = (path: string, id: number) => withDb(path, (db): ItemSheet | null => {
  const i = row<{ id: number; name: string; type: string | null; level: number | null; icon_id: number | null; set_id: number | null; effects: string | null }>(db,
    'SELECT i.id, i.name, t.name type, i.level, i.icon_id, i.set_id, i.effects FROM item i LEFT JOIN item_type t ON t.id = i.type_id WHERE i.id = ?', id);
  if (!i?.name) return null;
  const idx = index(db, path);
  const names = (ids: number[]) => !ids.length ? new Map<number, { name: string; level: number | null }>() : new Map(rows<{ id: number; name: string; level: number | null }>(db,
    `SELECT id, name, level FROM item WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids).map((r) => [r.id, r]));
  const set = i.set_id ? row<{ id: number; name: string }>(db, 'SELECT id, name FROM item_set WHERE id = ?', i.set_id) : undefined;
  const r = row<{ job: string | null; level: number; ingredients: string }>(db,
    'SELECT j.name job, r.level, r.ingredients FROM recipe r LEFT JOIN job j ON j.id = r.job_id WHERE r.result_id = ? ORDER BY r.level LIMIT 1', id);
  const ing = r ? json<[number, number][]>(r.ingredients, []) : [];
  const ingNames = names(ing.map(([x]) => x));
  const used = (idx.usedIn.get(id) ?? []).slice(0, 200);
  const usedNames = names(used);
  const zones = idx.harvestedIn.get(id) ?? [];
  const dofus = i.type === 'Dofus' ? dofusSlugs(rows<{ itemId: number; name: string }>(db, 'SELECT item_id itemId, name FROM dofus')).get(id) ?? null : null;
  return {
    id: i.id, name: i.name, type: i.type, level: i.level || null, iconId: hasIcon(i.icon_id) ? i.icon_id : null,
    effects: json<{ text?: string }[]>(i.effects, []).map((e) => e.text).filter((t): t is string => !!t),
    set: set ? { id: set.id, name: set.name, href: encyHref('set', set.id, set.name) } : null,
    recipe: r ? { job: r.job, jobSlug: r.job ? slugify(r.job) : null, level: r.level,
      ingredients: ing.map(([x, qty]) => { const n = ingNames.get(x)?.name ?? `Objet n°${x}`; return { id: x, name: n, qty, href: encyHref('item', x, n) }; }) } : null,
    usedIn: used.map((x) => { const n = usedNames.get(x); return n ? { id: x, name: n.name, level: n.level, href: encyHref('item', x, n.name) } : null; })
      .filter((x): x is Ref & { level: number | null } => !!x).sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.name.localeCompare(b.name, 'fr')),
    droppedBy: rows<{ id: number; name: string; chances: string; criterion: string | null }>(db,
      'SELECT m.id, m.name, d.chances, d.criterion FROM monster_drop d JOIN monster m ON m.id = d.monster_id WHERE d.item_id = ?', id)
      .map((d) => ({ monster: { id: d.id, name: d.name, href: encyHref('monster', d.id, d.name) }, rates: rates(d.chances), conditional: !!d.criterion }))
      .sort((a, b) => Number(a.conditional) - Number(b.conditional) || Math.max(...b.rates, 0) - Math.max(...a.rates, 0)),
    harvestedIn: !zones.length ? [] : rows<{ id: number; name: string; area: string | null; level: number | null }>(db,
      `SELECT s.id, s.name, a.name area, s.level FROM world_subarea s LEFT JOIN world_area a ON a.id = s.area_id WHERE s.id IN (${zones.map(() => '?').join(',')}) ORDER BY s.level, s.name`, ...zones).map(zoneRef),
    opens: (idx.keyOf.get(id) ?? []).map((d) => row<{ id: number; name: string }>(db, 'SELECT id, name FROM dungeon WHERE id = ?', d)!)
      .filter((d) => d?.name).map((d) => ({ id: d.id, name: d.name, href: encyHref('dungeon', d.id, d.name) })),
    quests: quests(idx, idx.questsByItem.get(i.name)),
    dofusGuide: dofus ? `/guides/dofus/${dofus}` : null,
  };
});

// ---- dungeon -----------------------------------------------------------------------------------------------------
export interface DungeonSheet {
  id: number; name: string; minLevel: number | null; level: number | null;
  bosses: (Ref & { level: string | null })[]; keys: (Ref & { qty: number })[]; zone: Ref | null; monsters: Ref[];
  achievements: AchievementRef[];
}
export const loadDungeon = (path: string, id: number) => withDb(path, (db): DungeonSheet | null => {
  const d = row<{ id: number; name: string; min_level: number | null; optimal_level: number | null; required_objects: string | null }>(db,
    'SELECT id, name, min_level, optimal_level, required_objects FROM dungeon WHERE id = ?', id);
  if (!d?.name) return null;
  const keys = json<{ id: number; quantity: number }[]>(d.required_objects, []);
  // the dungeon's own zone, when the game has a sub-area of the same name: its monsters are the dungeon's rooms
  const zone = row<{ id: number; name: string; area: string | null; level: number | null }>(db,
    'SELECT s.id, s.name, a.name area, s.level FROM world_subarea s LEFT JOIN world_area a ON a.id = s.area_id WHERE s.name = ? LIMIT 1', d.name);
  const bosses = rows<{ id: number; name: string; lo: number | null; hi: number | null }>(db,
    `SELECT m.id, m.name, MIN(g.level) lo, MAX(g.level) hi FROM dungeon_boss b JOIN monster m ON m.id = b.monster_id
     LEFT JOIN monster_grade g ON g.monster_id = m.id WHERE b.dungeon_id = ? GROUP BY m.id ORDER BY m.name`, id);
  const bossIds = new Set(bosses.map((b) => b.id));
  return {
    id: d.id, name: d.name, minLevel: d.min_level || null, level: d.optimal_level || null,
    bosses: bosses.map((b) => ({ id: b.id, name: b.name, href: encyHref('monster', b.id, b.name), level: b.lo == null ? null : b.lo === b.hi ? `niv. ${b.lo}` : `niv. ${b.lo}–${b.hi}` })),
    keys: keys.map((k) => { const n = row<{ name: string }>(db, 'SELECT name FROM item WHERE id = ?', k.id)?.name ?? `Objet n°${k.id}`; return { id: k.id, name: n, qty: k.quantity, href: encyHref('item', k.id, n) }; }),
    zone: zone ? zoneRef(zone) : null,
    monsters: !zone ? [] : rows<{ id: number; name: string; race: string | null }>(db,
      'SELECT m.id, m.name, m.race FROM monster_subarea ms JOIN monster m ON m.id = ms.monster_id WHERE ms.subarea_id = ? ORDER BY m.name', zone.id)
      .filter((m) => !bossIds.has(m.id)).map((m) => ({ id: m.id, name: m.name, href: encyHref('monster', m.id, m.name), sub: m.race ?? undefined })),
    achievements: achievementRefs(db, rows<{ a: number }>(db, 'SELECT achievement_id a FROM dungeon_achievement WHERE dungeon_id = ?', id).map((r) => r.a)),
  };
});

// ---- zone --------------------------------------------------------------------------------------------------------
export interface ZoneSheet {
  id: number; name: string; area: string | null; level: number | null; zaap: [number, number] | null;
  monsters: (Ref & { regular: boolean })[]; resources: Ref[]; dungeons: Ref[]; achievements: AchievementRef[];
}
export const loadZone = (path: string, id: number) => withDb(path, (db): ZoneSheet | null => {
  const z = row<{ id: number; name: string; area: string | null; level: number | null; zaap_x: number | null; zaap_y: number | null; harvestables: string | null }>(db,
    'SELECT s.id, s.name, a.name area, s.level, s.zaap_x, s.zaap_y, s.harvestables FROM world_subarea s LEFT JOIN world_area a ON a.id = s.area_id WHERE s.id = ?', id);
  if (!z?.name) return null;
  const idx = index(db, path);
  const res = json<number[]>(z.harvestables, []);
  const monsters = rows<{ id: number; name: string; race: string | null; lo: number | null; hi: number | null }>(db,
    `SELECT m.id, m.name, m.race, MIN(g.level) lo, MAX(g.level) hi FROM monster_subarea ms JOIN monster m ON m.id = ms.monster_id
     LEFT JOIN monster_grade g ON g.monster_id = m.id WHERE ms.subarea_id = ? GROUP BY m.id ORDER BY lo, m.name`, id);
  // dungeons whose boss lives here, or whose name is this zone's
  const dungeons = rows<{ id: number; name: string; level: number | null }>(db,
    `SELECT DISTINCT d.id, d.name, d.optimal_level level FROM dungeon d LEFT JOIN dungeon_boss b ON b.dungeon_id = d.id
     WHERE d.name = ? OR b.monster_id IN (SELECT monster_id FROM monster_subarea WHERE subarea_id = ?) ORDER BY d.optimal_level`, z.name, id);
  return {
    id: z.id, name: z.name, area: z.area, level: z.level || null, zaap: z.zaap_x != null && z.zaap_y != null ? [z.zaap_x, z.zaap_y] : null,
    monsters: monsters.map((m) => ({ id: m.id, name: m.name, href: encyHref('monster', m.id, m.name), regular: !NOT_REGULAR.test(m.race ?? ''),
      sub: [m.race, m.lo == null ? null : m.lo === m.hi ? `niv. ${m.lo}` : `niv. ${m.lo}–${m.hi}`].filter(Boolean).join(' · ') })),
    resources: !res.length ? [] : rows<{ id: number; name: string; type: string | null }>(db,
      `SELECT i.id, i.name, t.name type FROM item i LEFT JOIN item_type t ON t.id = i.type_id WHERE i.id IN (${res.map(() => '?').join(',')}) ORDER BY t.name, i.name`, ...res)
      .map((r) => ({ id: r.id, name: r.name, href: encyHref('item', r.id, r.name), sub: r.type ?? undefined })),
    dungeons: dungeons.map((d) => ({ id: d.id, name: d.name, href: encyHref('dungeon', d.id, d.name), sub: d.level ? `niv. ${d.level}` : undefined })),
    achievements: achievementRefs(db, idx.achievementsByName.get(z.name) ?? []),
  };
});

// ---- set ---------------------------------------------------------------------------------------------------------
export interface SetSheet { id: number; name: string; items: (Ref & { level: number | null; type: string | null })[]; bonuses: { count: number; effects: string[] }[] }
export const loadSet = (path: string, id: number) => withDb(path, (db): SetSheet | null => {
  const s = row<{ id: number; name: string; item_ids: string; bonuses: string }>(db, 'SELECT id, name, item_ids, bonuses FROM item_set WHERE id = ?', id);
  if (!s?.name) return null;
  const ids = json<number[]>(s.item_ids, []);
  return {
    id: s.id, name: s.name,
    items: !ids.length ? [] : rows<{ id: number; name: string; level: number | null; type: string | null }>(db,
      `SELECT i.id, i.name, i.level, t.name type FROM item i LEFT JOIN item_type t ON t.id = i.type_id WHERE i.id IN (${ids.map(() => '?').join(',')}) ORDER BY i.level, i.name`, ...ids)
      .map((i) => ({ ...i, href: encyHref('item', i.id, i.name) })),
    // bonuses[n] applies with n + 1 items worn (index 0, one item, is empty in the game data)
    bonuses: json<{ text?: string }[][]>(s.bonuses, []).map((b, n) => ({ count: n + 1, effects: b.map((e) => e.text).filter((t): t is string => !!t) })).filter((b) => b.effects.length),
  };
});

// ---- browse lists for the index page -----------------------------------------------------------------------------
export const loadBrowse = (path: string) => withDb(path, (db) => ({
  dungeons: rows<{ id: number; name: string; level: number | null }>(db, 'SELECT id, name, optimal_level level FROM dungeon WHERE name IS NOT NULL ORDER BY optimal_level, name')
    .map((d) => ({ ...d, href: encyHref('dungeon', d.id, d.name) })),
  areas: Object.entries(rows<{ id: number; name: string; area: string | null; level: number | null }>(db,
    'SELECT s.id, s.name, a.name area, s.level FROM world_subarea s LEFT JOIN world_area a ON a.id = s.area_id WHERE s.name IS NOT NULL ORDER BY a.name, s.level, s.name')
    .reduce<Record<string, { id: number; name: string; level: number | null; href: string }[]>>((m, z) => {
      (m[z.area ?? 'Autres'] ??= []).push({ id: z.id, name: z.name, level: z.level, href: encyHref('zone', z.id, z.name) });
      return m;
    }, {})),
  counts: row<Record<string, number>>(db, `SELECT (SELECT COUNT(*) FROM item) items, (SELECT COUNT(*) FROM monster) monsters, (SELECT COUNT(*) FROM dungeon) dungeons,
    (SELECT COUNT(*) FROM world_subarea) zones, (SELECT COUNT(*) FROM item_set) sets`)!,
}));
