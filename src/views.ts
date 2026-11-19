// Subgraphs the quest map shows. The whole graph (~5 000 nodes) is never drawn at once.
import type { GEdge, Graph } from './graph.ts';

export interface View { nodes: Set<string>; edges: GEdge[] }

const DRAWN = new Set(['requires', 'any_of', 'excludes']);
const predIndex = new WeakMap<Graph, Map<string, GEdge[]>>();

/** Incoming drawn edges per node (cached per graph). */
export function preds(g: Graph, id: string): GEdge[] {
  let idx = predIndex.get(g);
  if (!idx) {
    idx = new Map();
    for (const e of g.edges) {
      if (!DRAWN.has(e.kind) || !g.nodes.has(e.from)) continue;
      if (!idx.has(e.to)) idx.set(e.to, []);
      idx.get(e.to)!.push(e);
    }
    predIndex.set(g, idx);
  }
  return idx.get(id) ?? [];
}

function close(g: Graph, nodes: Set<string>): View {
  return { nodes, edges: g.edges.filter((e) => DRAWN.has(e.kind) && nodes.has(e.from) && nodes.has(e.to)) };
}

/** Quests of one category (≈ region) plus their direct prerequisites, OR gates included. */
export function regionView(g: Graph, category: number): View {
  const nodes = new Set<string>();
  for (const n of g.nodes.values()) if (n.kind === 'quest' && n.category === category) nodes.add(n.id);
  for (const id of [...nodes]) {
    for (const e of preds(g, id)) {
      nodes.add(e.from);
      if (e.from.startsWith('gate:')) for (const ge of preds(g, e.from)) nodes.add(ge.from);
    }
  }
  return close(g, nodes);
}

/** Every prerequisite of `id` (transitively, up to `max` nodes) plus what it directly unlocks. */
export function focusView(g: Graph, id: string, max = 250): View {
  const nodes = new Set([id]);
  const queue = [id];
  while (queue.length && nodes.size < max) {
    for (const e of preds(g, queue.shift()!)) {
      if (e.kind === 'excludes' || nodes.has(e.from)) continue; // exclusions drawn only when both ends are present
      nodes.add(e.from);
      queue.push(e.from);
    }
  }
  for (const d of g.dependents.get(id) ?? []) nodes.add(d);
  return close(g, nodes);
}
