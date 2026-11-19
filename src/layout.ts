// Quest map layout: each quest chain (connected component) is laid out top-to-bottom on its own,
// then the chains are packed into rows, lowest level first. A region never becomes one endless strip.
import dagre from '@dagrejs/dagre';

export interface Size { w: number; h: number }
export interface Chain {
  /** Stable id: the chain's first quest, or 'singles' for the block of standalone quests. */
  id: string;
  nodes: string[];
  x: number; y: number; w: number; h: number;
  minLevel: number;
  collapsed: boolean;
}
export interface PackedLayout { pos: Map<string, { x: number; y: number }>; chains: Chain[]; width: number; height: number }

export const CHAIN_HEADER = 34;
const PAD = 14, GAP = 40, COLLAPSED_W = 260, SINGLE_COLS = 4, BUNDLE_COLS = 4, BUNDLE_MIN = 5, FANIN_MAX = 8, STRAND_MAX = 6;

export function packLayout(
  ids: string[],
  edges: { from: string; to: string }[],
  size: (id: string) => Size,
  level: (id: string) => number,
  collapsed: ReadonlySet<string> = new Set(),
): PackedLayout {
  const inView = new Set(ids);
  const drawn = edges.filter((e) => inView.has(e.from) && inView.has(e.to) && e.from !== e.to);
  // A quest needing many others (Frigost has one with 29) would pull them all onto one row:
  // for layout it only hangs under its highest-level prerequisite. Every edge is still drawn.
  const into = new Map<string, { from: string; to: string }[]>();
  for (const e of drawn) into.set(e.to, [...(into.get(e.to) ?? []), e]);
  const links = drawn.filter((e) => {
    const all = into.get(e.to)!;
    if (all.length <= FANIN_MAX) return true;
    return e === all.reduce((best, x) => (level(x.from) > level(best.from) ? x : best));
  });

  // connected components (union-find)
  const parent = new Map(ids.map((id) => [id, id]));
  const find = (x: string): string => { let r = x; while (parent.get(r) !== r) r = parent.get(r)!; parent.set(x, r); return r; };
  for (const e of links) parent.set(find(e.from), find(e.to));
  const groups = new Map<string, string[]>();
  for (const id of ids) { const r = find(id); groups.set(r, [...(groups.get(r) ?? []), id]); }

  const byLevel = (a: string, b: string) => level(a) - level(b) || a.localeCompare(b);
  const realMin = (ns: string[]) => Math.min(...ns.filter((n) => !n.startsWith('gate:')).map(level));
  const chains: (Chain & { local: Map<string, { x: number; y: number }> })[] = [];
  const singles: string[] = [];

  for (const nodes of groups.values()) {
    if (nodes.length === 1) { singles.push(nodes[0]); continue; }
    const first = [...nodes].filter((n) => !n.startsWith('gate:')).sort(byLevel)[0] ?? nodes[0];
    const isCollapsed = collapsed.has(first);
    const local = new Map<string, { x: number; y: number }>();
    let w = COLLAPSED_W, h = CHAIN_HEADER;
    if (!isCollapsed) {
      const g = new dagre.graphlib.Graph();
      g.setGraph({ rankdir: 'TB', nodesep: 16, ranksep: 34, marginx: PAD, marginy: PAD });
      g.setDefaultEdgeLabel(() => ({}));
      const set = new Set(nodes);
      const own = links.filter((e) => set.has(e.from));
      // A quest unlocking dozens of short side questlines would make one endless row: those
      // lines ("strands") are drawn as columns of a compact grid under it instead.
      const bundles = fanBundles(nodes, own, byLevel);
      const inBundle = new Map<string, string>();
      for (const [key, strands] of bundles) for (const st of strands) for (const n of st) inBundle.set(n, key);
      const cell = nodes.reduce((m, n) => { const s = size(n); return { w: Math.max(m.w, s.w), h: Math.max(m.h, s.h) }; }, { w: 0, h: 0 });
      const grid = (strands: string[][]) => {
        const cols = Math.min(BUNDLE_COLS, strands.length);
        const rows: number[] = []; // height of each row of strands, in nodes
        strands.forEach((st, i) => { const r = Math.floor(i / cols); rows[r] = Math.max(rows[r] ?? 0, st.length); });
        const rowY = rows.map((_, r) => rows.slice(0, r).reduce((s, n) => s + n * (cell.h + 10) + 14, 0));
        return { cols, rowY, w: cols * cell.w + (cols - 1) * 12, h: rowY[rowY.length - 1] + rows[rows.length - 1] * (cell.h + 10) - 10 };
      };
      for (const n of nodes) if (!inBundle.has(n)) { const s = size(n); g.setNode(n, { width: s.w, height: s.h }); }
      for (const [key, strands] of bundles) { const b = grid(strands); g.setNode(key, { width: b.w, height: b.h }); }
      for (const e of own) {
        const from = inBundle.get(e.from) ?? e.from, to = inBundle.get(e.to) ?? e.to;
        if (from !== to) g.setEdge(from, to);
      }
      dagre.layout(g);
      for (const n of nodes) if (!inBundle.has(n)) { const p = g.node(n); const s = size(n); local.set(n, { x: p.x - s.w / 2, y: p.y - s.h / 2 }); }
      for (const [key, strands] of bundles) {
        const p = g.node(key), b = grid(strands);
        strands.forEach((st, i) => st.forEach((n, j) => local.set(n, {
          x: p.x - b.w / 2 + (i % b.cols) * (cell.w + 12),
          y: p.y - b.h / 2 + b.rowY[Math.floor(i / b.cols)] + j * (cell.h + 10),
        })));
      }
      const gr = g.graph();
      w = Math.max(COLLAPSED_W, gr.width ?? 0);
      h = CHAIN_HEADER + (gr.height ?? 0);
    }
    chains.push({ id: first, nodes, x: 0, y: 0, w, h, minLevel: realMin(nodes), collapsed: isCollapsed, local });
  }

  if (singles.length) {
    singles.sort(byLevel);
    const isCollapsed = collapsed.has('singles');
    const local = new Map<string, { x: number; y: number }>();
    let w = COLLAPSED_W, h = CHAIN_HEADER;
    if (!isCollapsed) {
      const cell = singles.reduce((m, n) => { const s = size(n); return { w: Math.max(m.w, s.w), h: Math.max(m.h, s.h) }; }, { w: 0, h: 0 });
      const cols = Math.min(SINGLE_COLS, singles.length);
      singles.forEach((n, i) => local.set(n, { x: PAD + (i % cols) * (cell.w + 16), y: PAD + Math.floor(i / cols) * (cell.h + 14) }));
      w = Math.max(COLLAPSED_W, PAD * 2 + cols * cell.w + (cols - 1) * 16);
      h = CHAIN_HEADER + PAD * 2 + Math.ceil(singles.length / cols) * (cell.h + 14) - 14;
    }
    // standalone quests come after the chains: they are rarely the next step of a story
    chains.push({ id: 'singles', nodes: singles, x: 0, y: 0, w, h, minLevel: Infinity, collapsed: isCollapsed, local });
  }

  chains.sort((a, b) => a.minLevel - b.minLevel || b.nodes.length - a.nodes.length || a.id.localeCompare(b.id));

  // shelf packing, row width chosen so the whole region is roughly landscape
  const area = chains.reduce((s, c) => s + (c.w + GAP) * (c.h + GAP), 0);
  const widest = Math.max(0, ...chains.map((c) => c.w));
  const maxWidth = Math.max(widest, Math.min(2600, Math.max(1000, Math.sqrt(area) * 1.5)));
  let x = 0, y = 0, rowH = 0, width = 0;
  for (const c of chains) {
    if (x > 0 && x + c.w > maxWidth) { x = 0; y += rowH + GAP; rowH = 0; }
    c.x = x; c.y = y;
    x += c.w + GAP; rowH = Math.max(rowH, c.h); width = Math.max(width, c.x + c.w);
  }

  const pos = new Map<string, { x: number; y: number }>();
  for (const c of chains) for (const [n, p] of c.local) pos.set(n, { x: c.x + p.x, y: c.y + CHAIN_HEADER + p.y });
  return { pos, chains: chains.map(({ local: _, ...c }) => c), width, height: y + rowH };
}

/**
 * Short questlines hanging off the same quests: each child starting a simple path (then one parent, at most
 * one next quest, up to STRAND_MAX long) is a strand. Groups of ≥ BUNDLE_MIN strands with the same parents are
 * bundled, as are ≥ BUNDLE_MIN lone starters of one quest.
 */
function fanBundles(nodes: string[], edges: { from: string; to: string }[], order: (a: string, b: string) => number): Map<string, string[][]> {
  const ins = new Map<string, string[]>(), outs = new Map<string, string[]>();
  for (const e of edges) { ins.set(e.to, [...(ins.get(e.to) ?? []), e.from]); outs.set(e.from, [...(outs.get(e.from) ?? []), e.to]); }
  const deg = (n: string) => [ins.get(n)?.length ?? 0, outs.get(n)?.length ?? 0];
  const strand = (start: string): string[] | null => {
    const path = [start];
    for (let cur = start; ; ) {
      const [i, o] = deg(cur);
      if ((cur !== start && i !== 1) || o > 1 || path.length > STRAND_MAX) return null;
      if (o === 0) return path;
      cur = outs.get(cur)![0];
      path.push(cur);
    }
  };
  const groups = new Map<string, string[][]>();
  for (const n of nodes) {
    const [i, o] = deg(n);
    if (i >= 1 && i <= 3) { // a strand may start with an OR gate (Nowel: one gate per star quest)
      const st = strand(n);
      // strands are grouped by their exact set of parents (Vulkania: 14 quests after the same two)
      if (st) { const k = `bundle:out:${[...ins.get(n)!].sort().join('+')}`; groups.set(k, [...(groups.get(k) ?? []), st]); }
    } else if (i === 0 && o === 1 && !n.startsWith('gate:')) {
      const k = `bundle:in:${outs.get(n)![0]}`; groups.set(k, [...(groups.get(k) ?? []), [n]]);
    }
  }
  for (const [k, ss] of groups) if (ss.length < BUNDLE_MIN) groups.delete(k); else ss.sort((a, b) => order(a[0], b[0]));
  return groups;
}
