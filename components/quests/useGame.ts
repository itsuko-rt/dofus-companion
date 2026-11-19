'use client';
// Game graph for the client: fetched once per page from the static /api/graph, statuses for the active character.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Graph, type Status } from '../../src/graph.ts';
import type { GraphData } from '../../src/load.ts';
import { useCharacter } from '../useCharacter';

let cache: Promise<GraphData> | null = null;
const fetchGraph = () => (cache ??= fetch('/api/graph').then(async (r) => {
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? r.statusText);
  return r.json() as Promise<GraphData>;
}).catch((e) => { cache = null; throw e; }));

export function useGame() {
  const [data, setData] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ch = useCharacter();

  useEffect(() => { fetchGraph().then(setData, (e: Error) => setError(e.message)); }, []);

  const graph = useMemo(() => (data ? new Graph(data.nodes, data.extraEdges) : null), [data]);
  const categoryName = useMemo(() => new Map(data?.categories.map((c) => [c.id, c.name]) ?? []), [data]);
  const statuses = useMemo(() => {
    const m = new Map<string, Status>();
    if (graph) for (const id of graph.nodes.keys()) m.set(id, graph.status(id, ch.progress));
    return m;
  }, [graph, ch.progress]);
  const status = useCallback((id: string): Status => statuses.get(id) ?? 'unknown', [statuses]);

  return { data, error, graph, categoryName, status, ch };
}
