'use client';
// Game graph for the client: fetched once per page from the static /api/graph, statuses for the active character.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Graph, type Status } from '../../src/graph.ts';
import type { GraphData } from '../../src/load.ts';
import { useCharacter } from '../useCharacter';
import { regionSlugMap } from '../../src/regions.ts';
import { setRegionSlugs } from './NextSteps';

let cache: Promise<GraphData> | null = null;
const fetchGraph = () => (cache ??= fetch('/api/graph').then(async (r) => {
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? r.statusText);
  return r.json() as Promise<GraphData>;
}).catch((e) => { cache = null; throw e; }));

// Built once per page lifetime: rebuilding 5,050 nodes and their statuses on every visit to Quêtes or Succès cost
// ~230 ms of main thread on a mid-range phone. Keyed by object identity: same download, same character object.
let graphMemo: { data: GraphData; graph: Graph } | null = null;
let statusMemo: { graph: Graph; character: object; map: Map<string, Status> } | null = null;

export function useGame() {
  const [data, setData] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ch = useCharacter();

  useEffect(() => { fetchGraph().then(setData, (e: Error) => setError(e.message)); }, []);

  const graph = useMemo(() => {
    if (!data) return null;
    if (graphMemo?.data !== data) graphMemo = { data, graph: new Graph(data.nodes, data.extraEdges) };
    return graphMemo.graph;
  }, [data]);
  const dofusQuests = useMemo(() => new Set(data?.dofusQuests ?? []), [data]);
  const categoryName = useMemo(() => new Map(data?.categories.map((c) => [c.id, c.name]) ?? []), [data]);
  // during render (not in an effect) so links rendered in this same pass already use the slugs
  useMemo(() => data && setRegionSlugs(regionSlugMap(data.categories)), [data]);
  const statuses = useMemo(() => {
    if (!graph) return new Map<string, Status>();
    if (statusMemo?.graph === graph && statusMemo.character === ch.character) return statusMemo.map;
    const m = new Map<string, Status>();
    for (const id of graph.nodes.keys()) m.set(id, graph.status(id, ch.progress));
    statusMemo = { graph, character: ch.character, map: m };
    return m;
  }, [graph, ch.progress, ch.character]);
  const status = useCallback((id: string): Status => statuses.get(id) ?? 'unknown', [statuses]);

  return { data, error, graph, categoryName, status, ch, dofusQuests };
}
