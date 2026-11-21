// Data for the public reference pages (/guides/…): everything comes from the imported game files,
// computed at build time. No text is invented: sentences are templates around real figures.
import { DatabaseSync } from 'node:sqlite';
import { Graph } from './graph.ts';
import { dofusSlugs, latestDb, loadDofus, loadGraphData, type DofusInfo, type GraphData } from './load.ts';
export { dofusSlugs };
import { groupOf, regionLayout, regionSlugMap, REGION_GROUPS, type RegionGroup } from './regions.ts';
import { prerequisitesToComplete, preds } from './views.ts';

interface Ctx { data: GraphData; graph: Graph; guides: Map<number, string>; dofus: DofusInfo[]; version: string }
let ctx: Ctx | null | undefined;

/** Loaded once per build/server process. null without an imported game database. */
export function guideContext(): Ctx | null {
  if (ctx !== undefined) return ctx;
  const db = latestDb();
  if (!db) return (ctx = null);
  const data = loadGraphData(db);
  const d = new DatabaseSync(db, { readOnly: true });
  const guides = new Map((d.prepare('SELECT quest_id, url FROM external_guide').all() as { quest_id: number; url: string }[]).map((r) => [r.quest_id, r.url]));
  d.close();
  return (ctx = { data, graph: new Graph(data.nodes, data.extraEdges), guides, dofus: loadDofus(db), version: data.version });
}

export interface RegionInfo {
  id: number; slug: string; name: string; group: RegionGroup; groupLabel: string;
  quests: number; levelMin: number; levelMax: number; chains: number; standalone: number; dofus: string[];
}

export function regions(c: Ctx): RegionInfo[] {
  const slugs = regionSlugMap(c.data.categories);
  return c.data.categories.flatMap((cat) => {
    const qs = [...c.graph.nodes.values()].filter((n) => n.kind === 'quest' && n.category === cat.id);
    if (!qs.length) return [];
    const slug = slugs.get(cat.id)!;
    const levels = qs.map((q) => q.level ?? 0).filter((l) => l > 0);
    const layout = regionLayout(c.graph, cat.id);
    const dofus = c.dofus.filter((d) => d.quests.some((q) => q.category === cat.id)).map((d) => d.name);
    const group = groupOf(cat.id);
    return [{
      id: cat.id, slug, name: cat.name, group, groupLabel: REGION_GROUPS.find((g) => g.id === group)!.label,
      quests: qs.length, levelMin: levels.length ? Math.min(...levels) : 0, levelMax: levels.length ? Math.max(...levels) : 0,
      chains: countChains(c.graph, [...layout.linked]), standalone: layout.singles.length, dofus,
    }];
  }).sort((a, b) => REGION_GROUPS.findIndex((g) => g.id === a.group) - REGION_GROUPS.findIndex((g) => g.id === b.group) || a.levelMin - b.levelMin || a.name.localeCompare(b.name));
}

function countChains(g: Graph, ids: string[]): number {
  const set = new Set(ids), seen = new Set<string>();
  let n = 0;
  for (const id of ids) {
    if (seen.has(id)) continue;
    n++;
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const e of preds(g, cur)) if (set.has(e.from)) stack.push(e.from);
      for (const d of g.dependents.get(cur) ?? []) if (set.has(d)) stack.push(d);
    }
  }
  return n;
}

export interface QuestEntry { id: number; name: string; level: number | null; requires: { id: string; name: string }[]; guide: string | null; dofus: boolean }

/** Quests of a region in a playable order: prerequisites first, then by level. */
export function regionQuests(c: Ctx, regionId: number): QuestEntry[] {
  const qs = [...c.graph.nodes.values()].filter((n) => n.kind === 'quest' && n.category === regionId);
  const inRegion = new Set(qs.map((q) => q.id));
  const order: string[] = [];
  const placed = new Set<string>();
  const visit = (id: string, depth = 0) => {
    if (placed.has(id) || depth > 200) return;
    for (const e of preds(c.graph, id)) {
      const from = e.from.startsWith('gate:') ? preds(c.graph, e.from).map((x) => x.from) : [e.from];
      for (const f of from) if (inRegion.has(f)) visit(f, depth + 1);
    }
    placed.add(id);
    order.push(id);
  };
  for (const q of [...qs].sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.label.localeCompare(b.label))) visit(q.id);
  const dofusQuests = new Set(c.data.dofusQuests);
  return order.map((id) => {
    const n = c.graph.nodes.get(id)!;
    const req = preds(c.graph, id).filter((e) => e.kind !== 'excludes')
      .flatMap((e) => (e.from.startsWith('gate:') ? preds(c.graph, e.from).map((x) => x.from) : [e.from]))
      .map((rid) => c.graph.nodes.get(rid)).filter((x) => x && x.kind !== 'gate').map((x) => ({ id: x!.id, name: x!.label }));
    return { id: n.refId, name: n.label, level: n.level ?? null, requires: req, guide: c.guides.get(n.refId) ?? null, dofus: dofusQuests.has(id) };
  });
}

/** Every quest/achievement a Dofus needs, upstream of its source (one alternative per choice, like the tracker). */
export function dofusChain(c: Ctx, d: DofusInfo): { source: string; steps: { id: string; name: string; level: number | null; category: string | null }[] }[] {
  const sources = [...d.quests.map((q) => `quest:${q.id}`), ...d.achievements.map((a) => `ach:${a.id}`)];
  const cat = new Map(c.data.categories.map((x) => [x.id, x.name]));
  return sources.map((s) => {
    const ids = [...prerequisitesToComplete(c.graph, s, new Set()), s];
    const steps = ids.map((id) => c.graph.nodes.get(id)!).filter(Boolean)
      .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
      .map((n) => ({ id: n.id, name: n.label, level: n.level ?? null, category: n.kind === 'quest' ? cat.get(n.category ?? -1) ?? null : 'Succès' }));
    return { source: s, steps };
  });
}
