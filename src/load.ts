import { DatabaseSync } from 'node:sqlite';
import { readdirSync } from 'node:fs';
import { Graph, type GEdge, type NodeInput } from './graph.ts';

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

export function loadGraph(path: string): Graph {
  const d = loadGraphData(path);
  return new Graph(d.nodes, d.extraEdges);
}
