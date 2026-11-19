'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Graph, type GNode, type Status } from '../src/graph.ts';
import { regionView, focusView, preds } from '../src/views.ts';
import { describe } from '../src/codes.ts';
import type { GraphData } from '../src/load.ts';
import FlowCanvas, { STATUS_STYLE } from './FlowCanvas';
import { useCharacter, type Mark } from './useCharacter';

const ALMANAX = 31; // daily calendar quests: not progression, hidden from "disponibles" unless selected
const DEFAULT_REGION = 19; // Incarnam
const BREEDS = [{ id: 9, name: 'Crâ' }, { id: 12, name: 'Pandawa' }];

type Mode = { type: 'region'; category: number } | { type: 'focus'; id: string };

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export default function QuestMap() {
  const [data, setData] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>({ type: 'region', category: DEFAULT_REGION });
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const ch = useCharacter();

  useEffect(() => {
    fetch('/api/graph')
      .then(async (r) => (r.ok ? r.json() : Promise.reject(new Error((await r.json()).error ?? r.statusText))))
      .then(setData, (e: Error) => setError(e.message));
  }, []);

  const graph = useMemo(() => (data ? new Graph(data.nodes, data.extraEdges) : null), [data]);
  const categoryName = useMemo(() => new Map(data?.categories.map((c) => [c.id, c.name]) ?? []), [data]);

  // One status per quest/achievement for the current character; recomputed when progress changes.
  const statuses = useMemo(() => {
    const m = new Map<string, Status>();
    if (graph) for (const id of graph.nodes.keys()) m.set(id, graph.status(id, ch.progress));
    return m;
  }, [graph, ch.progress]);
  const status = useCallback((id: string) => statuses.get(id) ?? 'unknown', [statuses]);

  const view = useMemo(() => {
    if (!graph) return null;
    return mode.type === 'region' ? regionView(graph, mode.category) : focusView(graph, mode.id);
  }, [graph, mode]);

  const primary = useCallback((id: string) => {
    if (!graph || id.startsWith('gate:')) return true;
    if (mode.type === 'focus') return true;
    const n = graph.nodes.get(id);
    return n?.kind === 'quest' && n.category === mode.category;
  }, [graph, mode]);

  const quests = useMemo(() => (graph ? [...graph.nodes.values()].filter((n) => n.kind === 'quest') : []), [graph]);
  const available = useMemo(() => quests
    .filter((n) => statuses.get(n.id) === 'available')
    .filter((n) => (mode.type === 'region' ? n.category === mode.category : n.category !== ALMANAX))
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0)), [quests, statuses, mode]);
  const results = useMemo(() => {
    const q = norm(search.trim());
    return q.length < 2 ? [] : quests.filter((n) => norm(n.label).includes(q)).slice(0, 30);
  }, [quests, search]);

  const counts = useMemo(() => {
    const c = { done: 0, available: 0, locked: 0, unknown: 0 } as Record<Status, number>;
    for (const n of quests) if (n.category !== ALMANAX) c[statuses.get(n.id) ?? 'unknown']++;
    return c;
  }, [quests, statuses]);

  const focus = (id: string) => { setMode({ type: 'focus', id }); setSelected(id); setSearch(''); };

  if (error) return <Centered>Impossible de charger les données : {error}</Centered>;
  if (!data || !graph || !view) return <Centered>Chargement du graphe…</Centered>;

  const regionCount = (id: number) => quests.filter((n) => n.category === id).length;
  const sel = selected ? graph.nodes.get(selected) : undefined;

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-zinc-800 bg-zinc-950 px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <h1 className="text-[15px] font-semibold tracking-tight">Dofus Companion</h1>
          <span className="text-xs text-zinc-500">Carte des quêtes · données {data.version}</span>
        </div>
        <ProfileBar ch={ch} />
        <div className="ml-auto flex gap-3 text-xs text-zinc-400" title="Hors Almanax">
          {(['done', 'available', 'locked', 'unknown'] as Status[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${STATUS_STYLE[s].dot}`} />
              {STATUS_STYLE[s].label} <b className="font-medium text-zinc-200">{counts[s]}</b>
            </span>
          ))}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="flex max-h-[40vh] w-full shrink-0 flex-col gap-3 overflow-y-auto border-b border-zinc-800 bg-zinc-950 p-3 md:max-h-none md:w-72 md:border-b-0 md:border-r">
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Région
            <select
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
              value={mode.type === 'region' ? mode.category : ''}
              onChange={(e) => { setMode({ type: 'region', category: Number(e.target.value) }); setSelected(null); }}
            >
              {mode.type === 'focus' && <option value="">— vue centrée —</option>}
              {data.categories.filter((c) => regionCount(c.id) > 0).map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({regionCount(c.id)})</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Rechercher une quête
            <input
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600"
              placeholder="ex. Crypte Honnie"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          {results.length > 0 && (
            <NodeList title={`Résultats (${results.length})`} nodes={results} status={status} onPick={focus} category={categoryName} />
          )}

          <NodeList
            title={`Disponibles ${mode.type === 'region' ? 'dans la région' : 'hors Almanax'} (${available.length})`}
            nodes={available.slice(0, 80)}
            status={status}
            onPick={(id) => setSelected(id)}
            category={categoryName}
            empty="Aucune quête disponible ici avec ce profil."
          />
        </aside>

        <main className="relative min-h-[50vh] flex-1">
          {mode.type === 'focus' && (
            <div className="absolute left-3 top-3 z-10 rounded border border-zinc-700 bg-zinc-900/90 px-3 py-1.5 text-xs text-zinc-300">
              Prérequis et déblocages de <b className="text-zinc-100">{graph.nodes.get(mode.id)?.label}</b>
            </div>
          )}
          <FlowCanvas
            graph={graph}
            view={view}
            status={status}
            primary={primary}
            selected={selected}
            onSelect={setSelected}
            viewKey={mode.type === 'region' ? `r${mode.category}` : `f${mode.id}`}
            fitIds={mode.type === 'focus'
              ? [mode.id, ...preds(graph, mode.id).map((e) => e.from), ...(graph.dependents.get(mode.id) ?? [])]
                .filter((id) => view.nodes.has(id))
              : undefined}
          />
        </main>

        {sel && sel.kind !== 'gate' && (
          <DetailPanel
            node={sel}
            graph={graph}
            ch={ch}
            status={status}
            category={categoryName}
            onFocus={focus}
            onSelect={setSelected}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-dvh items-center justify-center text-sm text-zinc-400">{children}</div>;
}

type Ch = ReturnType<typeof useCharacter>;

function ProfileBar({ ch }: { ch: Ch }) {
  const p = ch.character.profile;
  const field = 'rounded border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-sm text-zinc-100';
  const opt = (v: string) => (v === '' ? undefined : Number(v));
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
      <label className="flex items-center gap-1.5">Niveau
        <input type="number" min={1} max={200} className={`${field} w-16`} value={ch.character.level}
          onChange={(e) => ch.setLevel(Number(e.target.value))} />
      </label>
      <label className="flex items-center gap-1.5">Classe
        <select className={field} value={p.breed ?? ''} onChange={(e) => ch.setProfile({ breed: opt(e.target.value) })}>
          <option value="">Non renseignée</option>
          {BREEDS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-1.5">Alignement
        <select className={field} value={p.alignmentSide ?? ''} onChange={(e) => ch.setProfile({ alignmentSide: opt(e.target.value) })}>
          <option value="">Non renseigné</option>
          <option value="0">Neutre</option>
          <option value="1">Bonta</option>
          <option value="2">Brâkmar</option>
        </select>
      </label>
      <label className="flex items-center gap-1.5">Niv. align.
        <input type="number" min={0} max={100} className={`${field} w-14`} value={p.alignmentLevel ?? ''}
          onChange={(e) => ch.setProfile({ alignmentLevel: opt(e.target.value) })} />
      </label>
      <label className="flex items-center gap-1.5">Abonné
        <select className={field} value={p.subscribed === undefined ? '' : String(p.subscribed)}
          onChange={(e) => ch.setProfile({ subscribed: e.target.value === '' ? undefined : e.target.value === 'true' })}>
          <option value="">?</option>
          <option value="true">Oui</option>
          <option value="false">Non</option>
        </select>
      </label>
      <button
        className="rounded px-1.5 py-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        onClick={() => { if (confirm('Effacer le profil et toute la progression enregistrée dans ce navigateur ?')) ch.reset(); }}
      >Réinitialiser</button>
    </div>
  );
}

function NodeList({ title, nodes, status, onPick, category, empty }: {
  title: string; nodes: GNode[]; status: (id: string) => Status; onPick: (id: string) => void;
  category: Map<number, string>; empty?: string;
}) {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</h2>
      {nodes.length === 0 && empty && <p className="text-xs text-zinc-600">{empty}</p>}
      <ul className="flex flex-col">
        {nodes.map((n) => (
          <li key={n.id}>
            <button className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-zinc-800/80" onClick={() => onPick(n.id)}>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_STYLE[status(n.id)].dot}`} />
              <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-200">{n.label}</span>
              <span className="shrink-0 text-[11px] text-zinc-500">
                {n.level ? `${n.level}` : ''}{n.kind === 'quest' && n.category ? ` · ${category.get(n.category) ?? ''}` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DetailPanel({ node, graph, ch, status, category, onFocus, onSelect, onClose }: {
  node: GNode; graph: Graph; ch: Ch; status: (id: string) => Status; category: Map<number, string>;
  onFocus: (id: string) => void; onSelect: (id: string) => void; onClose: () => void;
}) {
  const st = status(node.id);
  const isActive = ch.progress.active.has(node.id);
  const mark = (m: Mark) => ch.setMark(node.id, m);
  const missing = st === 'done' ? [] : graph.blockers(node.id, ch.progress);
  // Prerequisites: direct edges, with OR gates expanded to their alternatives.
  const prereqs = preds(graph, node.id).flatMap((e) =>
    e.from.startsWith('gate:') ? preds(graph, e.from).map((g) => ({ id: g.from, kind: 'une au choix' })) :
      [{ id: e.from, kind: e.kind === 'excludes' ? 'exclut' : 'requis' }]);
  const unlocks = [...(graph.dependents.get(node.id) ?? [])];
  const link = (id: string) => {
    const n = graph.nodes.get(id);
    return n ? (
      <button className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-zinc-800" onClick={() => onSelect(id)}>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_STYLE[status(id)].dot}`} />
        <span className="min-w-0 flex-1 truncate">{n.label}</span>
        {n.level ? <span className="text-[11px] text-zinc-500">{n.level}</span> : null}
      </button>
    ) : <span className="px-1.5 text-zinc-500">{id}</span>;
  };
  const btn = 'rounded border px-2.5 py-1 text-xs font-medium';

  return (
    <aside className="flex max-h-[60vh] w-full shrink-0 flex-col gap-4 overflow-y-auto border-t border-zinc-800 bg-zinc-950 p-4 text-sm md:max-h-none md:w-96 md:border-l md:border-t-0">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wide text-zinc-500">
            {node.kind === 'quest' ? 'Quête' : node.kind === 'achievement' ? 'Succès' : 'Donjon'} #{node.refId}
            {node.level ? ` · niv. ${node.level}` : ''}
            {node.kind === 'quest' && node.category ? ` · ${category.get(node.category) ?? ''}` : ''}
          </div>
          <h2 className="text-base font-semibold leading-snug text-zinc-50">{node.label}</h2>
        </div>
        <button aria-label="Fermer" className="rounded px-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" onClick={onClose}>✕</button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLE[st].box}`}>{STATUS_STYLE[st].label}</span>
        {st === 'done'
          ? <button className={`${btn} border-zinc-700 text-zinc-300 hover:bg-zinc-800`} onClick={() => mark(null)}>Annuler</button>
          : <button className={`${btn} border-emerald-700 bg-emerald-900/50 text-emerald-200 hover:bg-emerald-900`} onClick={() => mark('done')}>Marquer terminée</button>}
        {node.kind === 'quest' && st !== 'done' && (
          <button className={`${btn} border-zinc-700 text-zinc-300 hover:bg-zinc-800`} onClick={() => mark(isActive ? null : 'active')}>
            {isActive ? 'Plus en cours' : 'En cours'}
          </button>
        )}
        <button className={`${btn} border-sky-800 text-sky-300 hover:bg-sky-950`} onClick={() => onFocus(node.id)}>Centrer</button>
      </div>
      <p className="-mt-2 text-xs text-zinc-500">
        Le niveau affiché est indicatif. Seules les conditions ci-dessous sont exigées par le jeu.
      </p>

      {missing.length > 0 && (
        <Section title="Ce qui manque">
          <ul className="flex flex-col gap-1 text-[13px]">
            {missing.map((a, i) => {
              const ref = graph.nodes.get(a.code === 'OA' ? `ach:${a.value}` : `quest:${a.value.split(',')[0]}`);
              return (
                <li key={i} className="text-zinc-300">
                  {describe(a)}
                  {(a.code === 'Qf' || a.code === 'OA' || a.code === 'QF') && ref && <> — <i className="text-zinc-400">{ref.label}</i></>}
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {prereqs.length > 0 && (
        <Section title={`Prérequis (${prereqs.length})`}>
          <ul className="flex flex-col text-[13px]">
            {prereqs.map((p, i) => <li key={i} className="flex items-center gap-1">{link(p.id)}<span className="shrink-0 text-[11px] text-zinc-500">{p.kind}</span></li>)}
          </ul>
        </Section>
      )}

      {unlocks.length > 0 && (
        <Section title={`Débloque ou modifie (${unlocks.length})`}>
          <ul className="flex flex-col text-[13px]">{unlocks.slice(0, 50).map((id) => <li key={id}>{link(id)}</li>)}</ul>
        </Section>
      )}

      <details className="text-xs text-zinc-500">
        <summary className="cursor-pointer select-none">Condition brute (données du jeu)</summary>
        <code className="mt-1 block break-all rounded bg-zinc-900 p-2 text-zinc-300">{node.criterion || '(aucune)'}</code>
      </details>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</h3>
      {children}
    </section>
  );
}
