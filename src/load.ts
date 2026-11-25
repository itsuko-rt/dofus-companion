import { DatabaseSync } from 'node:sqlite';
import { readdirSync } from 'node:fs';
import { Graph, type GEdge, type NodeInput } from './graph.ts';
import type { RenderedEffect } from './effects.ts';
import type { Item, ItemSet } from './stats.ts';
import { objectiveTargets } from './objective-targets.ts';
import { classAchievements, classQuests } from './class-quests.ts';
import { regionSlugMap } from './regions.ts';
import type { AlmanaxEntry } from './almanax-shared.ts';
import { itemSources } from './professions.ts';
import { slugify } from './site.ts';
import type { IngredientSource } from './professions-shared.ts';

/** Latest data/game-<version>.sqlite, or null if the import has not run. */
export function latestDb(dir = 'data'): string | null {
  let files: string[];
  // the graph route is prerendered at build time: nothing here needs tracing into the deployment
  try { files = readdirSync(/*turbopackIgnore: true*/ dir); } catch { return null; }
  const dbs = files.filter((f) => /^game-[\d.]+\.sqlite$/.test(f))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  return dbs.length ? `${dir}/${dbs.at(-1)}` : null;
}

export interface GraphData {
  version: string;
  categories: { id: number; name: string }[];
  nodes: NodeInput[];
  extraEdges: GEdge[];
  /** quest:… node ids whose rewards include a Dofus (directly) */
  dofusQuests: string[];
}

/** Everything the graph needs, as plain JSON (also what the UI downloads). */
export function loadGraphData(path: string): GraphData {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    const plain = <T>(rows: unknown[]) => rows.map((r) => ({ ...(r as object) })) as T[];
    const version = (db.prepare('SELECT id FROM game_version').get() as { id: string }).id;
    const categories = plain<{ id: number; name: string }>(db.prepare(
      'SELECT id, name FROM quest_category ORDER BY sort_order',
    ).all());
    const nodes = plain<NodeInput>(db.prepare(`
      SELECT n.id, n.kind, n.ref_id AS refId, n.label, n.criterion, n.points,
             COALESCE(q.level_min, a.level, d.optimal_level) AS level,
             COALESCE(q.category_id, a.category_id) AS category
      FROM node n
      LEFT JOIN quest q ON n.kind = 'quest' AND q.id = n.ref_id
      LEFT JOIN achievement a ON n.kind = 'achievement' AND a.id = n.ref_id
      LEFT JOIN dungeon d ON n.kind = 'dungeon' AND d.id = n.ref_id
      WHERE n.kind != 'gate'`).all());
    const extraEdges = plain<GEdge>(db.prepare(
      "SELECT from_node AS \"from\", to_node AS \"to\", kind FROM edge WHERE kind = 'in_dungeon'",
    ).all());
    const dofusQuests = [...new Set((db.prepare('SELECT quest_ids FROM dofus').all() as { quest_ids: string }[])
      .flatMap((r) => (JSON.parse(r.quest_ids) as number[]).map((id) => `quest:${id}`)))];
    return { version, categories, nodes, extraEdges, dofusQuests };
  } finally {
    db.close();
  }
}

export interface SpellLevel {
  grade: number; minLevel: number; ap: number; minRange: number; range: number; crit: number;
  perTurn: number; perTarget: number; interval: number; initialCooldown: number;
  effects: RenderedEffect[]; criticalEffects: RenderedEffect[];
}
/** Game UI markup in texts: "{{ui,…::Fin de tour}}" → "Fin de tour", "<sprite name=\"PA\">PA" → "PA", bare "{{…}}" dropped. */
export const cleanGameText = (t: string | null): string | null =>
  t == null ? null : t.replace(/\{\{[^{}]*?::([^{}]*)\}\}/g, '$1').replace(/\{\{[^{}]*\}\}/g, '').replace(/<[^>]+>/g, '').replace(/[ \t]{2,}/g, ' ');

export interface SpellInfo { id: number; slot: number; variant: number; name: string; description: string | null; levels: SpellLevel[] }
export interface ClassData { version: string; breed: { id: number; name: string }; spells: SpellInfo[] }

/** One class's spells, slot by slot, with their grades and French effect texts. */
export function loadClass(path: string, breedId: number): ClassData | null {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    const breed = db.prepare('SELECT id, name FROM breed WHERE id = ?').get(breedId) as { id: number; name: string } | undefined;
    if (!breed) return null;
    const version = (db.prepare('SELECT id FROM game_version').get() as { id: string }).id;
    const spells = (db.prepare(
      'SELECT id, slot, variant, name, description FROM spell WHERE breed_id = ? ORDER BY slot, variant',
    ).all(breedId) as unknown as Omit<SpellInfo, 'levels'>[]).map((s) => ({ ...s, description: cleanGameText(s.description), levels: [] as SpellLevel[] }));
    const byId = new Map(spells.map((s) => [s.id, s]));
    const levels = db.prepare(`
      SELECT l.* FROM spell_level l JOIN spell s ON s.id = l.spell_id
      WHERE s.breed_id = ? ORDER BY l.spell_id, l.grade`).all(breedId) as Record<string, any>[];
    for (const l of levels) {
      byId.get(l.spell_id)?.levels.push({
        grade: l.grade, minLevel: l.min_player_level, ap: l.ap_cost, minRange: l.min_range, range: l.range,
        crit: l.crit_chance, perTurn: l.max_cast_per_turn, perTarget: l.max_cast_per_target,
        interval: l.min_cast_interval, initialCooldown: l.initial_cooldown,
        effects: JSON.parse(l.effects), criticalEffects: JSON.parse(l.critical_effects),
      });
    }
    return { version, breed: { ...breed }, spells: spells.map((s) => ({ ...s })) };
  } finally {
    db.close();
  }
}

/** Items by id with their sets (all pieces' sets) and characteristic keywords/names. */
export function loadItems(path: string, ids: number[], max = 64) {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    const want = [...new Set(ids.filter(Number.isInteger))].slice(0, max);
    const items = new Map<number, Item>();
    if (want.length) {
      const rows = db.prepare(`
        SELECT i.id, i.name, i.type_id, t.name AS type_name, t.super_type_id, i.level, i.set_id, i.effects
        FROM item i LEFT JOIN item_type t ON t.id = i.type_id
        WHERE i.id IN (${want.map(() => '?').join(',')})`).all(...want) as Record<string, any>[];
      for (const r of rows) {
        items.set(r.id, { id: r.id, name: r.name, typeId: r.type_id, typeName: r.type_name, superTypeId: r.super_type_id, level: r.level, setId: r.set_id, effects: JSON.parse(r.effects) });
      }
    }
    const setIds = [...new Set([...items.values()].map((i) => i.setId).filter((x): x is number => x != null))];
    const sets = new Map<number, ItemSet>();
    if (setIds.length) {
      const rows = db.prepare(`SELECT id, name, item_ids, bonuses FROM item_set WHERE id IN (${setIds.map(() => '?').join(',')})`).all(...setIds) as Record<string, any>[];
      for (const r of rows) sets.set(r.id, { id: r.id, name: r.name, itemIds: JSON.parse(r.item_ids), bonuses: JSON.parse(r.bonuses) });
    }
    const chars = db.prepare('SELECT id, keyword, name FROM characteristic').all() as { id: number; keyword: string; name: string | null }[];
    return {
      items, sets,
      keywords: new Map(chars.map((c) => [c.id, c.keyword])),
      names: Object.fromEntries(chars.map((c) => [c.keyword, c.name ?? c.keyword])) as Record<string, string>,
    };
  } finally {
    db.close();
  }
}

export interface QuestReward { xp: boolean; kamas: boolean; items: { id: number; name: string | null; qty: number }[]; spells: string[]; emotes: number; titles: number; jobs: number }
export interface QuestDetails {
  id: number;
  start: { npc: string | null; zone: string | null };
  steps: { name: string | null; description: string | null; objectives: string[]; rewards: QuestReward[] }[];
  guides: { site: string; url: string; language: string; status: string; checkedAt: string }[];
  /** monsters and items named by the objectives (exact game names): where the monsters live, where the items come from */
  targets: { monsters: { name: string; zones: string[] }[]; items: { name: string; source: IngredientSource }[] };
}

export function loadQuestDetails(path: string, questId: number): QuestDetails | null {
  if (!Number.isInteger(questId)) return null;
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    if (!db.prepare('SELECT 1 FROM quest WHERE id = ?').get(questId)) return null;
    const start = db.prepare('SELECT npc_name, subarea_name FROM quest_start WHERE quest_id = ?').get(questId) as { npc_name: string | null; subarea_name: string | null } | undefined;
    const steps = (db.prepare('SELECT name, description, objectives, rewards FROM quest_step WHERE quest_id = ? ORDER BY ordinal').all(questId) as Record<string, any>[])
      .map((s) => ({ name: s.name, description: cleanGameText(s.description), objectives: JSON.parse(s.objectives ?? '[]'), rewards: JSON.parse(s.rewards ?? '[]') }));
    const guides = (db.prepare('SELECT site, url, language, status, checked_at FROM external_guide WHERE quest_id = ?').all(questId) as Record<string, any>[])
      .map((g) => ({ site: g.site, url: g.url, language: g.language, status: g.status, checkedAt: g.checked_at }));
    return { id: questId, start: { npc: start?.npc_name ?? null, zone: start?.subarea_name ?? null }, steps, guides, targets: questTargets(db, steps.flatMap((s) => s.objectives as string[])) };
  } finally {
    db.close();
  }
}

function questTargets(db: DatabaseSync, objectives: string[]): QuestDetails['targets'] {
  const monsters: QuestDetails['targets']['monsters'] = [], items: QuestDetails['targets']['items'] = [];
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'monster_subarea'").get()) return { monsters, items }; // creatures import not run
  const zonesOf = db.prepare(`SELECT DISTINCT s.name FROM monster m JOIN monster_subarea ms ON ms.monster_id = m.id
    JOIN world_subarea s ON s.id = ms.subarea_id WHERE m.name = ? ORDER BY s.name`);
  const itemId = db.prepare('SELECT id FROM item WHERE name = ? ORDER BY id LIMIT 1');
  const source = itemSources(db);
  const seen = new Set<string>();
  for (const o of objectives) {
    const t = objectiveTargets(o);
    const key = t.monster ? `m:${t.monster}` : t.item ? `i:${t.item}` : null;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (t.monster) {
      const zones = (zonesOf.all(t.monster) as { name: string }[]).map((z) => z.name);
      if (zones.length) monsters.push({ name: t.monster, zones });
    } else if (t.item) {
      const id = (itemId.get(t.item) as { id: number } | undefined)?.id;
      if (id == null) continue;
      const s = source(id);
      if (s.kind !== 'other' || s.drops.length) items.push({ name: t.item, source: s });
    }
  }
  return { monsters, items };
}

export function withDb<T>(path: string, fn: (db: DatabaseSync) => T): T {
  const db = new DatabaseSync(path, { readOnly: true });
  try { return fn(db); } finally { db.close(); }
}
const plainRows = <T>(rows: unknown[]) => rows.map((r) => ({ ...(r as object) })) as T[];

export interface AchievementCategory { id: number; name: string; parentId: number | null; count: number }
export const loadAchievementCategories = (path: string) => withDb(path, (db) => plainRows<AchievementCategory>(db.prepare(`
  SELECT c.id, c.name, NULLIF(c.parent_id, 0) AS parentId, COUNT(a.id) AS count
  FROM achievement_category c LEFT JOIN achievement a ON a.category_id = c.id
  GROUP BY c.id ORDER BY c.parent_id, c.id`).all()));

export interface AchievementReward { xp: boolean; kamas: boolean; items: { id: number; name: string | null; qty: number }[]; titles: number; emotes: number; ornaments: number; spells: number }
export interface AchievementInfo {
  id: number; name: string; description: string | null; level: number; points: number; categoryId: number;
  objectives: { id: number; name: string | null; criterion: string; place?: ObjectivePlace }[];
  /** merged over the game's reward rows (some depend on level or class) */
  rewards: AchievementReward | null;
  guide: { site: string; url: string; checkedAt: string } | null;
  /** Dofus this achievement counts towards, with the slug of their guide page (/guides/dofus/<slug>) */
  dofus: { name: string; slug: string }[];
  /** dungeons the game ties to this achievement (dungeonsdata), with their recommended level */
  dungeons: { id: number; name: string; level: number }[];
}
/** What an objective's text names in the game data (exact name match): a monster (its level range and the zones it
 *  lives in), a zone (its region and level) or a dungeon (its optimal level). Several monsters or zones can share a
 *  name (variants, homonyms): their levels and zones are merged. */
export interface ObjectivePlace { kind: 'monster' | 'zone' | 'dungeon'; level: [number, number] | null; zones: string[]; /** encyclopaedia sheet: the first monster or zone of that name, or the dungeon */ id?: number }
const mergeRewards = (json: string | null): AchievementReward | null => {
  const rs = JSON.parse(json ?? '[]') as AchievementReward[];
  if (!rs.length) return null;
  const items = new Map<number, AchievementReward['items'][number]>();
  for (const r of rs) for (const it of r.items) items.set(it.id, it);
  const r: AchievementReward = {
    xp: rs.some((x) => x.xp), kamas: rs.some((x) => x.kamas), items: [...items.values()],
    titles: Math.max(...rs.map((x) => x.titles)), emotes: Math.max(...rs.map((x) => x.emotes)),
    ornaments: Math.max(...rs.map((x) => x.ornaments)), spells: Math.max(...rs.map((x) => x.spells)),
  };
  return r.xp || r.kamas || r.items.length || r.titles || r.emotes || r.ornaments || r.spells ? r : null;
};
/** Achievements of some categories (a category page), sorted by level. */
export const loadAchievements = (path: string, categoryIds: number[]) => withDb(path, (db) => {
  const ids = categoryIds.filter(Number.isInteger).slice(0, 50);
  if (!ids.length) return [];
  return buildAchievements(db, path, `SELECT id FROM achievement WHERE category_id IN (${ids.map(() => '?').join(',')})`, ids, 'level, name');
});

/** Achievements by id, in the order given (recommendations, search results). */
export const loadAchievementsByIds = (path: string, achievementIds: number[]) => withDb(path, (db) => {
  const ids = [...new Set(achievementIds.filter(Number.isInteger))].slice(0, 100);
  if (!ids.length) return [];
  const byId = new Map(buildAchievements(db, path, `SELECT id FROM achievement WHERE id IN (${ids.map(() => '?').join(',')})`, ids, 'id').map((a) => [a.id, a]));
  return ids.map((id) => byId.get(id)).filter((a): a is AchievementInfo => !!a);
});

// one query per table for the whole set (not one per achievement: Donjons has 743); `idsSql` selects the achievement ids
// names → places, built once per database file (≈ 5 k monsters, 1 k zones, 200 dungeons)
const placeIndexes = new Map<string, Map<string, ObjectivePlace>>();
function placeIndex(db: DatabaseSync, path: string) {
  let idx = placeIndexes.get(path);
  if (idx) return idx;
  idx = new Map();
  const range = (p: ObjectivePlace, lo: number | null, hi: number | null) => {
    if (lo == null || hi == null) return;
    p.level = p.level ? [Math.min(p.level[0], lo), Math.max(p.level[1], hi)] : [lo, hi];
  };
  const zones = new Map<string, ObjectivePlace>();
  for (const z of db.prepare('SELECT s.id, s.name, s.level, a.name area FROM world_subarea s LEFT JOIN world_area a ON a.id = s.area_id WHERE s.name IS NOT NULL ORDER BY s.id').all() as Record<string, any>[]) {
    const p = zones.get(z.name) ?? ({ kind: 'zone', level: null, zones: [], id: z.id } as ObjectivePlace);
    range(p, z.level || null, z.level || null);
    if (z.area && !p.zones.includes(z.area)) p.zones.push(z.area);
    zones.set(z.name, p);
  }
  const monsters = new Map<string, ObjectivePlace>();
  for (const m of db.prepare('SELECT m.id, m.name, MIN(g.level) lo, MAX(g.level) hi FROM monster m LEFT JOIN monster_grade g ON g.monster_id = m.id WHERE m.name IS NOT NULL GROUP BY m.id ORDER BY m.id').all() as Record<string, any>[]) {
    const p = monsters.get(m.name) ?? ({ kind: 'monster', level: null, zones: [], id: m.id } as ObjectivePlace);
    range(p, m.lo, m.hi);
    monsters.set(m.name, p);
  }
  for (const z of db.prepare('SELECT m.id, m.name, s.name zone FROM monster m JOIN monster_subarea ms ON ms.monster_id = m.id JOIN world_subarea s ON s.id = ms.subarea_id ORDER BY s.level, s.name').all() as Record<string, any>[]) {
    const p = monsters.get(z.name);
    if (!p) continue;
    if (!p.zones.length) p.id = z.id; // the sheet of the variant that actually lives somewhere
    if (z.zone && !p.zones.includes(z.zone)) p.zones.push(z.zone);
  }
  // a name shared by a dungeon and its boss or zone points to the dungeon; a monster wins over a homonymous zone
  for (const [k, v] of zones) idx.set(k, v);
  for (const [k, v] of monsters) idx.set(k, v);
  for (const d of db.prepare('SELECT id, name, optimal_level level FROM dungeon WHERE name IS NOT NULL').all() as Record<string, any>[]) {
    idx.set(d.name, { kind: 'dungeon', level: d.level ? [d.level, d.level] : null, zones: [], id: d.id });
  }
  placeIndexes.set(path, idx);
  return idx;
}

const baseSlug = (name: string) => slugify(name.replace(/^Dofus\s+/i, '')) || slugify(name);
/** item id → slug; the game has a few Dofus sharing a name (two "Dofus Cacao"…): those get their item id appended. */
export function dofusSlugs(list: { itemId: number; name: string }[]): Map<number, string> {
  const count = new Map<string, number>();
  for (const d of list) count.set(baseSlug(d.name), (count.get(baseSlug(d.name)) ?? 0) + 1);
  return new Map(list.map((d) => [d.itemId, count.get(baseSlug(d.name))! > 1 ? `${baseSlug(d.name)}-${d.itemId}` : baseSlug(d.name)]));
}

function buildAchievements(db: DatabaseSync, path: string, idsSql: string, args: number[], order: string): AchievementInfo[] {
  const places = placeIndex(db, path);
  const rows = db.prepare(`SELECT id, name, description, level, points, category_id, rewards FROM achievement WHERE id IN (${idsSql}) ORDER BY ${order}`).all(...args) as Record<string, any>[];
  const inSet = `IN (${idsSql})`;
  const objectives = new Map<number, { id: number; name: string; criterion: string }[]>();
  for (const o of db.prepare(`SELECT achievement_id, id, name, criterion_raw AS criterion FROM achievement_objective WHERE achievement_id ${inSet} ORDER BY achievement_id, ordinal`).all(...args) as Record<string, any>[]) {
    const list = objectives.get(o.achievement_id) ?? [];
    const place = o.name ? places.get(o.name) : undefined;
    list.push({ id: o.id, name: o.name, criterion: o.criterion, ...(place ? { place } : {}) });
    objectives.set(o.achievement_id, list);
  }
  const guides = new Map<number, Record<string, any>>();
  for (const g of db.prepare(`SELECT achievement_id, site, url, checked_at FROM achievement_guide WHERE achievement_id ${inSet}`).all(...args) as Record<string, any>[]) {
    if (!guides.has(g.achievement_id)) guides.set(g.achievement_id, g); // first row, like the former LIMIT 1
  }
  const dungeons = new Map<number, { id: number; name: string; level: number }[]>();
  for (const d of db.prepare(`SELECT da.achievement_id a, d.id, d.name, d.optimal_level level FROM dungeon_achievement da JOIN dungeon d ON d.id = da.dungeon_id
    WHERE d.name IS NOT NULL AND da.achievement_id ${inSet} ORDER BY d.optimal_level, d.name`).all(...args) as Record<string, any>[]) {
    dungeons.set(d.a, [...(dungeons.get(d.a) ?? []), { id: d.id, name: d.name, level: d.level }]);
  }
  const dofusByAch = new Map<number, { name: string; slug: string }[]>();
  const dofusRows = db.prepare('SELECT item_id itemId, name, achievement_ids FROM dofus').all() as Record<string, any>[];
  const slugs = dofusSlugs(dofusRows as { itemId: number; name: string }[]);
  for (const d of dofusRows) {
    for (const a of JSON.parse(d.achievement_ids) as number[]) dofusByAch.set(a, [...(dofusByAch.get(a) ?? []), { name: d.name, slug: slugs.get(d.itemId)! }]);
  }
  return rows.map((a): AchievementInfo => {
    const g = guides.get(a.id);
    return {
      id: a.id, name: a.name, description: cleanGameText(a.description)?.replace(/\s*\[challenge,\d+\]/g, '') ?? null,
      level: a.level, points: a.points, categoryId: a.category_id,
      objectives: objectives.get(a.id) ?? [],
      rewards: mergeRewards(a.rewards),
      guide: g ? { site: g.site, url: g.url, checkedAt: g.checked_at } : null,
      dofus: dofusByAch.get(a.id) ?? [],
      dungeons: dungeons.get(a.id) ?? [],
    };
  });
}

export type AchievementMatch = 'name' | 'dungeon' | 'objective' | 'category' | 'description';
export interface AchievementHit { id: number; match: AchievementMatch; text: string }
/** Lowercase without accents: "Forêt" and "foret" match. */
export const foldText = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// searchable texts of every achievement, built once per database file (≈ 12 k short strings)
const searchIndexes = new Map<string, { id: number; match: AchievementMatch; text: string; folded: string }[]>();
function searchIndex(db: DatabaseSync, path: string) {
  let idx = searchIndexes.get(path);
  if (idx) return idx;
  idx = [];
  const add = (id: number, match: AchievementMatch, text: string | null) => { if (text) idx!.push({ id, match, text, folded: foldText(text) }); };
  for (const a of db.prepare(`SELECT a.id, a.name, a.description, c.name cat, p.name parent FROM achievement a
    LEFT JOIN achievement_category c ON c.id = a.category_id LEFT JOIN achievement_category p ON p.id = c.parent_id`).all() as Record<string, any>[]) {
    add(a.id, 'name', a.name);
    add(a.id, 'category', a.parent ? `${a.parent} › ${a.cat}` : a.cat);
    add(a.id, 'description', cleanGameText(a.description));
  }
  for (const o of db.prepare('SELECT achievement_id, name FROM achievement_objective').all() as Record<string, any>[]) add(o.achievement_id, 'objective', o.name);
  for (const d of db.prepare('SELECT da.achievement_id, d.name FROM dungeon_achievement da JOIN dungeon d ON d.id = da.dungeon_id').all() as Record<string, any>[]) add(d.achievement_id, 'dungeon', d.name);
  searchIndexes.set(path, idx);
  return idx;
}

const MATCH_RANK: Record<AchievementMatch, number> = { name: 0, dungeon: 1, objective: 2, category: 3, description: 4 };
/** Achievements whose name, dungeon, objective text (monsters, quests, places…), category or description contain every word
 *  of the query, best match first (name before dungeon before objective…), then by level. */
export const searchAchievements = (path: string, query: string, limit = 40) => withDb(path, (db): AchievementHit[] => {
  const words = foldText(query).split(/\s+/).filter((w) => w.length >= 2).slice(0, 6);
  if (!words.length) return [];
  const best = new Map<number, AchievementHit>();
  for (const e of searchIndex(db, path)) {
    if (!words.every((w) => e.folded.includes(w))) continue;
    const cur = best.get(e.id);
    if (!cur || MATCH_RANK[e.match] < MATCH_RANK[cur.match]) best.set(e.id, { id: e.id, match: e.match, text: e.text });
  }
  const level = new Map((db.prepare('SELECT id, level FROM achievement').all() as { id: number; level: number }[]).map((r) => [r.id, r.level]));
  return [...best.values()].sort((a, b) => MATCH_RANK[a.match] - MATCH_RANK[b.match] || (level.get(a.id) ?? 0) - (level.get(b.id) ?? 0)).slice(0, limit);
});

/** Every achievement's objectives with their official condition, for progress across all categories. */
export const loadObjectiveIndex = (path: string) => withDb(path, (db) => {
  const out: Record<number, [number, string][]> = {};
  for (const o of db.prepare('SELECT id, achievement_id, criterion_raw FROM achievement_objective ORDER BY achievement_id, ordinal').all() as Record<string, any>[]) {
    (out[o.achievement_id] ??= []).push([o.id, o.criterion_raw ?? '']);
  }
  return out;
});

export interface DofusInfo { itemId: number; iconId: number | null; name: string; level: number; quests: { id: number; name: string; category: number }[]; achievements: { id: number; name: string; categoryId: number }[] }
export const loadDofus = (path: string) => withDb(path, (db) => {
  const q = db.prepare('SELECT id, name, category_id AS category FROM quest WHERE id = ?');
  const a = db.prepare('SELECT id, name, category_id AS categoryId FROM achievement WHERE id = ?');
  return (db.prepare('SELECT d.item_id, d.name, d.level, d.quest_ids, d.achievement_ids, i.icon_id FROM dofus d LEFT JOIN item i ON i.id = d.item_id ORDER BY d.level, d.name').all() as Record<string, any>[]).map((d) => ({
    itemId: d.item_id, iconId: d.icon_id ?? null, name: d.name, level: d.level,
    quests: (JSON.parse(d.quest_ids) as number[]).map((id) => q.get(id)).filter(Boolean).map((r) => ({ ...(r as object) })) as DofusInfo['quests'],
    achievements: (JSON.parse(d.achievement_ids) as number[]).map((id) => a.get(id)).filter(Boolean).map((r) => ({ ...(r as object) })) as DofusInfo['achievements'],
  }));
});

/** Equipment types only (super types of wearable items), for the encyclopedia filter. */
export const loadEquipmentTypes = (path: string) => withDb(path, (db) => plainRows<{ id: number; name: string; count: number }>(db.prepare(`
  SELECT t.id, t.name, COUNT(i.id) AS count FROM item_type t JOIN item i ON i.type_id = t.id
  WHERE t.super_type_id IN (1, 2, 3, 4, 5, 7, 10, 11, 12, 13)
  GROUP BY t.id HAVING count > 0 ORDER BY t.name`).all()));

export interface ItemSearch { q?: string; type?: number; min?: number; max?: number; limit?: number }
export const searchItems = (path: string, s: ItemSearch) => withDb(path, (db) => {
  const where = ['t.super_type_id IN (1, 2, 3, 4, 5, 7, 10, 11, 12, 13)'];
  const args: (string | number)[] = [];
  if (s.q) { where.push('i.name LIKE ?'); args.push(`%${s.q.slice(0, 60)}%`); }
  if (s.type) { where.push('i.type_id = ?'); args.push(s.type); }
  if (s.min) { where.push('i.level >= ?'); args.push(s.min); }
  if (s.max) { where.push('i.level <= ?'); args.push(s.max); }
  const rows = db.prepare(`SELECT i.id, i.name, t.name AS type, i.level, s.name AS setName, i.effects
    FROM item i JOIN item_type t ON t.id = i.type_id LEFT JOIN item_set s ON s.id = i.set_id
    WHERE ${where.join(' AND ')} ORDER BY i.level DESC, i.name LIMIT ?`).all(...args, Math.min(s.limit ?? 60, 120)) as Record<string, any>[];
  // how to obtain it, from the game data: the recipe (profession, level, ingredients) or the monsters that drop it
  const source = itemSources(db);
  const recipe = db.prepare('SELECT r.ingredients FROM recipe r WHERE r.result_id = ? ORDER BY r.level LIMIT 1');
  const itemName = db.prepare('SELECT name FROM item WHERE id = ?');
  return rows.map((r) => {
    const rec = recipe.get(r.id) as { ingredients: string } | undefined;
    return { id: r.id, name: r.name, type: r.type, level: r.level, setName: r.setName,
      effects: (JSON.parse(r.effects) as { text: string | null; characteristic: number | null }[]).filter((e) => e.text && !/^(Échangeable|Attitude|Effet non documenté)/.test(e.text)).map((e) => e.text!),
      obtain: source(r.id) as IngredientSource,
      ingredients: rec ? (JSON.parse(rec.ingredients) as [number, number][]).map(([id, qty]) => ({ qty, name: (itemName.get(id) as { name: string } | undefined)?.name ?? `objet n°${id}` })) : [],
    };
  });
});

export function loadGraph(path: string): Graph {
  const d = loadGraphData(path);
  return new Graph(d.nodes, d.extraEdges);
}

export interface ClassExtras {
  description: string | null; complexity: number | null;
  quests: { id: string; name: string; level: number | null; href: string }[];
  achievements: { name: string; why: 'quests' | 'name' }[];
}
/** Game data tied to a class, for its class page: official description, class quests (PG condition), linked achievements. */
export function loadClassExtras(path: string, breedId: number, breedName: string): ClassExtras {
  const g = loadGraph(path);
  const data = loadGraphData(path);
  const slugs = regionSlugMap(data.categories);
  const info = withDb(path, (db) => db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'breed_info'").get()
    ? db.prepare('SELECT description, complexity FROM breed_info WHERE breed_id = ?').get(breedId) as { description: string | null; complexity: number | null } | undefined : undefined);
  const ach = classAchievements(g, loadObjectiveIndex(path), breedId, breedName);
  return {
    description: info?.description ?? null, complexity: info?.complexity ?? null,
    quests: classQuests(g, breedId).map((n) => ({ id: n.id, name: n.label, level: n.level ?? null, href: `/progression/quetes/${slugs.get(n.category ?? -1) ?? n.category}#${n.id}` })),
    achievements: [...ach.linked.map((n) => ({ name: n.label, why: 'quests' as const })), ...ach.named.map((n) => ({ name: n.label, why: 'name' as const }))],
  };
}

/** The game's Almanax calendar with each offering's item name and where it comes from (null before the creatures import). */
export const loadAlmanax = (path: string) => withDb(path, (db): AlmanaxEntry[] | null => {
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'almanax'").get()) return null;
  const source = itemSources(db);
  return (db.prepare('SELECT a.id, a.dates, a.name, a.description, a.item_id, a.qty, i.name item FROM almanax a JOIN item i ON i.id = a.item_id ORDER BY a.id').all() as Record<string, any>[])
    .map((r) => ({ id: r.id, dates: JSON.parse(r.dates), name: r.name, description: r.description, item: r.item, qty: r.qty, source: source(r.item_id) }));
});

/**
 * Names the game shows as headings or places (quest and achievement categories, areas, subareas), for the Windows
 * companion: a quest or achievement named like one of them is never read as certain, since the heading itself may be
 * on screen (13 achievements share a category name and 207 a subarea name, 3.7.14.18).
 */
export function loadHeadingNames(path: string): { version: string; names: string[] } {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    const version = (db.prepare('SELECT id FROM game_version').get() as { id: string }).id;
    const rows = db.prepare(`SELECT name FROM quest_category UNION SELECT name FROM achievement_category
      UNION SELECT name FROM world_area UNION SELECT name FROM world_subarea`).all() as { name: string | null }[];
    return { version, names: [...new Set(rows.map((r) => r.name?.trim()).filter((n): n is string => !!n))].sort() };
  } finally { db.close(); }
}
