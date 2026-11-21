'use client';
// Achievement journal. A first-time visitor lands on "Pour vous" (what to confirm, what is nearly done, what fits the
// class and level, each with its reason); categories are grouped into collapsible families (main progression first,
// Temporis and events apart); one search covers names, objectives (monsters, quests, places), dungeons and categories.
// Wide screens (≥ 1280 px) show the selected achievement in a side panel; narrower ones unfold it under its entry,
// and the category list becomes a drawer on phones.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ChevronDown, CircleDashed, Compass, History, LayoutList, MousePointerClick, ScanLine, Search, Shield, Sparkles, Star, TrendingUp, Trophy, X, type LucideIcon } from 'lucide-react';
import { SUPPORTED_BREEDS } from '../breeds';
import { classAchievements } from '../../src/class-quests.ts';
import type { AchievementCategory, AchievementInfo, AchievementMatch } from '../../src/load.ts';
import { achievementProgress, type AchievementState } from '../../src/achievements.ts';
import { DISPLAY, FAMILIES, ROOT_HINT, displayState, familyOf, isLevelOnly, recommend, rootOrder, type AchNode, type AchProgress, type DisplayState, type Family, type Rec } from '../../src/achievement-guide.ts';
import type { HistoryEntry } from '../../src/character.ts';
import { useAchievementProgress } from './useAchievementProgress';
import AchievementCard, { AchievementDetails, Medal, rootIcon, type CardCtx } from './AchievementCard';
import { Button, ButtonLink, EmptyState, ProgressBar } from '../ui';

type View = { kind: 'foryou' } | { kind: 'cat'; root: number; sub: number | null };
type Filter = 'all' | AchievementState;
type Sort = 'level' | 'progress' | 'points';
type Count = { done: number; total: number; points: number; maxPoints: number };
type CardFn = (a: AchievementInfo, extra?: { path?: boolean; note?: string }) => ReactNode;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tous' }, { id: 'not_started', label: 'À faire' }, { id: 'in_progress', label: 'En cours' },
  { id: 'ready', label: 'À confirmer' }, { id: 'obtained', label: 'Obtenus' },
];
const MATCH_LABEL: Record<AchievementMatch, string> = { name: 'nom', dungeon: 'donjon', objective: 'objectif', category: 'catégorie', description: 'description' };
const PAGE = 100;
const ZERO: Count = { done: 0, total: 0, points: 0, maxPoints: 0 };
const fmt = (n: number) => n.toLocaleString('fr-FR');
const pctOf = (done: number, total: number) => {
  const x = total ? (done / total) * 100 : 0;
  return `${x.toLocaleString('fr-FR', { maximumFractionDigits: x > 0 && x < 10 ? 1 : 0 })} %`;
};

// responses cached for the page's lifetime: going back to a category or a search is instant.
// API_V changes with the payload shape: browsers keep these responses an hour (max-age), a new page must not read old ones
const API_V = 'v=2';
const listCache = new Map<string, Promise<AchievementInfo[]>>();
const fetchList = (qs: string) => {
  let p = listCache.get(qs);
  if (!p) {
    p = fetch(`/api/achievements?${qs}&${API_V}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText)))).then((d: { achievements: AchievementInfo[] }) => d.achievements);
    p.catch(() => listCache.delete(qs));
    listCache.set(qs, p);
  }
  return p;
};
type Hit = { id: number; match: AchievementMatch; text: string; achievement: AchievementInfo };
const searchCache = new Map<string, Promise<Hit[]>>();
const fetchSearch = (q: string) => {
  let p = searchCache.get(q);
  if (!p) {
    p = fetch(`/api/achievements/search?q=${encodeURIComponent(q)}&${API_V}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText)))).then((d: { results: Hit[] }) => d.results);
    p.catch(() => searchCache.delete(q));
    searchCache.set(q, p);
  }
  return p;
};

const viewFromUrl = (): View => {
  const s = new URLSearchParams(location.search);
  const root = Number(s.get('c'));
  return root ? { kind: 'cat', root, sub: Number(s.get('s')) || null } : { kind: 'foryou' };
};
const urlOf = (v: View) => (v.kind === 'cat' ? `?c=${v.root}${v.sub ? `&s=${v.sub}` : ''}` : location.pathname);

const WIDE = '(min-width: 1280px)';
const subscribeWide = (cb: () => void) => { const m = matchMedia(WIDE); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); };
const useWide = () => useSyncExternalStore(subscribeWide, () => matchMedia(WIDE).matches, () => false);

export default function AchievementsView({ categories }: { categories: AchievementCategory[] }) {
  const { graph, ch, index, error, progress, recent } = useAchievementProgress();
  const wide = useWide();
  const [view, setView] = useState<View>({ kind: 'foryou' });
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [openA, setOpenA] = useState<AchievementInfo | null>(null); // the opened entry, when it was clicked (saves a fetch)
  const [navOpen, setNavOpen] = useState(false); // mobile category drawer
  const [collapsed, setCollapsed] = useState<Set<Family>>(() => new Set(['seasonal']));

  // the view lives in the URL (?c=root&s=sub) so the browser's back button moves between categories
  useEffect(() => {
    setView(viewFromUrl());
    const onPop = () => setView(viewFromUrl());
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);
  const go = useCallback((v: View, openId: number | null = null) => {
    history.pushState(null, '', urlOf(v));
    setView(v); setOpen(openId); setQuery(''); setNavOpen(false);
  }, []);

  // categories: roots in families, children, names
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const childrenOf = useMemo(() => {
    const m = new Map<number, AchievementCategory[]>();
    for (const c of categories) if (c.parentId != null) m.set(c.parentId, [...(m.get(c.parentId) ?? []), c]);
    return m;
  }, [categories]);
  const rootOf = useCallback((cat: number) => byId.get(cat)?.parentId ?? cat, [byId]);
  const rootName = useCallback((cat: number) => byId.get(rootOf(cat))?.name ?? '', [byId, rootOf]);
  const pathOf = useCallback((cat: number) => {
    const c = byId.get(cat);
    return !c ? '' : c.parentId != null ? `${byId.get(c.parentId)?.name} › ${c.name}` : c.name;
  }, [byId]);
  const families = useMemo(() => {
    const roots = categories.filter((c) => c.parentId == null && c.count + (childrenOf.get(c.id) ?? []).reduce((s, x) => s + x.count, 0) > 0);
    return FAMILIES.map((f) => ({ ...f, roots: roots.filter((r) => familyOf(r.name) === f.id).sort((a, b) => rootOrder(a.name) - rootOrder(b.name)) }))
      .filter((f) => f.roots.length);
  }, [categories, childrenOf]);

  // progress per category (sub-category ids), per root and overall (-1)
  const { counts, ready } = useMemo(() => {
    const m = new Map<number, Count>();
    let ready = 0;
    const bump = (k: number, done: boolean, pts: number) => {
      const c = m.get(k) ?? { ...ZERO };
      c.total++; c.maxPoints += pts;
      if (done) { c.done++; c.points += pts; }
      m.set(k, c);
    };
    for (const [id, p] of progress) {
      const pts = graph?.nodes.get(`ach:${id}`)?.points ?? 0;
      const done = p.state === 'obtained';
      if (p.state === 'ready') ready++;
      bump(p.category, done, pts);
      if (rootOf(p.category) !== p.category) bump(rootOf(p.category), done, pts);
      bump(-1, done, pts);
    }
    return { counts: m, ready };
  }, [progress, graph, rootOf]);

  const classReasons = useMemo(() => {
    const m = new Map<number, string>();
    const breed = SUPPORTED_BREEDS.find((b) => b.id === ch.character.profile.breed);
    if (!breed || !graph || !index) return { breed: null, m };
    const c = classAchievements(graph, index, breed.id, breed.name);
    for (const n of c.linked) m.set(n.refId, `Demande vos quêtes de classe ${breed.name}.`);
    for (const n of c.named) m.set(n.refId, `Porte le nom de votre classe (${breed.name}) ; ouvert à tous.`);
    return { breed, m };
  }, [graph, index, ch.character.profile.breed]);

  const nodes = useMemo<AchNode[]>(() => !graph ? [] : [...graph.nodes.values()].filter((n) => n.kind === 'achievement')
    .map((n) => ({ id: n.refId, label: n.label, level: n.level ?? 0, points: n.points ?? 0, category: n.category ?? -1 })), [graph]);
  const recs = useMemo(() => {
    // count met objectives that are only a level condition: they do not make an achievement "nearly done"
    const withLevel = new Map<number, AchProgress>();
    for (const [id, p] of progress) {
      const objs = index?.[id] ?? [];
      withLevel.set(id, { ...p, levelOnly: p.objectives.filter((s, i) => s === 'inferred' && isLevelOnly(objs[i]?.[1] ?? '')).length });
    }
    return recommend({ nodes, progress: withLevel, level: ch.character.level, classReasons: classReasons.m, rootName });
  }, [nodes, progress, index, ch.character.level, classReasons.m, rootName]);

  const provenance = useMemo(() => {
    const m = new Map<string, HistoryEntry>();
    for (const h of ch.character.history) for (const id of h.added) m.set(id, h);
    return m;
  }, [ch.character.history]);

  // open an achievement wherever it lives: its category, scrolled to and expanded
  const goTo = useCallback((achId: number) => {
    const cat = progress.get(achId)?.category;
    if (cat == null) return;
    const r = rootOf(cat);
    go({ kind: 'cat', root: r, sub: r === cat ? null : cat }, achId);
  }, [progress, rootOf, go]);

  const all = counts.get(-1) ?? ZERO;
  const loaded = !error && !!graph && !!index;
  const header = (
    <Dashboard loaded={loaded} all={all} ready={ready} query={query} setQuery={setQuery}
      who={ch.hasCharacter ? `${ch.character.name} · niveau ${ch.character.level}${classReasons.breed ? ` · ${classReasons.breed.name}` : ''}` : 'Aucun personnage : la progression reste dans ce navigateur.'} />
  );
  // the title is server-rendered even while the data loads (search engines, screen readers)
  if (!loaded) return (
    <div className="h-full overflow-y-auto">
      {header}
      <div className="mx-auto max-w-[1500px] px-4 py-6">
        {error ? <p className="text-sm text-muted">Impossible de charger les succès : {error}</p> : <ListSkeleton label="Chargement des succès…" />}
      </div>
    </div>
  );

  const ctx: CardCtx = { graph, progress: ch.progress, setMark: ch.setMark, goTo, provenance };
  const pOf = (a: AchievementInfo) => progress.get(a.id) ?? achievementProgress(a.id, [], ch.progress);
  const dOf = (a: AchievementInfo): DisplayState => displayState(pOf(a).state, a.level, ch.character.level, ch.hasCharacter);
  const detail = (a: AchievementInfo, onClose?: () => void) => (
    <AchievementDetails a={a} p={pOf(a)} display={dOf(a)} root={rootName(a.categoryId)} where={pathOf(a.categoryId)} ctx={ctx} onClose={onClose} inline={!onClose} />
  );
  const card: CardFn = (a, extra = {}) => (
    <AchievementCard key={a.id} a={a} p={pOf(a)} display={dOf(a)} root={rootName(a.categoryId)}
      path={extra.path ? pathOf(a.categoryId) : undefined} note={extra.note} open={open === a.id} inline={!wide}
      onToggle={() => { if (open === a.id) setOpen(null); else { setOpen(a.id); setOpenA(a); } }}
      details={!wide && open === a.id ? detail(a) : null} />
  );

  const current = view.kind === 'cat' ? byId.get(view.root)?.name ?? 'Catégorie' : 'Pour vous';
  const nav = (
    <CategoryNav families={families} counts={counts} view={view} go={go}
      collapsed={collapsed} toggle={(f) => setCollapsed((s) => { const n = new Set(s); if (n.has(f)) n.delete(f); else n.add(f); return n; })} />
  );

  return (
    <div className="h-full overflow-y-auto">
      {header}
      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 md:grid-cols-[236px_minmax(0,1fr)] xl:grid-cols-[236px_minmax(0,1fr)_minmax(360px,420px)]">
        {/* desktop: the whole map of categories stays at hand */}
        <aside className="hidden md:block">
          <div className="sticky top-4 max-h-[calc(100dvh-8rem)] overflow-y-auto pb-4 pr-1">{nav}</div>
        </aside>

        <div className="min-w-0">
          {/* phones: one button opens the category drawer */}
          <button className="mb-4 flex w-full items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2.5 text-sm transition-colors hover:border-faint md:hidden"
            aria-expanded={navOpen} aria-haspopup="dialog" onClick={() => setNavOpen(true)}>
            <span className="flex min-w-0 items-center gap-2"><LayoutList size={16} className="shrink-0 text-accent" aria-hidden /> <span className="truncate">Parcourir : <b>{current}</b></span></span>
            <ChevronDown size={16} className="shrink-0 text-faint" aria-hidden />
          </button>

          {query.trim().length >= 2 ? <SearchResults q={query.trim()} card={card} />
            : view.kind === 'foryou' ? <ForYou recs={recs} card={card} breed={classReasons.breed?.name ?? null} hasCharacter={ch.hasCharacter}
              level={ch.character.level} started={ch.progress.done.size > 0 /* anything marked (quest, achievement, objective); level alone does not count */}
              recent={recent} label={(id) => graph.nodes.get(id)?.label ?? id} goTo={goTo} openCat={(name) => {
                const r = families.flatMap((f) => f.roots).find((c) => c.name === name);
                if (r) go({ kind: 'cat', root: r.id, sub: null });
              }} />
            : <CategoryPanel key={view.root} view={view} cat={byId.get(view.root)} subs={childrenOf.get(view.root) ?? []} counts={counts}
              progress={progress} level={ch.character.level} hasCharacter={ch.hasCharacter} open={open} card={card} wide={wide}
              setSub={(sub) => go({ kind: 'cat', root: view.root, sub })} />}
        </div>

        {wide && (
          <aside aria-label="Succès sélectionné">
            <div className="sticky top-4 max-h-[calc(100dvh-8rem)] overflow-y-auto pb-4">
              {open != null ? <DetailPanel key={open} id={open} seed={openA} render={(a) => detail(a, () => setOpen(null))} /> : <PanelHint />}
            </div>
          </aside>
        )}
      </div>
      {navOpen && <Drawer onClose={() => setNavOpen(false)}>{nav}</Drawer>}
    </div>
  );
}

function Dashboard({ loaded, all, ready, who, query, setQuery }: { loaded: boolean; all: Count; ready: number; who: string; query: string; setQuery: (q: string) => void }) {
  return (
    <header className="relative isolate overflow-hidden border-b border-accent/25 bg-surface">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_srgb,var(--color-sec-achievements)_38%,transparent),transparent_65%)]" />
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:gap-6 lg:py-5">
        <div className="flex min-w-0 items-center gap-4">
          <ProgressRing value={all.done} max={all.total} loaded={loaded} />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#e9c784]">Journal de l’aventurier</p>
            <h1 className="title-hero text-2xl leading-tight text-white sm:text-[1.75rem]">Succès</h1>
            <p className="truncate text-xs text-muted">{who}</p>
          </div>
        </div>
        {loaded && (
          <dl className="grid grid-cols-3 overflow-hidden rounded-md border border-line bg-bg/40 lg:ml-auto">
            <Stat label="Points" value={fmt(all.points)} sub={`/ ${fmt(all.maxPoints)}`} />
            <Stat label="Obtenus" value={fmt(all.done)} sub={`/ ${fmt(all.total)}`} />
            <Stat label="À confirmer" value={fmt(ready)} accent={ready > 0} />
          </dl>
        )}
        <div className={`flex gap-2 lg:w-[24rem] ${loaded ? '' : 'lg:ml-auto'}`}>
          <SearchBox value={query} onChange={setQuery} disabled={!loaded} />
          <ButtonLink href="/progression/scan" variant="primary" className="shrink-0 !px-3" title="Scanner ma progression">
            <ScanLine size={16} aria-hidden /><span className="sr-only sm:not-sr-only">Scanner</span>
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="border-l border-line px-3 py-2 text-left first:border-l-0">
      <dt className="text-[10.5px] font-medium uppercase tracking-wider text-faint">{label}</dt>
      <dd className="truncate leading-tight">
        <span className={`font-display text-lg tabular-nums ${accent ? 'text-accent' : 'text-text'}`}>{value}</span>
        {sub && <span className="ml-1 text-[11px] tabular-nums text-faint">{sub}</span>}
      </dd>
    </div>
  );
}

function ProgressRing({ value, max, loaded }: { value: number; max: number; loaded: boolean }) {
  const r = 27, c = 2 * Math.PI * r;
  if (!loaded) return <span className="flex size-16 shrink-0 items-center justify-center rounded-full border-[5px] border-line text-accent"><Trophy size={22} aria-hidden /></span>;
  return (
    <div className="relative size-16 shrink-0" role="img" aria-label={`Progression : ${value} succès obtenus sur ${max}`}>
      <svg viewBox="0 0 64 64" className="size-full -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-line)" strokeWidth="5" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-accent)" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - (max ? value / max : 0))} className="transition-[stroke-dashoffset] duration-700 ease-out" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-[13px] text-text">{pctOf(value, max)}</span>
    </div>
  );
}

function SearchBox({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className="relative min-w-0 flex-1">
      <span className="sr-only">Rechercher un succès, un monstre, un donjon, une quête…</span>
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden />
      <input value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && onChange('')}
        type="search" placeholder="Succès, monstre, donjon, quête…" disabled={disabled}
        className="w-full rounded-md border border-line bg-bg/60 py-2 pl-9 pr-9 text-sm transition-colors placeholder:text-faint hover:border-faint focus:border-accent disabled:opacity-60 [&::-webkit-search-cancel-button]:appearance-none" />
      {value && (
        <button onClick={() => onChange('')} aria-label="Effacer la recherche" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-faint hover:text-text">
          <X size={15} aria-hidden />
        </button>
      )}
    </label>
  );
}

/** Small completion ring for the sidebar. */
function MiniRing({ done, total, on }: { done: number; total: number; on: boolean }) {
  const r = 6, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 16 16" className={`size-4 shrink-0 -rotate-90 ${done && done === total ? 'text-done' : on ? 'text-accent' : 'text-faint'}`} aria-hidden>
      <circle cx="8" cy="8" r={r} fill="none" stroke="currentColor" strokeOpacity={0.25} strokeWidth="2" />
      {done > 0 && <circle cx="8" cy="8" r={r} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - done / total)} />}
    </svg>
  );
}

function CategoryNav({ families, counts, view, go, collapsed, toggle }: {
  families: { id: Family; label: string; roots: AchievementCategory[] }[]; counts: Map<number, Count>; view: View;
  go: (v: View) => void; collapsed: Set<Family>; toggle: (f: Family) => void;
}) {
  const item = (on: boolean) => `group relative flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors duration-150 ${on ? 'bg-gradient-to-r from-accent/[0.13] to-accent/[0.02] text-text' : 'text-muted hover:bg-surface/80 hover:text-text'}`;
  const tile = (on: boolean) => `flex size-7 shrink-0 items-center justify-center rounded-md transition-colors duration-150 ${on ? 'bg-accent/15 text-accent ring-1 ring-accent/35' : 'bg-surface/80 text-faint group-hover:bg-surface-2 group-hover:text-muted'}`;
  const edge = (on: boolean) => <span className={`absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent transition-opacity ${on ? 'opacity-100' : 'opacity-0'}`} aria-hidden />;
  return (
    <nav aria-label="Catégories de succès" className="flex flex-col gap-5 text-[13.5px]">
      <button onClick={() => go({ kind: 'foryou' })} aria-current={view.kind === 'foryou' ? 'page' : undefined} className={item(view.kind === 'foryou')}>
        {edge(view.kind === 'foryou')}
        <span className={tile(view.kind === 'foryou')}><Sparkles size={15} aria-hidden /></span>
        <span className="font-medium">Pour vous</span>
      </button>
      {families.map((f) => {
        const active = view.kind === 'cat' && f.roots.some((r) => r.id === view.root);
        const expanded = active || !collapsed.has(f.id);
        return (
          <div key={f.id}>
            <button onClick={() => toggle(f.id)} aria-expanded={expanded} disabled={active}
              className="flex w-full items-center gap-1.5 px-2 pb-1.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint transition-colors enabled:hover:text-muted">
              <span className="flex-1">{f.label}</span>
              {!active && <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`} aria-hidden />}
            </button>
            {expanded && (
              <ul className="appear flex flex-col gap-0.5">
                {f.roots.map((c) => {
                  const n = counts.get(c.id) ?? ZERO;
                  const on = view.kind === 'cat' && view.root === c.id;
                  const Icon = rootIcon(c.name);
                  // "La Source : L'Héritage des Dofus": the subtitle goes on its own line instead of being cut
                  const [main, sub] = c.name.split(' : ');
                  return (
                    <li key={c.id}>
                      <button onClick={() => go({ kind: 'cat', root: c.id, sub: null })} aria-current={on ? 'page' : undefined} className={item(on)}>
                        {edge(on)}
                        <span className={tile(on)}><Icon size={15} strokeWidth={1.75} aria-hidden /></span>
                        <span className="min-w-0 flex-1 leading-tight">
                          <span className={on ? 'font-medium' : ''}>{main}</span>
                          {sub && <span className="block text-[11px] text-faint">{sub}</span>}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 text-[10.5px] tabular-nums text-faint" title={`${n.done} obtenus sur ${n.total}`}>
                          {n.done}/{n.total}<MiniRing done={n.done} total={n.total} on={on} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function Drawer({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => { close.current?.focus(); }, []);
  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Catégories"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="appear absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div className="drawer-in absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col border-r border-line bg-bg shadow-lg">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="font-display text-lg">Catégories</p>
          <button ref={close} onClick={onClose} aria-label="Fermer la liste des catégories" className="rounded p-1.5 text-muted hover:bg-surface hover:text-text"><X size={18} aria-hidden /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{children}</div>
      </div>
    </div>
  );
}

function DetailPanel({ id, seed, render }: { id: number; seed: AchievementInfo | null; render: (a: AchievementInfo) => ReactNode }) {
  const [fetched, setFetched] = useState<AchievementInfo | null>(null);
  const has = seed?.id === id;
  useEffect(() => {
    if (has) return;
    let live = true;
    fetchList(`ids=${id}`).then((l) => live && setFetched(l[0] ?? null), () => {});
    return () => { live = false; };
  }, [id, has]);
  const a = has ? seed : fetched;
  return a ? render(a) : <div className="h-72 animate-pulse rounded-lg border border-line bg-surface" role="status"><span className="sr-only">Chargement…</span></div>;
}

function PanelHint() {
  return (
    <div className="rounded-lg border border-dashed border-line p-5 text-sm">
      <p className="flex items-center gap-2 font-display text-base"><MousePointerClick size={16} className="text-accent" aria-hidden /> Choisissez un succès</p>
      <p className="mt-1 text-muted">Ses objectifs, ce qu’il rapporte et où aller s’affichent ici.</p>
      <ul className="mt-4 flex flex-col gap-2.5">
        {(Object.keys(DISPLAY) as DisplayState[]).map((d) => (
          <li key={d} className="flex items-center gap-3">
            <Medal root="" display={d} met={d === 'in_progress' ? 1 : 0} total={d === 'in_progress' ? 2 : 0} size={36} />
            <span><b className="font-medium text-text">{DISPLAY[d].label}</b><span className="block text-xs text-muted">{DISPLAY[d].help}</span></span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] text-faint">« Plus tard » : niveau du succès supérieur au vôtre de plus de 10. Ce n’est pas un verrou du jeu.</p>
    </div>
  );
}

function ListSkeleton({ rows = 6, label = 'Chargement…' }: { rows?: number; label?: string }) {
  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <ul aria-hidden className="divide-y divide-line/70 overflow-hidden rounded-lg border border-line bg-surface/70">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3">
            <span className="size-10 shrink-0 animate-pulse rounded-md bg-surface-2" />
            <span className="flex flex-1 flex-col gap-2">
              <span className="h-3 animate-pulse rounded bg-surface-2" style={{ width: `${40 + ((i * 17) % 30)}%` }} />
              <span className="h-2.5 w-3/5 animate-pulse rounded bg-surface-2/70" />
            </span>
            <span className="h-4 w-10 animate-pulse rounded bg-surface-2" />
          </li>
        ))}
      </ul>
    </div>
  );
}

const LIST = 'divide-y divide-line/60 overflow-hidden rounded-xl border border-line/80 bg-surface/60 shadow-[0_1px_2px_rgb(0_0_0/0.25)]';

function SearchResults({ q, card }: { q: string; card: CardFn }) {
  const [res, setRes] = useState<{ q: string; hits: Hit[] } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    setFailed(false);
    const t = setTimeout(() => fetchSearch(q).then((hits) => live && setRes({ q, hits }), () => live && setFailed(true)), 220); // typing pause
    return () => { live = false; clearTimeout(t); };
  }, [q]);
  if (failed) return <EmptyState title="La recherche n’a pas pu aboutir">Réessayez dans un instant.</EmptyState>;
  if (!res) return <ListSkeleton rows={4} label="Recherche…" />;
  const { hits } = res;
  return (
    <section aria-live="polite" className={`flex flex-col gap-3 transition-opacity ${res.q !== q ? 'opacity-60' : ''}`}>
      <h2 className="font-display text-lg">{hits.length ? `${hits.length}${hits.length === 40 ? '+' : ''} résultat${hits.length > 1 ? 's' : ''} pour « ${res.q} »` : `Aucun succès pour « ${res.q} »`}</h2>
      {hits.length === 0 ? <EmptyState title="Essayez un autre mot">La recherche couvre les noms, les objectifs (monstres, quêtes, lieux), les donjons et les catégories.</EmptyState> : (
        <ul className={`appear ${LIST}`} aria-label={`Résultats pour « ${res.q} »`}>
          {hits.map((h) => card(h.achievement, { path: true, note: h.match === 'name' ? undefined : `Trouvé dans : ${MATCH_LABEL[h.match]} « ${h.text.length > 90 ? `${h.text.slice(0, 90)}…` : h.text} »` }))}
        </ul>
      )}
    </section>
  );
}

function ForYou({ recs, card, breed, hasCharacter, level, started, recent, label, goTo, openCat }: {
  recs: ReturnType<typeof recommend>; card: CardFn;
  breed: string | null; hasCharacter: boolean; level: number; started: boolean;
  recent: { id: string; at: string }[]; label: (id: string) => string; goTo: (id: number) => void; openCat: (rootName: string) => void;
}) {
  const ids = useMemo(() => [...recs.ready, ...recs.almost, ...recs.forClass, ...recs.forLevel].map((r) => r.id), [recs]);
  const [rows, setRows] = useState<Map<number, AchievementInfo> | null>(null);
  const key = ids.join(',');
  useEffect(() => {
    if (!key) { setRows(new Map()); return; }
    let live = true;
    fetchList(`ids=${key}`).then((list) => live && setRows(new Map(list.map((a) => [a.id, a]))), () => live && setRows(new Map()));
    return () => { live = false; };
  }, [key]);

  const block = (Icon: LucideIcon, title: string, help: string, list: Rec[], empty?: string) => (list.length || empty) ? (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-accent/30 bg-accent/10 text-accent"><Icon size={16} aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg leading-tight">{title}</h2>
          <p className="text-xs text-muted">{help}</p>
        </div>
        {list.length > 0 && <span className="mt-1 rounded-full border border-line px-2 py-0.5 text-[11px] tabular-nums text-faint">{list.length}</span>}
      </div>
      {list.length === 0 ? <p className="rounded-md border border-dashed border-line px-3 py-2 text-sm text-muted">{empty}</p> : !rows ? <ListSkeleton rows={Math.min(list.length, 3)} /> : (
        <ul className={`appear ${LIST}`}>
          {list.map((r) => rows.get(r.id) && card(rows.get(r.id)!, { path: true, note: r.reason }))}
        </ul>
      )}
    </section>
  ) : null;

  return (
    <div className="flex flex-col gap-7">
      {!started && (
        <section className="parchment rounded-lg border border-[#c4a46e] p-4 sm:p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg"><Compass size={18} className="text-accent" aria-hidden /> Par où commencer ?</h2>
          <ol className="grid gap-3 text-sm lg:grid-cols-3">
            {[
              'Les succès récompensent ce que vous faites déjà : quêtes, zones découvertes, monstres et donjons vaincus.',
              <>Ouvrez un succès pour voir ses objectifs. Ceux liés à des quêtes se cochent seuls quand vous terminez ces quêtes dans le <a className="underline" href="/progression/quetes">suivi des quêtes</a>.</>,
              'Le reste, seul le jeu le sait : cochez-le vous-même, ou importez une capture avec le scanner.',
            ].map((t, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-accent/60 font-display text-xs text-accent">{i + 1}</span>
                <span className="text-muted">{t}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            {['Quêtes', 'Exploration', 'Monstres', 'Donjons'].map((n) => {
              const I = rootIcon(n);
              return <Button key={n} className="!py-1.5 text-xs" onClick={() => openCat(n)}><I size={14} aria-hidden /> {n}</Button>;
            })}
          </div>
        </section>
      )}
      {block(Star, 'À confirmer', 'Tous les objectifs sont remplis d’après votre progression : vérifiez dans le jeu, puis confirmez.', recs.ready)}
      {block(CircleDashed, 'Presque terminés', 'Une partie des objectifs est déjà remplie, à 20 niveaux au plus au-dessus du vôtre.', recs.almost)}
      {breed && block(Shield, `Pour votre classe · ${breed}`, 'Liés à votre classe par les données du jeu. Les autres succès restent tous accessibles.', recs.forClass, 'Tous les succès liés à votre classe sont obtenus.')}
      {block(TrendingUp, hasCharacter ? 'À votre niveau' : 'Pour débuter', hasCharacter
        ? `Succès non commencés de la progression principale, entre les niveaux ${Math.max(1, level - 10)} et ${Math.max(15, level + 5)} (3 au plus par catégorie).`
        : 'Succès de bas niveau de la progression principale. Créez un personnage pour des suggestions à votre niveau.', recs.forLevel, 'Rien de nouveau à votre niveau dans la progression principale.')}
      {recent.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg"><History size={16} className="text-muted" aria-hidden /> Derniers obtenus</h2>
          <ul className={LIST}>
            {recent.map((r) => (
              <li key={r.id}><button onClick={() => goTo(Number(r.id.slice(4)))} className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-surface-2/50">
                <span className="truncate">{label(r.id)}</span><span className="shrink-0 text-xs text-faint">{new Date(r.at).toLocaleDateString('fr-FR')}</span>
              </button></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function CategoryPanel({ view, cat, subs, counts, progress, level, hasCharacter, open, card, wide, setSub }: {
  view: { root: number; sub: number | null }; cat?: AchievementCategory; subs: AchievementCategory[];
  counts: Map<number, Count>;
  progress: Map<number, { state: AchievementState; met: number; total: number }>;
  level: number; hasCharacter: boolean; open: number | null; card: CardFn; wide: boolean; setSub: (sub: number | null) => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [atLevel, setAtLevel] = useState(false);
  const [sort, setSort] = useState<Sort>('level');
  const [list, setList] = useState<AchievementInfo[] | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const subsWithItems = subs.filter((s) => s.count > 0);
  const ids = view.sub != null ? [view.sub] : [view.root, ...subs.map((s) => s.id)];
  const qs = `categories=${ids.join(',')}`;
  useEffect(() => {
    let live = true;
    setList(null); setLimit(PAGE);
    fetchList(qs).then((l) => live && setList(l), () => live && setList([]));
    return () => { live = false; };
  }, [qs]);
  useEffect(() => setLimit(PAGE), [filter, atLevel, sort]);
  useEffect(() => { if (open != null && list) document.getElementById(`ach-${open}`)?.scrollIntoView({ block: 'center' }); }, [open, list]);

  // per-state counts on the filter buttons follow the level filter, so each button says what it will show
  const { shown, byState } = useMemo(() => {
    const p = (id: number) => progress.get(id);
    const ratio = (id: number) => { const x = p(id); return x?.total ? x.met / x.total : 0; };
    const inLevel = (list ?? []).filter((a) => !atLevel || a.level <= level + 5);
    const byState = new Map<Filter, number>([['all', inLevel.length]]);
    for (const a of inLevel) { const s = p(a.id)?.state; if (s) byState.set(s, (byState.get(s) ?? 0) + 1); }
    const out = inLevel.filter((a) => filter === 'all' || p(a.id)?.state === filter);
    if (sort === 'progress') out.sort((a, b) => Number(p(b.id)?.state === 'ready') - Number(p(a.id)?.state === 'ready') || ratio(b.id) - ratio(a.id) || a.level - b.level);
    else if (sort === 'points') out.sort((a, b) => b.points - a.points || a.level - b.level);
    return { shown: out, byState };
  }, [list, filter, atLevel, sort, progress, level]);
  // big categories (Donjons: 743) are rendered by pages of 100: all at once cost ~0.9 s of main thread on mobile
  const visible = shown.slice(0, Math.max(limit, shown.findIndex((a) => a.id === open) + 1));
  const c = counts.get(view.sub ?? view.root) ?? ZERO;
  const name = cat?.name ?? '';
  const subName = subs.find((s) => s.id === view.sub)?.name;
  const Icon = rootIcon(name);

  return (
    <section aria-labelledby="cat-title" className="flex flex-col gap-4">
      <header className="overflow-hidden rounded-xl border border-line/80 bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.25)]">
        <div className="flex items-start gap-4 p-4 sm:p-5">
          <span className="diamond mt-1 hidden size-10 shrink-0 items-center justify-center border border-accent/40 bg-accent/10 text-accent sm:flex"><Icon size={19} strokeWidth={1.75} aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <h2 id="cat-title" className="font-display text-xl leading-tight">{name}{subName ? <span className="text-muted"> › {subName}</span> : null}</h2>
            {ROOT_HINT[name] && <p className="mt-0.5 text-sm text-muted">{ROOT_HINT[name]}</p>}
            <p className="mt-1.5 text-xs tabular-nums text-faint sm:hidden"><b className="text-text">{pctOf(c.done, c.total)}</b> · {c.done}/{c.total} obtenus · {fmt(c.points)}/{fmt(c.maxPoints)} pts</p>
          </div>
          <div className="hidden shrink-0 text-right sm:block">
            <p className="font-display text-xl tabular-nums leading-tight">{pctOf(c.done, c.total)}</p>
            <p className="text-xs tabular-nums text-faint">{c.done}/{c.total} · {fmt(c.points)}/{fmt(c.maxPoints)} pts</p>
          </div>
        </div>
        <ProgressBar value={c.done} max={c.total} className="!h-1 !rounded-none" label={`${name} : ${c.done} sur ${c.total}`} />
        {subsWithItems.length > 0 && (
          // chips wrap on desktop and scroll sideways on mobile: every sub-category is one tap away, nothing is clipped
          <div role="group" aria-label="Sous-catégories" className="flex gap-1.5 overflow-x-auto border-t border-line bg-bg/30 px-4 py-3 sm:flex-wrap sm:overflow-visible">
            {[{ id: null as number | null, name: 'Toutes' }, ...subsWithItems].map((s) => {
              const n = s.id == null ? null : counts.get(s.id);
              const active = view.sub === s.id;
              return (
                <button key={s.id ?? 'all'} onClick={() => setSub(s.id)} aria-pressed={active}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${active ? 'border-accent/70 bg-accent/15 text-text' : 'border-line text-muted hover:border-faint hover:text-text'}`}>
                  {s.name}{n ? <span className="ml-1.5 tabular-nums text-faint">{n.done}/{n.total}</span> : null}
                </button>
              );
            })}
          </div>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filtrer par état" className="flex max-w-full gap-0.5 overflow-x-auto rounded-md border border-line bg-surface p-0.5">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}
              className={`shrink-0 rounded px-2.5 py-1 text-xs transition-colors ${filter === f.id ? 'bg-surface-2 text-text ring-1 ring-accent/50' : 'text-muted hover:text-text'}`}>
              {f.label} <span className="tabular-nums text-faint">{byState.get(f.id) ?? 0}</span>
            </button>
          ))}
        </div>
        {hasCharacter && (
          <label className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${atLevel ? 'border-accent/60 bg-accent/10 text-text' : 'border-line text-muted hover:text-text'}`}>
            <input type="checkbox" checked={atLevel} onChange={(e) => setAtLevel(e.target.checked)} className="accent-[var(--color-accent)]" />
            Jusqu’au niveau {level + 5}
          </label>
        )}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-muted">Trier
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-md border border-line bg-surface px-2 py-1.5 text-xs text-text">
            <option value="level">par niveau</option>
            <option value="progress">par progression</option>
            <option value="points">par points</option>
          </select>
        </label>
      </div>

      {list === null ? <ListSkeleton /> : shown.length === 0 ? (
        <EmptyState title="Aucun succès ici avec ces filtres">{filter !== 'all' || atLevel ? 'Revenez sur « Tous » ou décochez le filtre de niveau.' : null}</EmptyState>
      ) : (
        <ul key={`${filter}-${sort}-${atLevel}`} className={`appear ${LIST}`} aria-label={`Succès : ${name}${subName ? ` › ${subName}` : ''}`}>
          {visible.map((a) => card(a, { path: view.sub == null && subs.length > 0 }))}
        </ul>
      )}
      {visible.length < shown.length && (
        <Button className="w-full" onClick={() => setLimit((n) => n + PAGE)}>
          Afficher les {Math.min(PAGE, shown.length - visible.length)} suivants ({shown.length - visible.length} restants)
        </Button>
      )}
      {!wide && <p className="text-[11px] text-faint">États : {Object.values(DISPLAY).map((d) => d.label).join(' · ')}. « Plus tard » : niveau du succès supérieur au vôtre de plus de 10.</p>}
    </section>
  );
}
