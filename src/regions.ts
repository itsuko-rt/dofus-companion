// Player-facing structure on top of the graph: regions ordered by level, quest chains, next steps.
import { reservedToOtherClass } from './class-quests.ts';
import type { GEdge, GNode, Graph, Status } from './graph.ts';
import type { Atom, Progress } from './criteria.ts';
import { reference } from './criteria.ts';
import { preds } from './views.ts';
import { slugify } from './site.ts';

/**
 * Categories that are not progression: daily, repeatable or event quests, seasonal islands and
 * special servers. The game data has no such flag: 29/26/47 are classified from game knowledge
 * (Vulkania = summer island, Nowel = Christmas island, Temporis = temporary servers; quests span levels 1–200).
 */
export const SIDE_CATEGORIES = new Set([
  31 /* Almanax */, 6 /* Avis de recherche */, 28 /* Événements */,
  29 /* Archipel de Vulkania */, 26 /* Île de Nowel */, 47 /* Temporis */,
]);

/**
 * Sidebar groups of the quest tracker. Like SIDE_CATEGORIES, the game data has no such flag:
 * divine dimensions, alignment and special questlines are classified from game knowledge.
 */
export type RegionGroup = 'regions' | 'divine' | 'alignment' | 'special' | 'side';
export const REGION_GROUPS: { id: RegionGroup; label: string }[] = [
  { id: 'regions', label: 'Régions' },
  { id: 'divine', label: 'Dimensions divines' },
  { id: 'alignment', label: 'Alignement' },
  { id: 'special', label: 'Quêtes spéciales' },
  { id: 'side', label: 'Annexes et événements' },
];
const DIVINE = new Set([34 /* Enutrosor */, 35 /* Srambad */, 36 /* Xélorium */, 38 /* Ecaflipus */]);
const ALIGNMENT = new Set([9 /* Alignement Bonta */, 10 /* Alignement Brâkmar */]);
const SPECIAL = new Set([4 /* Quêtes mondiales */, 2 /* Temples */, 23 /* Krosmoz */, 42 /* Tours de la Fratrie */, 24 /* Tutoriel */, 32 /* Justiciers */]);
export const groupOf = (category: number): RegionGroup =>
  SIDE_CATEGORIES.has(category) ? 'side' : DIVINE.has(category) ? 'divine' : ALIGNMENT.has(category) ? 'alignment' : SPECIAL.has(category) ? 'special' : 'regions';

/** category id → URL slug ("Île de Frigost" → "ile-de-frigost"); a repeated name gets its id appended. */
export function regionSlugMap(categories: { id: number; name: string }[]): Map<number, string> {
  const seen = new Set<string>();
  return new Map(categories.map((c) => {
    let s = slugify(c.name) || String(c.id);
    if (seen.has(s) || /^\d+$/.test(s)) s = `${s}-${c.id}`;
    seen.add(s);
    return [c.id, s];
  }));
}

export interface RegionSummary {
  id: number; name: string; total: number; done: number; available: number;
  levelMin: number; levelMax: number; levelMedian: number; side: boolean; group: RegionGroup;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : 0;
};

/** One summary per quest category, sorted by the median level of its quests. */
export function regionSummaries(
  g: Graph, categories: { id: number; name: string }[], status: (id: string) => Status, breed?: number,
): RegionSummary[] {
  const byCat = new Map<number, GNode[]>();
  for (const n of g.nodes.values()) {
    if (n.kind !== 'quest' || n.category == null || reservedToOtherClass(n, breed)) continue; // another class's quest is not counted
    byCat.set(n.category, [...(byCat.get(n.category) ?? []), n]);
  }
  return categories.filter((c) => byCat.has(c.id)).map((c) => {
    const qs = byCat.get(c.id)!;
    const levels = qs.map((q) => q.level ?? 0).filter((l) => l > 0);
    return {
      id: c.id, name: c.name, total: qs.length,
      done: qs.filter((q) => status(q.id) === 'done').length,
      available: qs.filter((q) => status(q.id) === 'available').length,
      levelMin: levels.length ? Math.min(...levels) : 0,
      levelMax: levels.length ? Math.max(...levels) : 0,
      levelMedian: median(levels),
      side: SIDE_CATEGORIES.has(c.id),
      group: groupOf(c.id),
    };
  }).sort((a, b) => Number(a.side) - Number(b.side) || a.levelMedian - b.levelMedian || a.name.localeCompare(b.name));
}

/** "Recommended for you": the region's level range covers the character and something is doable there. */
export const isRecommended = (r: RegionSummary, level: number) =>
  !r.side && r.available > 0 && r.levelMin <= level + 5 && level <= r.levelMax + 10;

export interface RegionLayout {
  /** Quests linked to at least one other quest of the region, plus the OR gates between them. */
  linked: Set<string>;
  edges: GEdge[];
  /** Quests with no link inside the region, by level. */
  singles: GNode[];
  /** Prerequisites coming from outside the region, per quest. */
  external: Map<string, GNode[]>;
}

export function regionLayout(g: Graph, category: number): RegionLayout {
  const inRegion = (id: string) => g.nodes.get(id)?.kind === 'quest' && g.nodes.get(id)?.category === category;
  const quests = [...g.nodes.values()].filter((n) => inRegion(n.id));
  const linked = new Set<string>();
  const edges: GEdge[] = [];
  const external = new Map<string, GNode[]>();

  for (const q of quests) {
    for (const e of preds(g, q.id)) {
      const sources = e.from.startsWith('gate:') ? preds(g, e.from) : [e];
      const inside = sources.filter((s) => inRegion(s.from));
      const outside = sources.filter((s) => !inRegion(s.from) && g.nodes.get(s.from)?.kind === 'quest');
      if (outside.length) external.set(q.id, [...(external.get(q.id) ?? []), ...outside.map((s) => g.nodes.get(s.from)!)]);
      if (!inside.length) continue;
      linked.add(q.id);
      if (e.from.startsWith('gate:')) {
        linked.add(e.from);
        edges.push(e, ...inside);
      } else edges.push(e);
      inside.forEach((s) => linked.add(s.from));
    }
  }
  const singles = quests.filter((q) => !linked.has(q.id)).sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
  return { linked, edges, singles, external };
}

export interface NextStep { node: GNode; missing?: { atom: Atom; via: GNode } }

/**
 * What to do now: available progression quests near the character's level, then quests
 * locked by exactly one prerequisite quest that is itself available ("do X to unlock Y").
 */
export function nextSteps(g: Graph, status: (id: string) => Status, p: Progress, limit = 6): { now: NextStep[]; soon: NextStep[] } {
  const quests = [...g.nodes.values()].filter((n) => n.kind === 'quest' && !SIDE_CATEGORIES.has(n.category ?? -1));
  const near = (n: GNode) => Math.abs((n.level ?? p.level) - p.level);
  const now = quests.filter((n) => status(n.id) === 'available' && (n.level ?? 0) <= p.level + 10)
    .sort((a, b) => near(a) - near(b) || (a.level ?? 0) - (b.level ?? 0)).slice(0, limit).map((node) => ({ node }));
  const soon: NextStep[] = [];
  for (const n of quests) {
    if (soon.length >= limit * 3) break;
    if (status(n.id) !== 'locked' || (n.level ?? 0) > p.level + 10) continue;
    const b = g.blockers(n.id, p);
    const ref = b.length === 1 ? reference(b[0]) : null;
    const via = ref && !ref.negated ? g.nodes.get(ref.node) : undefined;
    if (via && status(via.id) === 'available') soon.push({ node: n, missing: { atom: b[0], via } });
  }
  soon.sort((a, b) => near(a.node) - near(b.node));
  return { now, soon: soon.slice(0, limit) };
}
