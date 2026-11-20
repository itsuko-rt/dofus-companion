import { DatabaseSync } from 'node:sqlite';
import { readdirSync } from 'node:fs';
import { Graph, type GEdge, type NodeInput } from './graph.ts';
import type { RenderedEffect } from './effects.ts';
import type { Item, ItemSet } from './stats.ts';

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
    return { id: questId, start: { npc: start?.npc_name ?? null, zone: start?.subarea_name ?? null }, steps, guides };
  } finally {
    db.close();
  }
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
  objectives: { id: number; name: string | null; criterion: string }[];
  /** merged over the game's reward rows (some depend on level or class) */
  rewards: AchievementReward | null;
  guide: { site: string; url: string; checkedAt: string } | null;
  dofus: string[];
}
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
export const loadAchievements = (path: string, categoryIds: number[]) => withDb(path, (db) => {
  const ids = categoryIds.filter(Number.isInteger).slice(0, 50);
  if (!ids.length) return [];
  const rows = db.prepare(
    `SELECT id, name, description, level, points, category_id, rewards FROM achievement WHERE category_id IN (${ids.map(() => '?').join(',')}) ORDER BY level, name`).all(...ids) as Record<string, any>[];
  // one query per table for the whole page (not one per achievement: Donjons has 743)
  const inCats = `IN (SELECT id FROM achievement WHERE category_id IN (${ids.map(() => '?').join(',')}))`;
  const objectives = new Map<number, { id: number; name: string; criterion: string }[]>();
  for (const o of db.prepare(`SELECT achievement_id, id, name, criterion_raw AS criterion FROM achievement_objective WHERE achievement_id ${inCats} ORDER BY achievement_id, ordinal`).all(...ids) as Record<string, any>[]) {
    const list = objectives.get(o.achievement_id) ?? [];
    list.push({ id: o.id, name: o.name, criterion: o.criterion });
    objectives.set(o.achievement_id, list);
  }
  const guides = new Map<number, Record<string, any>>();
  for (const g of db.prepare(`SELECT achievement_id, site, url, checked_at FROM achievement_guide WHERE achievement_id ${inCats}`).all(...ids) as Record<string, any>[]) {
    if (!guides.has(g.achievement_id)) guides.set(g.achievement_id, g); // first row, like the former LIMIT 1
  }
  const dofusByAch = new Map<number, string[]>();
  for (const d of db.prepare('SELECT name, achievement_ids FROM dofus').all() as Record<string, any>[]) {
    for (const a of JSON.parse(d.achievement_ids) as number[]) dofusByAch.set(a, [...(dofusByAch.get(a) ?? []), d.name]);
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
    };
  });
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
  return rows.map((r) => ({ id: r.id, name: r.name, type: r.type, level: r.level, setName: r.setName,
    effects: (JSON.parse(r.effects) as { text: string | null; characteristic: number | null }[]).filter((e) => e.text && !/^(Échangeable|Attitude|Effet non documenté)/.test(e.text)).map((e) => e.text!) }));
});

export function loadGraph(path: string): Graph {
  const d = loadGraphData(path);
  return new Graph(d.nodes, d.extraEdges);
}
