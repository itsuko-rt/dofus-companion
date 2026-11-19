'use client';
// Achievement tracker: progress per category and per objective, for the selected character.
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, ChevronDown, CircleHelp, ExternalLink, Gift, History, ScanLine, Search, Sparkles, Trophy } from 'lucide-react';
import type { AchievementCategory, AchievementInfo } from '../../src/load.ts';
import { ACHIEVEMENT_STATE, achievementProgress, type AchievementState, type ObjectiveIndex, type ObjectiveState } from '../../src/achievements.ts';
import { CHANGE_SOURCES, type HistoryEntry } from '../../src/character.ts';
import { reference, parse } from '../../src/criteria.ts';
import { useGame } from '../quests/useGame';
import { questHref } from '../quests/NextSteps';
import { Button, Card, EmptyState, ProgressBar } from '../ui';

let objCache: Promise<ObjectiveIndex> | null = null;
const fetchObjectives = () => (objCache ??= fetch('/api/achievements/objectives').then((r) => {
  if (!r.ok) throw new Error(r.statusText);
  return r.json() as Promise<ObjectiveIndex>;
}).catch((e) => { objCache = null; throw e; }));

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
type Filter = 'all' | AchievementState;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tous' }, { id: 'ready', label: 'À confirmer' }, { id: 'in_progress', label: 'En cours' },
  { id: 'not_started', label: 'Non commencés' }, { id: 'obtained', label: 'Obtenus' },
];
const STATE_TONE: Record<AchievementState, string> = {
  obtained: 'text-done border-done/60 bg-done/10', ready: 'text-accent border-accent bg-accent/10',
  in_progress: 'text-info border-info/60 bg-info/10', not_started: 'text-muted border-line bg-surface-2',
};
const OBJ: Record<ObjectiveState, { label: string; tone: string }> = {
  confirmed: { label: 'Coché', tone: 'text-done' },
  inferred: { label: 'Déduit', tone: 'text-done' },
  todo: { label: 'À faire', tone: 'text-muted' },
  unknown: { label: 'À vérifier', tone: 'text-check' },
};

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return <div><p className={`font-display text-xl font-semibold tabular-nums ${tone ?? ''}`}>{value}</p><p className="text-xs text-muted">{label}</p></div>;
}

export default function AchievementsView({ categories }: { categories: AchievementCategory[] }) {
  const { graph, ch } = useGame();
  const [index, setIndex] = useState<ObjectiveIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { fetchObjectives().then(setIndex, (e: Error) => setError(e.message)); }, []);

  const roots = useMemo(() => categories.filter((c) => c.parentId == null && c.count + categories.filter((x) => x.parentId === c.id).reduce((s, x) => s + x.count, 0) > 0), [categories]);
  const rootOf = useMemo(() => new Map(categories.map((c) => [c.id, c.parentId ?? c.id])), [categories]);
  const [root, setRoot] = useState<number | null>(roots[0]?.id ?? null);
  const [sub, setSub] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [list, setList] = useState<AchievementInfo[] | null>(null);

  // progress of every achievement (objectives evaluated against the character)
  const progress = useMemo(() => {
    const m = new Map<number, ReturnType<typeof achievementProgress> & { category: number }>();
    if (!graph || !index) return m;
    for (const n of graph.nodes.values()) {
      if (n.kind !== 'achievement') continue;
      m.set(n.refId, { ...achievementProgress(n.refId, index[n.refId] ?? [], ch.progress), category: n.category ?? -1 });
    }
    return m;
  }, [graph, index, ch.progress]);

  const totals = useMemo(() => {
    const t = { all: 0, obtained: 0, ready: 0, in_progress: 0, not_started: 0, points: 0 };
    const byRoot = new Map<number, { done: number; total: number }>();
    for (const [id, p] of progress) {
      t.all++; t[p.state]++;
      if (p.state === 'obtained') t.points += graph?.nodes.get(`ach:${id}`)?.points ?? 0;
      const r = rootOf.get(p.category) ?? p.category;
      const b = byRoot.get(r) ?? { done: 0, total: 0 };
      b.total++; if (p.state === 'obtained') b.done++;
      byRoot.set(r, b);
    }
    return { ...t, byRoot };
  }, [progress, rootOf, graph]);

  // where each obtained achievement / ticked objective came from (last history entry that added it)
  const provenance = useMemo(() => {
    const m = new Map<string, HistoryEntry>();
    for (const h of ch.character.history) for (const id of h.added) m.set(id, h);
    return m;
  }, [ch.character.history]);
  const recent = useMemo(() => {
    const out: { id: string; at: string }[] = [];
    for (const h of [...ch.character.history].reverse()) for (const id of h.added) {
      if (id.startsWith('ach:') && ch.progress.done.has(id) && !out.some((x) => x.id === id)) out.push({ id, at: h.at });
    }
    return out.slice(0, 5);
  }, [ch.character.history, ch.progress.done]);
  // "what next": achievements with most objectives already met, reachable at the character's level
  const almost = useMemo(() => [...progress.entries()]
    .filter(([id, p]) => (p.state === 'in_progress' || p.state === 'ready') && (graph?.nodes.get(`ach:${id}`)?.level ?? 0) <= ch.character.level + 20)
    .sort((a, b) => Number(b[1].state === 'ready') - Number(a[1].state === 'ready') || b[1].met / b[1].total - a[1].met / a[1].total)
    .slice(0, 5), [progress, graph, ch.character.level]);

  const selected = sub ?? root;
  const children = useMemo(() => categories.filter((c) => c.parentId === root), [categories, root]);
  useEffect(() => {
    if (selected == null) return;
    const ids = sub != null ? [sub] : [selected, ...children.map((c) => c.id)];
    setList(null);
    fetch(`/api/achievements?categories=${ids.join(',')}`).then((r) => r.json()).then((d) => setList(d.achievements ?? []), () => setList([]));
  }, [selected, sub, children]);

  const searchHits = useMemo(() => {
    const q = norm(query.trim());
    if (!graph || q.length < 2) return [];
    return [...graph.nodes.values()].filter((n) => n.kind === 'achievement' && norm(n.label).includes(q)).slice(0, 12);
  }, [graph, query]);
  const goTo = (achId: number) => {
    const cat = progress.get(achId)?.category;
    if (cat == null) return;
    const r = rootOf.get(cat) ?? cat;
    setRoot(r); setSub(r === cat ? null : cat); setFilter('all'); setQuery(''); setOpen(achId);
  };
  useEffect(() => { if (open != null && list) document.getElementById(`ach-${open}`)?.scrollIntoView({ block: 'center' }); }, [open, list]);

  if (error) return <p className="p-8 text-sm text-muted">Impossible de charger les succès : {error}</p>;
  if (!graph || !index) return <p className="p-8 text-sm text-muted">Chargement des succès…</p>;

  const shown = (list ?? []).filter((a) => filter === 'all' || progress.get(a.id)?.state === filter);
  const pct = totals.all ? Math.round((totals.obtained / totals.all) * 100) : 0;
  const name = (id: string) => graph.nodes.get(id)?.label ?? id;

  const confirm = (a: AchievementInfo, how: 'manual' | 'objectives') =>
    ch.setMark(`ach:${a.id}`, 'done', 'manual', how === 'objectives' ? `« ${a.name} » confirmé (objectifs remplis)` : `« ${a.name} » marqué obtenu`);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6">
        {/* dashboard */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><Trophy size={22} className="text-accent" /> Succès</h1>
            <p className="mt-1 text-sm text-muted">{ch.hasCharacter ? `${ch.character.name} · niv. ${ch.character.level}` : 'Aucun personnage : la progression reste dans ce navigateur.'}</p>
          </div>
          <Link href="/progression/scan" className="inline-flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink hover:brightness-110">
            <ScanLine size={16} /> Scanner ma progression
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <Card className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
              <Stat label="Succès" value={totals.all} />
              <Stat label="Obtenus" value={totals.obtained} tone="text-done" />
              <Stat label="À confirmer" value={totals.ready} tone="text-accent" />
              <Stat label="En cours" value={totals.in_progress} tone="text-info" />
              <Stat label="Restants" value={totals.all - totals.obtained} tone="text-muted" />
              <Stat label={`${totals.points} points`} value={`${pct} %`} />
            </div>
            <ul className="grid gap-x-5 gap-y-2 sm:grid-cols-2 xl:grid-cols-3" aria-label="Progression par catégorie">
              {roots.map((c) => {
                const b = totals.byRoot.get(c.id) ?? { done: 0, total: 0 };
                return (
                  <li key={c.id}>
                    <button onClick={() => { setRoot(c.id); setSub(null); }} className={`w-full rounded-md px-1.5 py-1 text-left hover:bg-surface-2 ${root === c.id ? 'bg-surface-2' : ''}`}>
                      <span className="flex justify-between text-xs"><span className={root === c.id ? 'text-text' : 'text-muted'}>{c.name}</span><span className="tabular-nums text-faint">{b.done}/{b.total}</span></span>
                      <ProgressBar value={b.done} max={b.total} className="mt-1 !h-1" label={`${c.name} : ${b.done} sur ${b.total}`} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card className="flex flex-col gap-3 text-sm">
            <div>
              <h2 className="mb-1 flex items-center gap-1.5 font-semibold"><Sparkles size={15} className="text-accent" /> Presque terminés</h2>
              {almost.length ? almost.map(([id, p]) => (
                <button key={id} onClick={() => goTo(id)} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-surface-2">
                  <span className="min-w-0 flex-1 truncate">{name(`ach:${id}`)}</span>
                  <span className={`shrink-0 text-xs ${p.state === 'ready' ? 'text-accent' : 'text-muted'}`}>{p.state === 'ready' ? 'à confirmer' : `${p.met}/${p.total} objectifs`}</span>
                </button>
              )) : <p className="text-xs text-muted">Rien en cours. Les objectifs se remplissent quand vous terminez des quêtes ou cochez des objectifs.</p>}
            </div>
            <div>
              <h2 className="mb-1 flex items-center gap-1.5 font-semibold"><History size={15} className="text-muted" /> Derniers obtenus</h2>
              {recent.length ? recent.map((r) => (
                <button key={r.id} onClick={() => goTo(Number(r.id.slice(4)))} className="flex w-full justify-between gap-2 rounded-md px-1.5 py-1 text-left hover:bg-surface-2">
                  <span className="truncate">{name(r.id)}</span><span className="shrink-0 text-xs text-faint">{new Date(r.at).toLocaleDateString('fr-FR')}</span>
                </button>
              )) : <p className="text-xs text-muted">Aucun pour l’instant.</p>}
            </div>
          </Card>
        </div>

        {/* list */}
        <div className="grid gap-5 md:grid-cols-[220px_1fr]">
          <nav aria-label="Catégories de succès" className="flex flex-col gap-0.5 md:sticky md:top-0 md:self-start">
            {roots.map((c) => (
              <button key={c.id} onClick={() => { setRoot(c.id); setSub(null); }} aria-current={root === c.id}
                className={`rounded-lg px-3 py-1.5 text-left text-sm ${root === c.id ? 'bg-surface-2 text-text' : 'text-muted hover:bg-surface hover:text-text'}`}>
                {c.name}
              </button>
            ))}
          </nav>
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {children.length > 0 && (
                <select aria-label="Sous-catégorie" value={sub ?? ''} onChange={(e) => setSub(e.target.value ? Number(e.target.value) : null)}
                  className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
                  <option value="">Toutes les sous-catégories</option>
                  {children.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.count})</option>)}
                </select>
              )}
              <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrer par état">
                {FILTERS.map((f) => (
                  <button key={f.id} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}
                    className={`rounded-full border px-2.5 py-1 text-xs ${filter === f.id ? 'border-brand bg-brand/15 text-text' : 'border-line text-muted hover:text-text'}`}>{f.label}</button>
                ))}
              </div>
              <label className="relative ml-auto w-full sm:w-64">
                <span className="sr-only">Rechercher un succès</span>
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher dans tous les succès…" className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm" />
                {searchHits.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-line bg-surface-2 shadow-xl">
                    {searchHits.map((n) => (
                      <li key={n.id}><button className="block w-full px-3 py-2 text-left text-sm hover:bg-line" onClick={() => goTo(n.refId)}>
                        {n.label} <span className="text-xs text-muted">· {ACHIEVEMENT_STATE[progress.get(n.refId)?.state ?? 'not_started']}</span>
                      </button></li>
                    ))}
                  </ul>
                )}
              </label>
            </div>

            {list === null ? <p className="text-sm text-muted">Chargement…</p> : shown.length === 0 ? <EmptyState title="Aucun succès ici avec ce filtre" /> : (
              <ul className="flex flex-col gap-2">
                {shown.map((a) => {
                  const p = progress.get(a.id) ?? achievementProgress(a.id, [], ch.progress);
                  const expanded = open === a.id;
                  const src = provenance.get(`ach:${a.id}`);
                  return (
                    <li key={a.id} id={`ach-${a.id}`}>
                      <Card className={`p-0 ${expanded ? 'border-faint' : ''}`}>
                        <button onClick={() => setOpen(expanded ? null : a.id)} aria-expanded={expanded} className="flex w-full items-center gap-3 p-3 text-left">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{a.name}</p>
                            <p className="text-xs text-muted">niv. {a.level} · {a.points} pts{a.dofus.length ? ` · ${a.dofus.join(', ')}` : ''}</p>
                          </div>
                          {p.total > 0 && (
                            <span className="hidden w-28 shrink-0 sm:block">
                              <span className="block text-right text-[11px] tabular-nums text-muted">{p.met}/{p.total}</span>
                              <ProgressBar value={p.met} max={p.total} className="mt-0.5 !h-1" label={`${p.met} objectifs sur ${p.total}`} />
                            </span>
                          )}
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATE_TONE[p.state]}`}>{ACHIEVEMENT_STATE[p.state]}</span>
                          <ChevronDown size={15} className={`shrink-0 text-faint transition ${expanded ? 'rotate-180' : ''}`} />
                        </button>
                        {expanded && (
                          <div className="flex flex-col gap-3 border-t border-line p-3 text-sm">
                            {a.description && <p className="text-muted">{a.description}</p>}
                            {a.objectives.length > 0 && (
                              <div>
                                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-faint">Objectifs ({p.met}/{p.total})</h3>
                                <ul className="flex flex-col gap-1">
                                  {a.objectives.map((o, i) => {
                                    const s = p.objectives[i] ?? 'unknown';
                                    const ref = (() => { try { const c = parse(o.criterion); return c.type === 'atom' ? reference(c) : null; } catch { return null; } })();
                                    const target = ref && !ref.negated ? graph.nodes.get(ref.node) : undefined;
                                    return (
                                      <li key={o.id} className="flex items-center gap-2 rounded-md bg-surface-2 px-2.5 py-1.5">
                                        <span className={`w-16 shrink-0 text-[11px] font-medium ${OBJ[s].tone}`} title={s === 'inferred' ? 'Condition officielle vérifiée avec votre progression' : s === 'unknown' ? 'Impossible à vérifier ici (monstres, objets…) : cochez-le vous-même' : undefined}>
                                          {s === 'confirmed' || s === 'inferred' ? <Check size={12} className="mr-0.5 inline" /> : null}{OBJ[s].label}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                          {target?.kind === 'quest' ? <Link className="underline decoration-faint underline-offset-2 hover:text-accent" href={questHref(target)}>{o.name ?? target.label}</Link>
                                            : target?.kind === 'achievement' ? <button className="text-left underline decoration-faint underline-offset-2 hover:text-accent" onClick={() => goTo(target.refId)}>{o.name ?? target.label}</button>
                                            : o.name ?? `Objectif ${i + 1}`}
                                        </span>
                                        {s !== 'inferred' && (
                                          <label className="flex shrink-0 items-center gap-1 text-xs text-muted">
                                            <input type="checkbox" checked={s === 'confirmed'} className="accent-[var(--color-brand)]"
                                              onChange={(e) => ch.setMark(`obj:${o.id}`, e.target.checked ? 'done' : null, 'manual', `Objectif « ${o.name ?? i + 1} » de « ${a.name} »`)} />
                                            fait
                                          </label>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                                <p className="mt-1 flex items-center gap-1 text-[11px] text-faint"><CircleHelp size={11} /> « Déduit » : vérifié d’après vos quêtes, succès et niveau. « À vérifier » : seul le jeu le sait, cochez-le si c’est fait.</p>
                              </div>
                            )}
                            {a.rewards && (
                              <div>
                                <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-faint"><Gift size={13} /> Récompenses</h3>
                                <ul className="flex flex-wrap gap-1.5 text-xs">
                                  {a.rewards.xp && <li className="rounded-full bg-surface-2 px-2.5 py-1">Expérience</li>}
                                  {a.rewards.kamas && <li className="rounded-full bg-surface-2 px-2.5 py-1">Kamas</li>}
                                  {a.rewards.items.map((it) => <li key={it.id} className="rounded-full bg-surface-2 px-2.5 py-1">{it.qty > 1 ? `${it.qty} × ` : ''}{it.name ?? `objet n°${it.id}`}</li>)}
                                  {a.rewards.titles > 0 && <li className="rounded-full bg-surface-2 px-2.5 py-1">Titre</li>}
                                  {a.rewards.ornaments > 0 && <li className="rounded-full bg-surface-2 px-2.5 py-1">Ornement</li>}
                                  {a.rewards.emotes > 0 && <li className="rounded-full bg-surface-2 px-2.5 py-1">Attitude</li>}
                                  {a.rewards.spells > 0 && <li className="rounded-full bg-surface-2 px-2.5 py-1">Sort</li>}
                                </ul>
                              </div>
                            )}
                            {a.guide && (
                              <a href={a.guide.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-accent underline underline-offset-2">
                                <BookOpen size={14} /> Lire le guide sur {a.guide.site} <ExternalLink size={12} />
                              </a>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                              {p.state === 'obtained' ? (
                                <>
                                  <Button variant="ghost" className="!px-2.5 !py-1 text-xs" onClick={() => ch.setMark(`ach:${a.id}`, null, 'manual', `« ${a.name} » n’est plus marqué obtenu`)}>Annuler « obtenu »</Button>
                                  {src && <span className="text-xs text-faint">{CHANGE_SOURCES[src.source]} · {new Date(src.at).toLocaleDateString('fr-FR')}</span>}
                                </>
                              ) : p.state === 'ready' ? (
                                <Button variant="primary" className="!px-2.5 !py-1 text-xs" onClick={() => confirm(a, 'objectives')}><Check size={13} /> Tous les objectifs sont remplis : confirmer</Button>
                              ) : (
                                <Button className="!px-2.5 !py-1 text-xs" onClick={() => confirm(a, 'manual')}><Check size={13} /> Je l’ai obtenu</Button>
                              )}
                            </div>
                          </div>
                        )}
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
