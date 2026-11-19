'use client';
// The quest tracker: region list on the left, filters and progress on top, the region's quest chains as a graph.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, CircleHelp, Map as MapIcon, MousePointerClick, Search, Undo2, X } from 'lucide-react';
import { REGION_GROUPS, isRecommended, regionLayout, regionSummaries, type RegionGroup, type RegionSummary } from '../../src/regions.ts';
import { focusView, preds, prerequisitesToComplete } from '../../src/views.ts';
import type { Status } from '../../src/graph.ts';
import { SUPPORTED_BREEDS } from '../breeds';
import FlowCanvas from '../FlowCanvas';
import { Button, ProgressBar, STATUS } from '../ui';
import type { Mark } from '../useCharacter';
import QuestDrawer from './QuestDrawer';
import { useGame } from './useGame';

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
type StatusFilter = 'all' | Status | 'active';
const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Tous les statuts' }, { id: 'available', label: 'Disponibles' }, { id: 'active', label: 'En cours' },
  { id: 'done', label: 'Terminées' }, { id: 'locked', label: 'Verrouillées' }, { id: 'unknown', label: 'À vérifier' },
];
interface Prefs { hideDone: boolean; upToLevel: boolean; status: StatusFilter; closedGroups: RegionGroup[]; collapsed: Record<number, string[]> }
const PREFS_KEY = 'dofus-companion:tracker:v1';
const DEFAULT_PREFS: Prefs = { hideDone: false, upToLevel: false, status: 'all', closedGroups: ['side'], collapsed: {} };
const field = 'rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-sm text-text';

function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  useEffect(() => {
    try { const raw = localStorage.getItem(PREFS_KEY); if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) }); } catch { /* defaults */ }
  }, []);
  const update = useCallback((patch: Partial<Prefs>) => setPrefs((p) => {
    const next = { ...p, ...patch };
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    return next;
  }), []);
  return [prefs, update] as const;
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className={`font-display text-base font-semibold leading-tight tabular-nums ${tone ?? 'text-text'}`}>{value}</span>
      <span className="truncate text-[11px] text-muted">{label}</span>
    </div>
  );
}

function RegionRow({ r, current, recommended }: { r: RegionSummary; current: boolean; recommended: boolean }) {
  return (
    <Link href={`/progression/quetes/${r.id}`} aria-current={current ? 'page' : undefined}
      className={`group block rounded-lg px-2.5 py-1.5 ${current ? 'bg-brand/15 text-text' : 'text-muted hover:bg-surface-2 hover:text-text'}`}>
      <span className="flex items-center gap-2 text-sm">
        <span className="min-w-0 flex-1 truncate">{r.name}</span>
        {recommended && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" title="Conseillée pour votre niveau" />}
        <span className="shrink-0 text-[11px] tabular-nums text-faint">{r.done}/{r.total}</span>
      </span>
      <span className="mt-1 flex items-center gap-2">
        <ProgressBar value={r.done} max={r.total} className="!h-1" label={`${r.name} : ${r.done} sur ${r.total}`} />
        <span className="w-14 shrink-0 text-right text-[10.5px] text-faint">{r.levelMin === r.levelMax ? `niv. ${r.levelMin}` : `${r.levelMin}–${r.levelMax}`}</span>
      </span>
    </Link>
  );
}

export default function QuestTracker({ region: regionParam }: { region?: number }) {
  const { data, error, graph, status, categoryName, ch, dofusQuests } = useGame();
  const router = useRouter();
  const [prefs, setPrefs] = usePrefs();
  const [selected, setSelected] = useState<string | null>(null);
  const [centerOn, setCenterOn] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [railOpen, setRailOpen] = useState(false); // mobile only
  const [help, setHelp] = useState(false);
  const [undo, setUndo] = useState<{ label: string; done: string[]; active: string[] } | null>(null);

  // Deep links: /progression/quetes/19#quest:1642
  useEffect(() => {
    const read = () => { const h = decodeURIComponent(window.location.hash.slice(1)); if (h) { setSelected(h); setCenterOn(h); } };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  const level = ch.character.level;
  const regions = useMemo(() => (graph && data ? regionSummaries(graph, data.categories, status) : []), [graph, data, status]);
  // Without a region in the URL: the first region recommended for the character's level.
  const region = regionParam ?? (regions.find((r) => isRecommended(r, level)) ?? regions.find((r) => !r.side))?.id;
  const summary = regions.find((r) => r.id === region);
  const layout = useMemo(() => (graph && region != null ? regionLayout(graph, region) : null), [graph, region]);

  const isActive = useCallback((id: string) => ch.progress.active.has(id), [ch.progress]);
  const matches = useCallback((id: string) => {
    if (prefs.status === 'all') return true;
    if (prefs.status === 'active') return isActive(id) && status(id) !== 'done';
    return status(id) === prefs.status;
  }, [prefs.status, status, isActive]);

  // Hiding is applied to the region's quests; the layout re-packs what is left.
  const view = useMemo(() => {
    if (!graph || !layout) return null;
    if (focus) return focusView(graph, focus);
    const keep = (id: string) => {
      const n = graph.nodes.get(id)!;
      if (prefs.hideDone && status(id) === 'done') return false;
      if (prefs.upToLevel && (n.level ?? 0) > level) return false;
      return true;
    };
    const quests = [...layout.linked, ...layout.singles.map((n) => n.id)].filter((id) => !id.startsWith('gate:') && keep(id));
    const set = new Set(quests);
    // an OR gate stays if it still leads to a visible quest
    for (const e of layout.edges) if (e.from.startsWith('gate:') && set.has(e.to)) set.add(e.from);
    return { nodes: set, edges: layout.edges };
  }, [graph, layout, focus, prefs.hideDone, prefs.upToLevel, status, level]);

  const external = useCallback((id: string) => {
    const ext = layout?.external.get(id);
    return ext?.length ? categoryName.get(ext[0].category ?? -1) ?? 'ailleurs' : null;
  }, [layout, categoryName]);
  const isDofus = useCallback((id: string) => dofusQuests.has(id), [dofusQuests]);
  const dim = useCallback((id: string) => !id.startsWith('gate:') && !matches(id), [matches]);
  const collapsed = useMemo(() => new Set(region != null ? prefs.collapsed[region] ?? [] : []), [prefs.collapsed, region]);
  const toggleChain = useCallback((chainId: string) => {
    if (region == null) return;
    const cur = new Set(prefs.collapsed[region] ?? []);
    if (cur.has(chainId)) cur.delete(chainId); else cur.add(chainId);
    setPrefs({ collapsed: { ...prefs.collapsed, [region]: [...cur] } });
  }, [prefs.collapsed, region, setPrefs]);

  const totals = useMemo(() => {
    const t = { total: 0, done: 0, available: 0, locked: 0, unknown: 0, active: 0 };
    if (!graph) return t;
    const counted = new Set(regions.filter((r) => !r.side).map((r) => r.id));
    for (const n of graph.nodes.values()) {
      if (n.kind !== 'quest' || !counted.has(n.category ?? -1)) continue;
      t.total++;
      t[status(n.id)]++;
      if (isActive(n.id) && status(n.id) !== 'done') t.active++;
    }
    return t;
  }, [graph, regions, status, isActive]);

  const results = useMemo(() => {
    const q = norm(query.trim());
    if (!graph || q.length < 2) return [];
    return [...graph.nodes.values()].filter((n) => n.kind === 'quest' && norm(n.label).includes(q)).slice(0, 14);
  }, [graph, query]);

  // ---------- progress changes, all undoable
  const doUndo = () => {
    if (!undo) return;
    ch.restoreProgress(undo.done, undo.active);
    setUndo(null);
  };
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 10_000);
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); doUndo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [undo]); // doUndo only reads `undo`

  if (error) return <p className="p-8 text-sm text-muted">Impossible de charger les quêtes : {error}</p>;
  if (!graph || !data || !view || !summary || region == null) return <p className="p-8 text-sm text-muted">Chargement des quêtes…</p>;

  const select = (id: string) => {
    const n = graph.nodes.get(id);
    // a quest from another region opens its region, without reloading the page
    if (n?.kind === 'quest' && n.category !== region && !focus) router.push(`/progression/quetes/${n.category}#${id}`);
    else { setSelected(id); }
  };
  const mark = (id: string, m: Mark | 'with-prerequisites') => {
    const before = { done: [...ch.character.done], active: [...ch.character.active] };
    const name = graph.nodes.get(id)?.label ?? id;
    if (m === 'with-prerequisites') {
      const ids = [...prerequisitesToComplete(graph, id, ch.progress.done), id];
      ch.markDone(ids);
      setUndo({ label: `« ${name} » et ${ids.length - 1} prérequis marqués terminés`, ...before });
    } else {
      ch.setMark(id, m);
      setUndo({ label: m === 'done' ? `« ${name} » marquée terminée` : m === 'active' ? `« ${name} » marquée en cours` : `« ${name} » n’est plus marquée`, ...before });
    }
  };
  const toggleDone = (id: string, withPrerequisites: boolean) =>
    mark(id, withPrerequisites ? 'with-prerequisites' : status(id) === 'done' ? null : 'done');
  const sel = selected ? graph.nodes.get(selected) : undefined;
  const pct = totals.total ? Math.round((totals.done / totals.total) * 100) : 0;
  const breed = SUPPORTED_BREEDS.find((b) => b.id === ch.character.profile.breed);

  const sidebar = (
    <nav aria-label="Régions" className="flex flex-col gap-3 p-3">
      <div className="rounded-lg border border-line bg-surface-2/60 p-2.5">
        {ch.characters.length > 0 ? (
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-faint">Profil
            <select value={ch.character.id} onChange={(e) => ch.select(e.target.value)} className={`${field} mt-1 block w-full normal-case tracking-normal`}>
              {ch.characters.map((c) => <option key={c.id} value={c.id}>{c.name} · niv. {c.level}</option>)}
            </select>
          </label>
        ) : <p className="text-sm text-muted">Progression non enregistrée dans un profil.</p>}
        <Link href="/personnage" className="mt-1.5 block text-xs text-brand hover:underline">{ch.characters.length ? 'Gérer les profils et sauvegardes' : 'Créer un personnage'}</Link>
      </div>
      {REGION_GROUPS.map((g) => {
        const rs = regions.filter((r) => r.group === g.id);
        if (!rs.length) return null;
        const open = !prefs.closedGroups.includes(g.id) || rs.some((r) => r.id === region);
        const done = rs.reduce((s, r) => s + r.done, 0), total = rs.reduce((s, r) => s + r.total, 0);
        return (
          <section key={g.id}>
            <button aria-expanded={open} onClick={() => setPrefs({ closedGroups: open ? [...prefs.closedGroups, g.id] : prefs.closedGroups.filter((x) => x !== g.id) })}
              className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-faint hover:text-text">
              {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <span className="flex-1">{g.label}</span>
              <span className="font-normal normal-case tabular-nums">{done}/{total}</span>
            </button>
            {open && <div className="mt-1 flex flex-col gap-0.5">{rs.map((r) => <RegionRow key={r.id} r={r} current={r.id === region} recommended={isRecommended(r, level)} />)}</div>}
          </section>
        );
      })}
    </nav>
  );

  return (
    <div className="relative flex h-full min-h-0">
      {/* sidebar: always visible on desktop, a sheet on mobile */}
      <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-line bg-surface md:block">{sidebar}</aside>
      {railOpen && (
        <div className="absolute inset-0 z-30 flex md:hidden">
          <aside className="w-72 max-w-[85%] overflow-y-auto border-r border-line bg-surface" onClick={(e) => (e.target as HTMLElement).closest('a') && setRailOpen(false)}>{sidebar}</aside>
          <button aria-label="Fermer la liste des régions" className="flex-1 bg-black/50" onClick={() => setRailOpen(false)} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* progress dashboard */}
        <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line bg-surface px-4 py-2.5">
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-sm md:hidden" onClick={() => setRailOpen(true)}>
            <MapIcon size={15} /> Régions
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-lg font-semibold leading-tight">{focus ? `Chaîne de « ${graph.nodes.get(focus)?.label} »` : summary.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <ProgressBar value={summary.done} max={summary.total} className="w-28" label={`Progression de ${summary.name}`} />
              <span className="whitespace-nowrap text-xs text-muted">{summary.done}/{summary.total} · niv. {summary.levelMin}–{summary.levelMax}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-x-5 gap-y-1 sm:grid-cols-6 lg:ml-auto" aria-label="Progression globale (hors annexes)">
            <Stat label="Quêtes" value={totals.total} />
            <Stat label="Terminées" value={totals.done} tone="text-done" />
            <Stat label="Disponibles" value={totals.available} tone="text-accent" />
            <Stat label="En cours" value={totals.active} tone="text-info" />
            <Stat label="Verrouillées" value={totals.locked} tone="text-muted" />
            <Stat label="Complétion" value={`${pct} %`} />
          </div>
        </header>

        {/* filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-bg/60 px-4 py-2">
          <label className="relative min-w-48 flex-1 sm:max-w-72">
            <span className="sr-only">Rechercher une quête</span>
            <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une quête…" className={`${field} w-full pl-8`}
              onKeyDown={(e) => e.key === 'Escape' && setQuery('')} />
            {results.length > 0 && (
              <ul className="absolute z-30 mt-1 w-full min-w-72 overflow-hidden rounded-lg border border-line bg-surface-2 shadow-xl">
                {results.map((n) => (
                  <li key={n.id}>
                    <button className="block w-full px-3 py-2 text-left text-sm hover:bg-line" onClick={() => {
                      setQuery('');
                      if (n.category === region) { setFocus(null); setSelected(n.id); setCenterOn(n.id); }
                      else router.push(`/progression/quetes/${n.category}#${n.id}`);
                    }}>
                      {n.label} <span className="text-xs text-muted">· {categoryName.get(n.category ?? -1)}{n.level ? ` · niv. ${n.level}` : ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </label>
          <label className="flex items-center gap-1.5 text-sm text-muted">Niveau
            <input type="number" min={1} max={200} value={level} onChange={(e) => ch.setLevel(Number(e.target.value))} className={`${field} w-16`} />
          </label>
          <label className="flex items-center gap-1.5 text-sm text-muted"><span className="sr-only">Classe</span>
            <select value={breed?.id ?? ''} onChange={(e) => ch.setProfile({ breed: e.target.value ? Number(e.target.value) : undefined })} className={field}>
              <option value="">Classe : non choisie</option>
              {SUPPORTED_BREEDS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label className="text-sm"><span className="sr-only">Statut</span>
            <select value={prefs.status} onChange={(e) => setPrefs({ status: e.target.value as StatusFilter })} className={field}>
              {STATUS_FILTERS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-sm text-muted">
            <input type="checkbox" checked={prefs.hideDone} onChange={(e) => setPrefs({ hideDone: e.target.checked })} className="accent-[var(--color-brand)]" /> Masquer les terminées
          </label>
          <label className="flex items-center gap-1.5 text-sm text-muted">
            <input type="checkbox" checked={prefs.upToLevel} onChange={(e) => setPrefs({ upToLevel: e.target.checked })} className="accent-[var(--color-brand)]" /> Jusqu’à mon niveau
          </label>
          <button onClick={() => setHelp(!help)} aria-expanded={help} className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-text">
            <CircleHelp size={15} /> Aide
          </button>
        </div>

        <main className="relative min-h-[60vh] flex-1">
          {help && (
            <div className="absolute right-3 top-3 z-20 w-80 rounded-xl border border-line bg-surface-2/95 p-3 text-sm shadow-xl backdrop-blur">
              <p className="mb-2 flex items-center gap-1.5 font-semibold"><MousePointerClick size={15} className="text-brand" /> Commandes</p>
              <ul className="flex flex-col gap-1 text-muted">
                <li><b className="text-text">Clic</b> : détails de la quête</li>
                <li><b className="text-text">Clic droit</b> : terminée / pas terminée</li>
                <li><b className="text-text">Maj ou Ctrl + clic droit</b> : terminer avec tous ses prérequis</li>
                <li><b className="text-text">Ctrl + Z</b> : annuler la dernière action</li>
                <li>Chaque cadre est une chaîne de quêtes, à lire de haut en bas. Cliquez son titre pour la replier.</li>
              </ul>
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-line pt-2 text-xs">
                {(['available', 'done', 'locked', 'unknown'] as Status[]).map((s) => { const I = STATUS[s].icon; return <li key={s} className={`inline-flex items-center gap-1 ${STATUS[s].text}`}><I size={12} />{STATUS[s].label}</li>; })}
                <li className="inline-flex items-center gap-1 text-info">● En cours</li>
              </ul>
            </div>
          )}
          {focus && (
            <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full border border-line bg-surface-2/95 px-4 py-1.5 text-sm shadow-lg">
              <span>Tout ce qui mène à <b>« {graph.nodes.get(focus)?.label} »</b></span>
              <Button variant="ghost" className="!px-2 !py-0.5" onClick={() => setFocus(null)}>Revenir à la région</Button>
            </div>
          )}
          {view.nodes.size > 0 ? (
            <FlowCanvas graph={graph} nodeIds={view.nodes} edges={view.edges} status={status} isActive={isActive} selected={selected}
              onSelect={select} onToggleDone={toggleDone} viewKey={focus ? `f${focus}` : `r${region}`} external={focus ? undefined : external}
              dofus={isDofus} dim={dim} collapsed={focus ? undefined : collapsed} onToggleChain={focus ? undefined : toggleChain} centerOn={centerOn}
              fitIds={focus ? [focus, ...preds(graph, focus).map((e) => e.from)] : undefined} />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted">
              Aucune quête ne correspond aux filtres dans cette région.
            </div>
          )}
          {sel && sel.kind !== 'gate' && (
            <QuestDrawer node={sel} graph={graph} status={status} ch={ch} region={categoryName.get(sel.category ?? -1)} givesDofus={dofusQuests.has(sel.id)}
              onMark={mark} onSelect={select} onFocusChain={(id) => { setFocus(id); setSelected(id); }}
              onClose={() => { setSelected(null); history.replaceState(null, '', window.location.pathname); }} />
          )}
          {undo && (
            <div role="status" className="absolute bottom-4 left-1/2 z-30 flex max-w-[92%] -translate-x-1/2 items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-2 text-sm shadow-2xl">
              <span className="min-w-0 truncate">{undo.label}</span>
              <button onClick={doUndo} className="inline-flex shrink-0 items-center gap-1 font-semibold text-brand hover:underline"><Undo2 size={14} /> Annuler</button>
              <button aria-label="Fermer" onClick={() => setUndo(null)} className="shrink-0 text-faint hover:text-text"><X size={14} /></button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
