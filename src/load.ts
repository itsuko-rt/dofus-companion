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
    return { version, categories, nodes, extraEdges };
  } finally {
    db.close();
  }
}

export interface SpellLevel {
  grade: number; minLevel: number; ap: number; minRange: number; range: number; crit: number;
  perTurn: number; perTarget: number; interval: number; initialCooldown: number;
  effects: RenderedEffect[]; criticalEffects: RenderedEffect[];
}
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
    ).all(breedId) as unknown as Omit<SpellInfo, 'levels'>[]).map((s) => ({ ...s, levels: [] as SpellLevel[] }));
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
        SELECT i.id, i.name, i.type_id, t.name AS type_name, i.level, i.set_id, i.effects
        FROM item i LEFT JOIN item_type t ON t.id = i.type_id
        WHERE i.id IN (${want.map(() => '?').join(',')})`).all(...want) as Record<string, any>[];
      for (const r of rows) {
        items.set(r.id, { id: r.id, name: r.name, typeId: r.type_id, typeName: r.type_name, level: r.level, setId: r.set_id, effects: JSON.parse(r.effects) });
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

export function loadGraph(path: string): Graph {
  const d = loadGraphData(path);
  return new Graph(d.nodes, d.extraEdges);
}
