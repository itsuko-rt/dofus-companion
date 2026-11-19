'use client';
// Achievement progress of the active character, shared by the journal and the home page.
import { useEffect, useMemo, useState } from 'react';
import { achievementProgress, type ObjectiveIndex } from '../../src/achievements.ts';
import { useGame } from '../quests/useGame';

let objCache: Promise<ObjectiveIndex> | null = null;
const fetchObjectives = () => (objCache ??= fetch('/api/achievements/objectives').then((r) => {
  if (!r.ok) throw new Error(r.statusText);
  return r.json() as Promise<ObjectiveIndex>;
}).catch((e) => { objCache = null; throw e; }));

export function useAchievementProgress() {
  const game = useGame();
  const { graph, ch } = game;
  const [index, setIndex] = useState<ObjectiveIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { fetchObjectives().then(setIndex, (e: Error) => setError(e.message)); }, []);

  // objectives evaluated against the character, for every achievement
  const progress = useMemo(() => {
    const m = new Map<number, ReturnType<typeof achievementProgress> & { category: number }>();
    if (!graph || !index) return m;
    for (const n of graph.nodes.values()) {
      if (n.kind !== 'achievement') continue;
      m.set(n.refId, { ...achievementProgress(n.refId, index[n.refId] ?? [], ch.progress), category: n.category ?? -1 });
    }
    return m;
  }, [graph, index, ch.progress]);

  const recent = useMemo(() => {
    const out: { id: string; at: string }[] = [];
    for (const h of [...ch.character.history].reverse()) for (const id of h.added) {
      if (id.startsWith('ach:') && ch.progress.done.has(id) && !out.some((x) => x.id === id)) out.push({ id, at: h.at });
    }
    return out.slice(0, 5);
  }, [ch.character.history, ch.progress.done]);

  // "what next": most objectives already met, reachable at the character's level; ready-to-confirm first
  const almost = useMemo(() => [...progress.entries()]
    .filter(([id, p]) => (p.state === 'in_progress' || p.state === 'ready') && (graph?.nodes.get(`ach:${id}`)?.level ?? 0) <= ch.character.level + 20)
    .sort((a, b) => Number(b[1].state === 'ready') - Number(a[1].state === 'ready') || b[1].met / b[1].total - a[1].met / a[1].total)
    .slice(0, 5), [progress, graph, ch.character.level]);

  return { ...game, index, error, progress, recent, almost };
}
