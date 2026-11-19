'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, Info } from 'lucide-react';
import { regionLayout, regionSummaries } from '../../src/regions.ts';
import { focusView, preds } from '../../src/views.ts';
import type { GNode, Status } from '../../src/graph.ts';
import FlowCanvas from '../FlowCanvas';
import { Button, ProgressBar, STATUS, StatusPill } from '../ui';
import QuestDrawer from './QuestDrawer';
import { useGame } from './useGame';

export default function RegionView({ region }: { region: number }) {
  const { data, error, graph, status, categoryName, ch, dofusQuests } = useGame();
  const isDofus = useCallback((id: string) => dofusQuests.has(id), [dofusQuests]);
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(true);

  // Deep links from the home page / search: /progression/quetes/19#quest:1642
  useEffect(() => {
    const read = () => { const h = decodeURIComponent(window.location.hash.slice(1)); if (h) setSelected(h); };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  const layout = useMemo(() => (graph ? regionLayout(graph, region) : null), [graph, region]);
  const summary = useMemo(() => (graph && data ? regionSummaries(graph, data.categories, status).find((r) => r.id === region) : undefined), [graph, data, status, region]);
  const view = useMemo(() => {
    if (!graph || !layout) return null;
    if (focus) { const v = focusView(graph, focus); return { nodes: v.nodes, edges: v.edges }; }
    return { nodes: layout.linked, edges: layout.edges };
  }, [graph, layout, focus]);
  const external = useCallback((id: string) => {
    const ext = layout?.external.get(id);
    return ext?.length ? categoryName.get(ext[0].category ?? -1) ?? 'ailleurs' : null;
  }, [layout, categoryName]);

  if (error) return <p className="p-8 text-sm text-muted">Impossible de charger les quêtes : {error}</p>;
  if (!graph || !layout || !view || !summary) return <p className="p-8 text-sm text-muted">Chargement de la région…</p>;

  const sel = selected ? graph.nodes.get(selected) : undefined;
  const regionQuests = [...graph.nodes.values()].filter((n) => n.kind === 'quest' && n.category === region);
  const availableHere = regionQuests.filter((n) => status(n.id) === 'available').sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
  const select = (id: string) => {
    const n = graph.nodes.get(id);
    // a quest from another region opens its own region
    if (n?.kind === 'quest' && n.category !== region && !focus) window.location.href = `/progression/quetes/${n.category}#${id}`;
    else setSelected(id);
  };

  const QuestRow = ({ n }: { n: GNode }) => {
    const s = STATUS[status(n.id)];
    const Icon = s.icon;
    return (
      <button onClick={() => select(n.id)}
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-2 ${selected === n.id ? 'bg-surface-2' : ''}`}>
        <Icon size={14} className={`${s.text} shrink-0`} aria-label={s.label} />
        <span className="min-w-0 flex-1 truncate">{n.label}</span>
        {n.level ? <span className="text-xs text-muted">{n.level}</span> : null}
      </button>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line bg-surface px-4 py-3">
        <Link href="/progression/quetes" className="inline-flex items-center gap-1 text-sm text-muted hover:text-text"><ArrowLeft size={15} /> Toutes les régions</Link>
        <div className="min-w-0">
          <h1 className="font-display text-lg font-semibold leading-tight">{summary.name}</h1>
          <p className="text-xs text-muted">niv. {summary.levelMin}–{summary.levelMax} · {summary.done}/{summary.total} terminées · {summary.available} disponibles</p>
        </div>
        <ProgressBar value={summary.done} max={summary.total} className="max-w-48" label="Progression de la région" />
        <div className="ml-auto hidden flex-wrap items-center gap-1.5 md:flex" aria-label="Légende">
          {(['available', 'done', 'locked', 'unknown'] as Status[]).map((s) => <StatusPill key={s} status={s} />)}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className={`shrink-0 overflow-y-auto border-line bg-surface md:border-r ${railOpen ? 'max-h-[35vh] md:max-h-none md:w-72' : 'md:w-0'} border-b md:border-b-0`}>
          <div className="flex flex-col gap-4 p-3">
            <section>
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">Disponibles ici ({availableHere.length})</h2>
              {availableHere.length ? availableHere.slice(0, 40).map((n) => <QuestRow key={n.id} n={n} />)
                : <p className="px-2 text-xs text-muted">Aucune pour l’instant : terminez les quêtes précédentes ou montez de niveau.</p>}
            </section>
            {layout.singles.length > 0 && (
              <section>
                <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Quêtes indépendantes ({layout.singles.length})</h2>
                <p className="mb-1 px-2 text-xs text-faint">Elles ne font partie d’aucune chaîne de cette région.</p>
                {layout.singles.map((n) => <QuestRow key={n.id} n={n} />)}
              </section>
            )}
          </div>
        </aside>
        <button onClick={() => setRailOpen(!railOpen)} aria-expanded={railOpen}
          className="absolute left-2 top-2 z-10 hidden rounded-md border border-line bg-surface-2 p-1 text-muted hover:text-text md:block"
          style={{ left: railOpen ? 'calc(18rem - 2.25rem)' : '0.5rem' }} title={railOpen ? 'Masquer la liste' : 'Afficher la liste'}>
          <ChevronDown size={14} className={railOpen ? 'rotate-90' : '-rotate-90'} />
        </button>

        <main className="relative min-h-[55vh] flex-1">
          {focus ? (
            <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full border border-line bg-surface-2/95 px-4 py-1.5 text-sm shadow-lg">
              <span>Tout ce qui mène à <b>« {graph.nodes.get(focus)?.label} »</b></span>
              <Button variant="ghost" className="!px-2 !py-0.5" onClick={() => setFocus(null)}>Revenir à la région</Button>
            </div>
          ) : view.nodes.size > 0 && (
            <p className="absolute left-1/2 top-3 z-10 hidden -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-surface-2/90 px-3 py-1 text-xs text-muted lg:flex">
              <Info size={12} /> Chaque colonne est une histoire : lisez de haut en bas. Cliquez une quête pour savoir comment la débloquer.
            </p>
          )}
          {view.nodes.size > 0 ? (
            <FlowCanvas graph={graph} nodeIds={view.nodes} edges={view.edges} status={status} selected={selected}
              onSelect={select} viewKey={focus ? `f${focus}` : `r${region}`} external={focus ? undefined : external} dofus={isDofus}
              fitIds={focus ? [focus, ...preds(graph, focus).map((e) => e.from)] : undefined} />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted">
              Les quêtes de cette catégorie ne forment pas de chaîne : elles sont toutes dans la liste.
            </div>
          )}
          {sel && sel.kind !== 'gate' && (
            <QuestDrawer node={sel} graph={graph} status={status} ch={ch} region={categoryName.get(sel.category ?? -1)} givesDofus={dofusQuests.has(sel.id)}
              onSelect={select} onFocusChain={(id) => { setFocus(id); setSelected(id); }}
              onClose={() => { setSelected(null); history.replaceState(null, '', window.location.pathname); }} />
          )}
        </main>
      </div>
    </div>
  );
}
