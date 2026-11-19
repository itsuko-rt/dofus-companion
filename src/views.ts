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

/** Nodes reachable upstream and downstream of `id` along the given edges (selection highlight). */
export function connected(edges: { from: string; to: string }[], id: string): { up: Set<string>; down: Set<string> } {
  const walk = (next: (e: { from: string; to: string }) => [string, string]) => {
    const seen = new Set<string>();
    const queue = [id];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const e of edges) {
        const [a, b] = next(e);
        if (a === cur && !seen.has(b) && b !== id) { seen.add(b); queue.push(b); }
      }
    }
    return seen;
  };
  return { up: walk((e) => [e.to, e.from]), down: walk((e) => [e.from, e.to]) };
}

/**
 * What "complete with its prerequisites" marks done: every required quest or achievement upstream.
 * For a choice ("one of"), an alternative already done is kept; otherwise only the first one is taken,
 * never all of them (alternatives are often exclusive in game).
 */
export function prerequisitesToComplete(g: Graph, id: string, done: ReadonlySet<string>): string[] {
  const out = new Set<string>();
  const visit = (to: string) => {
    for (const e of preds(g, to)) {
      if (e.kind === 'excludes') continue;
      if (e.from.startsWith('gate:')) {
        const alts = preds(g, e.from).filter((a) => a.kind !== 'excludes').map((a) => a.from);
        if (alts.some((a) => done.has(a) || out.has(a))) continue;
        if (alts[0]) add(alts[0]);
      } else add(e.from);
    }
  };
  const add = (n: string) => {
    if (done.has(n) || out.has(n) || n === id) return;
    out.add(n);
    visit(n);
  };
  visit(id);
  return [...out];
}

/** Data checks for the dependency graph: references to unknown quests, and prerequisite cycles. */
export function validateGraph(g: Graph): { missing: string[]; cycles: string[][] } {
  const missing = [...g.dependents.keys()].filter((k) => !g.nodes.has(k)).sort();
  const cycles: string[][] = [];
  const state = new Map<string, 1 | 2>(); // 1 = on the stack, 2 = finished
  const stack: string[] = [];
  const dfs = (n: string) => {
    state.set(n, 1);
    stack.push(n);
    for (const e of preds(g, n)) {
      if (e.kind === 'excludes') continue;
      const s = state.get(e.from);
      if (s === 1) { if (cycles.length < 50) cycles.push(stack.slice(stack.indexOf(e.from))); }
      else if (!s) dfs(e.from);
    }
    stack.pop();
    state.set(n, 2);
  };
  for (const n of g.nodes.keys()) if (!state.has(n)) dfs(n);
  return { missing, cycles };
}
