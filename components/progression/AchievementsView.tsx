'use client';
// Achievement journal. A first-time visitor lands on "Pour vous" (what to confirm, what is nearly done, what fits the
// class and level, each with its reason); categories are grouped into families (main progression first, Temporis and
// events apart); one search covers names, objectives (monsters, quests, places), dungeons and categories.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Compass, History, LayoutList, ScanLine, Search, Sparkles, Trophy, X } from 'lucide-react';
import { SUPPORTED_BREEDS } from '../breeds';
import { classAchievements } from '../../src/class-quests.ts';
import type { AchievementCategory, AchievementInfo, AchievementMatch } from '../../src/load.ts';
import { achievementProgress, type AchievementState } from '../../src/achievements.ts';
import { DISPLAY, FAMILIES, ROOT_HINT, displayState, familyOf, isLevelOnly, recommend, rootOrder, type AchNode, type AchProgress, type Rec } from '../../src/achievement-guide.ts';
import type { HistoryEntry } from '../../src/character.ts';
import { useAchievementProgress } from './useAchievementProgress';
import AchievementCard, { type CardCtx } from './AchievementCard';
import { Button, ButtonLink, EmptyState, PageHero, ProgressBar, SECTION } from '../ui';

type View = { kind: 'foryou' } | { kind: 'cat'; root: number; sub: number | null };
type Filter = 'all' | AchievementState;
type Sort = 'level' | 'progress' | 'points';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tous' }, { id: 'not_started', label: 'À faire' }, { id: 'in_progress', label: 'En cours' },
  { id: 'ready', label: 'À confirmer' }, { id: 'obtained', label: 'Obtenus' },
];
const MATCH_LABEL: Record<AchievementMatch, string> = { name: 'nom', dungeon: 'donjon', objective: 'objectif', category: 'catégorie', description: 'description' };
const PAGE = 100;

// responses cached for the page's lifetime: going back to a category or a search is instant
const listCache = new Map<string, Promise<AchievementInfo[]>>();
const fetchList = (qs: string) => {
  let p = listCache.get(qs);
  if (!p) {
    p = fetch(`/api/achievements?${qs}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText)))).then((d: { achievements: AchievementInfo[] }) => d.achievements);
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
    p = fetch(`/api/achievements/search?q=${encodeURIComponent(q)}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText)))).then((d: { results: Hit[] }) => d.results);
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

export default function AchievementsView({ categories }: { categories: AchievementCategory[] }) {
  const { graph, ch, index, error, progress, recent } = useAchievementProgress();
  const [view, setView] = useState<View>({ kind: 'foryou' });
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [navOpen, setNavOpen] = useState(false); // mobile category picker

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

  // progress per category (sub-category ids) and per root
  const counts = useMemo(() => {
    const m = new Map<number, { done: number; total: number; points: number }>();
    const bump = (k: number, done: boolean, pts: number) => { const c = m.get(k) ?? { done: 0, total: 0, points: 0 }; c.total++; if (done) { c.done++; c.points += pts; } m.set(k, c); };
    for (const [id, p] of progress) {
      const pts = graph?.nodes.get(`ach:${id}`)?.points ?? 0;
      const done = p.state === 'obtained';
      bump(p.category, done, pts);
      if (rootOf(p.category) !== p.category) bump(rootOf(p.category), done, pts);
      bump(-1, done, pts); // everything
    }
    return m;
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

  const ctx: CardCtx | null = graph ? { graph, progress: ch.progress, setMark: ch.setMark, goTo, provenance } : null;
  const card = (a: AchievementInfo, extra: { path?: boolean; note?: string } = {}) => {
    const p = progress.get(a.id) ?? achievementProgress(a.id, [], ch.progress);
    return (
      <AchievementCard key={a.id} a={a} p={p} display={displayState(p.state, a.level, ch.character.level, ch.hasCharacter)}
        path={extra.path ? pathOf(a.categoryId) : undefined} note={extra.note}
        open={open === a.id} onToggle={() => setOpen(open === a.id ? null : a.id)} ctx={ctx!} />
    );
  };

  const all = counts.get(-1) ?? { done: 0, total: 0, points: 0 };
  const hero = (
    <PageHero color={SECTION.achievements} kicker="Journal de l’aventurier" title={<span className="inline-flex items-center gap-3"><Trophy size={26} className="text-[#ffe2a6]" aria-hidden /> Succès</span>}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-56 flex-1">
          <p className="text-sm text-white/85">{ch.hasCharacter ? `${ch.character.name} · niv. ${ch.character.level}${classReasons.breed ? ` · ${classReasons.breed.name}` : ''}` : 'Aucun personnage : la progression reste dans ce navigateur.'}</p>
          {all.total > 0 && (
            <div className="mt-2 max-w-md">
              <p className="mb-1 text-xs text-white/75"><b className="text-white">{all.done}</b> obtenus sur {all.total} · <b className="text-white">{all.points}</b> points</p>
              <ProgressBar value={all.done} max={all.total} label={`${all.done} succès obtenus sur ${all.total}`} />
            </div>
          )}
        </div>
        <ButtonLink href="/progression/scan" variant="primary"><ScanLine size={16} aria-hidden /> Scanner ma progression</ButtonLink>
      </div>
    </PageHero>
  );
  // the title is server-rendered even while the data loads (search engines, screen readers)
  if (error || !graph || !index || !ctx) return (
    <div className="h-full overflow-y-auto">
      {hero}
      <p className="p-8 text-sm text-muted">{error ? `Impossible de charger les succès : ${error}` : 'Chargement des succès…'}</p>
    </div>
  );

  const current = view.kind === 'cat' ? byId.get(view.root)?.name ?? 'Catégorie' : 'Pour vous';
  const nav = (
    <nav aria-label="Catégories de succès" className="flex flex-col gap-4">
      <button onClick={() => go({ kind: 'foryou' })} aria-current={view.kind === 'foryou' ? 'page' : undefined}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium ${view.kind === 'foryou' ? 'bg-accent/15 text-text ring-1 ring-accent/50' : 'text-muted hover:bg-surface hover:text-text'}`}>
        <Sparkles size={16} className="text-accent" aria-hidden /> Pour vous
      </button>
      {families.map((f) => (
        <div key={f.id}>
          <h2 className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-faint">{f.label}</h2>
          <ul className="flex flex-col gap-0.5">
            {f.roots.map((c) => {
              const n = counts.get(c.id) ?? { done: 0, total: 0, points: 0 };
              const active = view.kind === 'cat' && view.root === c.id;
              return (
                <li key={c.id}>
                  <button onClick={() => go({ kind: 'cat', root: c.id, sub: null })} aria-current={active ? 'page' : undefined}
                    className={`w-full rounded-lg px-3 py-1.5 text-left text-sm ${active ? 'bg-surface-2 text-text' : 'text-muted hover:bg-surface hover:text-text'}`}>
                    <span className="flex justify-between gap-2"><span>{c.name}</span><span className="text-xs tabular-nums text-faint">{n.done}/{n.total}</span></span>
                    <ProgressBar value={n.done} max={n.total} className="mt-1 !h-1" label={`${c.name} : ${n.done} sur ${n.total}`} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="h-full overflow-y-auto">
      {hero}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 md:grid-cols-[240px_minmax(0,1fr)]">
        {/* desktop: the whole map of categories stays visible */}
        <aside className="hidden md:block"><div className="sticky top-4">{nav}</div></aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* mobile: one button opens the category list instead of a shrunk sidebar */}
            <button className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm md:hidden"
              aria-expanded={navOpen} aria-controls="ach-nav-mobile" onClick={() => setNavOpen(!navOpen)}>
              <span className="flex items-center gap-2"><LayoutList size={16} aria-hidden /> Parcourir : <b>{current}</b></span>
              <span className="text-xs text-muted">{navOpen ? 'Fermer' : 'Changer'}</span>
            </button>
            <SearchBox value={query} onChange={setQuery} />
          </div>
          {navOpen && <div id="ach-nav-mobile" className="appear mb-4 rounded-lg border border-line bg-surface p-3 md:hidden">{nav}</div>}

          {query.trim().length >= 2 ? <SearchResults q={query.trim()} card={card} />
            : view.kind === 'foryou' ? <ForYou recs={recs} card={card} breed={classReasons.breed?.name ?? null} hasCharacter={ch.hasCharacter}
              level={ch.character.level} started={ch.progress.done.size > 0 /* anything marked (quest, achievement, objective); level alone does not count */}
              recent={recent} label={(id) => graph.nodes.get(id)?.label ?? id} goTo={goTo} openCat={(name) => {
                const r = families.flatMap((f) => f.roots).find((c) => c.name === name);
                if (r) go({ kind: 'cat', root: r.id, sub: null });
              }} />
            : <CategoryPanel key={view.root} view={view} cat={byId.get(view.root)} subs={childrenOf.get(view.root) ?? []} counts={counts}
              progress={progress} level={ch.character.level} hasCharacter={ch.hasCharacter} open={open} card={card}
              setSub={(sub) => go({ kind: 'cat', root: view.root, sub })} />}
        </div>
      </div>
    </div>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="relative flex-1">
      <span className="sr-only">Rechercher un succès, un monstre, un donjon, une quête…</span>
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden />
      <input value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && onChange('')}
        type="search" placeholder="Succès, monstre, donjon, quête…"
        className="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-9 text-sm placeholder:text-faint focus:border-accent" />
      {value && (
        <button onClick={() => onChange('')} aria-label="Effacer la recherche" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-faint hover:text-text">
          <X size={15} aria-hidden />
        </button>
      )}
    </label>
  );
}

function SearchResults({ q, card }: { q: string; card: (a: AchievementInfo, extra?: { path?: boolean; note?: string }) => React.ReactNode }) {
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    setFailed(false);
    const t = setTimeout(() => fetchSearch(q).then((h) => live && setHits(h), () => live && setFailed(true)), 220); // typing pause
    return () => { live = false; clearTimeout(t); };
  }, [q]);
  if (failed) return <EmptyState title="La recherche n’a pas pu aboutir">Réessayez dans un instant.</EmptyState>;
  if (!hits) return <p className="text-sm text-muted" aria-live="polite">Recherche…</p>;
  return (
    <section aria-live="polite">
      <h2 className="mb-2 font-display text-lg">{hits.length ? `${hits.length}${hits.length === 40 ? '+' : ''} résultat${hits.length > 1 ? 's' : ''} pour « ${q} »` : `Aucun succès pour « ${q} »`}</h2>
      {hits.length === 0 ? <EmptyState title="Essayez un autre mot">La recherche couvre les noms, les objectifs (monstres, quêtes, lieux), les donjons et les catégories.</EmptyState> : (
        <ul className="parchment divide-y divide-line overflow-hidden rounded-md border border-[#c4a46e]">
          {hits.map((h) => card(h.achievement, { path: true, note: h.match === 'name' ? undefined : `Trouvé dans : ${MATCH_LABEL[h.match]} « ${h.text.length > 90 ? `${h.text.slice(0, 90)}…` : h.text} »` }))}
        </ul>
      )}
    </section>
  );
}

function ForYou({ recs, card, breed, hasCharacter, level, started, recent, label, goTo, openCat }: {
  recs: ReturnType<typeof recommend>; card: (a: AchievementInfo, extra?: { path?: boolean; note?: string }) => React.ReactNode;
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

  const block = (title: string, help: string, list: Rec[], empty?: string) => (list.length || empty) ? (
    <section className="flex flex-col gap-2">
      <div>
        <h2 className="font-display text-lg">{title}</h2>
        <p className="text-xs text-muted">{help}</p>
      </div>
      {list.length === 0 ? <p className="rounded-md border border-dashed border-line px-3 py-2 text-sm text-muted">{empty}</p> : !rows ? <p className="text-sm text-muted">Chargement…</p> : (
        <ul className="parchment divide-y divide-line overflow-hidden rounded-md border border-[#c4a46e]">
          {list.map((r) => rows.get(r.id) && card(rows.get(r.id)!, { path: true, note: r.reason }))}
        </ul>
      )}
    </section>
  ) : null;

  return (
    <div className="flex flex-col gap-6">
      {!started && (
        <section className="rounded-lg border border-line bg-surface p-4">
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg"><Compass size={18} className="text-accent" aria-hidden /> Par où commencer ?</h2>
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-muted">
            <li>Les succès récompensent ce que vous faites déjà : quêtes, zones découvertes, monstres et donjons vaincus.</li>
            <li>Ouvrez un succès pour voir ses objectifs. Ceux liés à des quêtes se cochent seuls quand vous terminez ces quêtes dans le <a className="underline" href="/progression/quetes">suivi des quêtes</a>.</li>
            <li>Le reste, seul le jeu le sait : cochez-le vous-même, ou importez une capture avec le scanner.</li>
          </ol>
          <div className="mt-3 flex flex-wrap gap-2">
            {['Quêtes', 'Exploration', 'Monstres', 'Donjons'].map((n) => <Button key={n} className="!py-1.5 text-xs" onClick={() => openCat(n)}>{n}</Button>)}
          </div>
        </section>
      )}
      {block('À confirmer', 'Tous les objectifs sont remplis d’après votre progression : vérifiez dans le jeu, puis confirmez.', recs.ready)}
      {block('Presque terminés', 'Une partie des objectifs est déjà remplie, à 20 niveaux au plus au-dessus du vôtre.', recs.almost)}
      {breed && block(`Pour votre classe · ${breed}`, 'Liés à votre classe par les données du jeu. Les autres succès restent tous accessibles.', recs.forClass, 'Tous les succès liés à votre classe sont obtenus.')}
      {block(hasCharacter ? 'À votre niveau' : 'Pour débuter', hasCharacter
        ? `Succès non commencés de la progression principale, entre les niveaux ${Math.max(1, level - 10)} et ${Math.max(15, level + 5)} (3 au plus par catégorie).`
        : 'Succès de bas niveau de la progression principale. Créez un personnage pour des suggestions à votre niveau.', recs.forLevel, 'Rien de nouveau à votre niveau dans la progression principale.')}
      {recent.length > 0 && (
        <section>
          <h2 className="mb-1 flex items-center gap-1.5 font-display text-lg"><History size={16} className="text-muted" aria-hidden /> Derniers obtenus</h2>
          <ul className="flex flex-col">
            {recent.map((r) => (
              <li key={r.id}><button onClick={() => goTo(Number(r.id.slice(4)))} className="flex w-full justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface">
                <span className="truncate">{label(r.id)}</span><span className="shrink-0 text-xs text-faint">{new Date(r.at).toLocaleDateString('fr-FR')}</span>
              </button></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function CategoryPanel({ view, cat, subs, counts, progress, level, hasCharacter, open, card, setSub }: {
  view: { root: number; sub: number | null }; cat?: AchievementCategory; subs: AchievementCategory[];
  counts: Map<number, { done: number; total: number; points: number }>;
  progress: Map<number, { state: AchievementState; met: number; total: number }>;
  level: number; hasCharacter: boolean; open: number | null;
  card: (a: AchievementInfo, extra?: { path?: boolean; note?: string }) => React.ReactNode; setSub: (sub: number | null) => void;
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

  const shown = useMemo(() => {
    const p = (id: number) => progress.get(id);
    const ratio = (id: number) => { const x = p(id); return x?.total ? x.met / x.total : 0; };
    const out = (list ?? []).filter((a) => (filter === 'all' || p(a.id)?.state === filter) && (!atLevel || a.level <= level + 5));
    if (sort === 'progress') out.sort((a, b) => Number(p(b.id)?.state === 'ready') - Number(p(a.id)?.state === 'ready') || ratio(b.id) - ratio(a.id) || a.level - b.level);
    else if (sort === 'points') out.sort((a, b) => b.points - a.points || a.level - b.level);
    return out;
  }, [list, filter, atLevel, sort, progress, level]);
  // big categories (Donjons: 743) are rendered by pages of 100: all at once cost ~0.9 s of main thread on mobile
  const visible = shown.slice(0, Math.max(limit, shown.findIndex((a) => a.id === open) + 1));
  const c = counts.get(view.sub ?? view.root) ?? { done: 0, total: 0, points: 0 };
  const name = cat?.name ?? '';
  const subName = subs.find((s) => s.id === view.sub)?.name;

  return (
    <section aria-labelledby="cat-title" className="flex flex-col gap-3">
      <header className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="cat-title" className="font-display text-xl">{name}{subName ? <span className="text-muted"> › {subName}</span> : null}</h2>
          <p className="text-sm text-muted"><b className="text-text tabular-nums">{c.done}</b> / {c.total} obtenus · {c.points} pts</p>
        </div>
        {ROOT_HINT[name] && <p className="text-sm text-muted">{ROOT_HINT[name]}</p>}
        <ProgressBar value={c.done} max={c.total} label={`${name} : ${c.done} sur ${c.total}`} />
        {subsWithItems.length > 0 && (
          // chips wrap on desktop and scroll sideways on mobile: every sub-category is one tap away, nothing is clipped
          <div role="group" aria-label="Sous-catégories" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 pt-1 sm:flex-wrap sm:overflow-visible">
            {[{ id: null as number | null, name: 'Toutes' }, ...subsWithItems].map((s) => {
              const n = s.id == null ? null : counts.get(s.id);
              const active = view.sub === s.id;
              return (
                <button key={s.id ?? 'all'} onClick={() => setSub(s.id)} aria-pressed={active}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${active ? 'border-accent bg-accent/15 text-text' : 'border-line text-muted hover:border-faint hover:text-text'}`}>
                  {s.name}{n ? <span className="ml-1 tabular-nums text-faint">{n.done}/{n.total}</span> : null}
                </button>
              );
            })}
          </div>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filtrer par état" className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}
              className={`rounded-md border px-2.5 py-1.5 text-xs ${filter === f.id ? 'border-brand bg-brand/15 text-text' : 'border-line text-muted hover:text-text'}`}>{f.label}</button>
          ))}
        </div>
        {hasCharacter && (
          <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs text-muted">
            <input type="checkbox" checked={atLevel} onChange={(e) => setAtLevel(e.target.checked)} className="accent-[var(--color-brand)]" />
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

      {list === null ? <p className="text-sm text-muted">Chargement…</p> : shown.length === 0 ? (
        <EmptyState title="Aucun succès ici avec ces filtres">{filter !== 'all' || atLevel ? 'Revenez sur « Tous » ou décochez le filtre de niveau.' : null}</EmptyState>
      ) : (
        <ul className="appear parchment divide-y divide-line overflow-hidden rounded-md border border-[#c4a46e]" aria-label={`Succès : ${name}${subName ? ` › ${subName}` : ''}`}>
          {visible.map((a) => card(a, { path: view.sub == null && subs.length > 0 }))}
        </ul>
      )}
      {visible.length < shown.length && (
        <Button className="w-full" onClick={() => setLimit((n) => n + PAGE)}>
          Afficher les {Math.min(PAGE, shown.length - visible.length)} suivants ({shown.length - visible.length} restants)
        </Button>
      )}
      <p className="text-[11px] text-faint">États : {Object.values(DISPLAY).map((d) => d.label).join(' · ')}. « Plus tard » : niveau du succès supérieur au vôtre de plus de 10.</p>
    </section>
  );
}
