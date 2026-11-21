'use client';
// The companion: a narrow panel meant to sit over the game. It shows a step-by-step guide (a Dofus quest chain from
// the game data, position saved per character), pinned achievements with their objectives, and the encyclopaedia
// search. It can live in this tab, or in an always-on-top window (see usePip).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Check, ChevronLeft, ChevronRight, CircleDashed, CircleHelp, ExternalLink, Map as MapIcon, Pin, PictureInPicture2, Search, X } from 'lucide-react';
import { useCharacter } from '../useCharacter';
import { useCompanion } from './companion-store';
import { usePip } from './usePip';
import EncyclopediaSearch from '../encyclopedia/EncyclopediaSearch';
import { nextStep, startStep, type CompanionGuide, type GuideListEntry } from '../../src/companion-shared.ts';
import { achievementProgress, type ObjectiveState } from '../../src/achievements.ts';
import type { AchievementInfo } from '../../src/load.ts';

type Tab = 'guide' | 'pins' | 'search';
const TABS: { id: Tab; label: string; icon: typeof MapIcon }[] = [
  { id: 'guide', label: 'Guide', icon: MapIcon }, { id: 'pins', label: 'Épinglés', icon: Pin }, { id: 'search', label: 'Chercher', icon: Search },
];
const json = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))));
// links inside the companion open in a tab of the main browser window, so the companion keeps its place
const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

export default function CompanionView({ standalone }: { standalone?: boolean }) {
  const pip = usePip();
  const [opened, setOpened] = useState<'pip' | 'popup' | 'blocked' | null>(null);
  const panel = <CompanionPanel compact={standalone || !!pip.win} />;
  if (pip.win) return (
    <>
      {createPortal(panel, pip.win.document.body)}
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <PictureInPicture2 size={28} className="mx-auto text-accent" aria-hidden />
        <p className="mt-3 font-display text-lg">Le compagnon est ouvert dans sa fenêtre</p>
        <p className="mt-1 text-sm text-muted">Placez-la sur le jeu (en mode fenêtré ou plein écran fenêtré) : elle reste au premier plan. Gardez cet onglet ouvert.</p>
        <button onClick={pip.close} className="mt-4 rounded-md border border-line px-3 py-1.5 text-sm hover:border-faint">Fermer la fenêtre</button>
      </div>
    </>
  );
  return (
    <div className={standalone ? 'h-full' : 'mx-auto grid max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_420px]'}>
      {!standalone && (
        <section className="flex flex-col gap-3 text-sm">
          <h2 className="font-display text-lg">Vos outils, par-dessus le jeu</h2>
          <p className="text-muted">Le compagnon tient dans une petite fenêtre que vous posez sur le jeu. Il garde votre étape dans le guide, vos succès épinglés et la recherche de l’encyclopédie.</p>
          <button onClick={async () => setOpened(await pip.open())}
            className="inline-flex items-center justify-center gap-2 self-start rounded-md bg-cta px-4 py-2 font-medium text-white transition-colors hover:bg-cta-hi">
            <PictureInPicture2 size={16} aria-hidden /> Ouvrir au premier plan
          </button>
          <p className="text-xs text-faint">
            {pip.supported ? 'Votre navigateur garde la fenêtre au premier plan (Chrome, Edge). Lancez le jeu en fenêtré ou en plein écran fenêtré.'
              : 'Votre navigateur ne sait pas garder une fenêtre au premier plan : elle s’ouvrira comme une fenêtre normale (pratique sur un second écran). Chrome et Edge le savent.'}
          </p>
          {opened === 'popup' && <p className="text-xs text-check" role="status">Ouvert dans une fenêtre normale : elle ne reste pas au premier plan. Placez-la sur un second écran, ou utilisez Chrome ou Edge.</p>}
          {opened === 'blocked' && <p className="text-xs text-check" role="alert">Le navigateur a refusé d’ouvrir la fenêtre. Autorisez les fenêtres surgissantes pour ce site, ou utilisez le compagnon ci-contre dans cet onglet.</p>}
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-xs text-muted">
            <li>Lecture seule : le compagnon ne lit ni ne touche le jeu. C’est une page web, comme un guide ouvert sur un second écran.</li>
            <li>Votre position dans un guide et vos épingles restent dans ce navigateur, pour le personnage actif.</li>
            <li>Raccourcis : ← et → pour changer d’étape.</li>
          </ul>
        </section>
      )}
      <div className={standalone ? 'h-full' : 'h-[640px] overflow-hidden rounded-xl border border-line/80 shadow-[0_10px_30px_-14px_rgb(0_0_0/0.7)]'}>{panel}</div>
    </div>
  );
}

function CompanionPanel({ compact }: { compact: boolean }) {
  const ch = useCharacter();
  const comp = useCompanion(ch.character.id);
  const [tab, setTab] = useState<Tab>('guide');
  return (
    <div className="flex h-full min-h-dvh flex-col bg-bg text-text" style={compact ? undefined : { minHeight: 0 }}>
      <header className="flex shrink-0 items-center gap-1 border-b border-line bg-surface px-2 py-1.5">
        <span className="mr-1 font-display text-sm text-accent">Atlas</span>
        <nav aria-label="Compagnon" className="flex flex-1 gap-0.5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} aria-pressed={tab === t.id}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${tab === t.id ? 'bg-surface-2 text-text ring-1 ring-accent/40' : 'text-muted hover:text-text'}`}>
              <t.icon size={13} aria-hidden />{t.label}{t.id === 'pins' && comp.state.pins.length ? <span className="tabular-nums text-faint">{comp.state.pins.length}</span> : null}
            </button>
          ))}
        </nav>
        <span className="truncate text-[11px] text-faint" title="Personnage actif">{ch.hasCharacter ? ch.character.name : ''}</span>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'guide' ? <GuideTab /> : tab === 'pins' ? <PinsTab /> : (
          <div className="p-3"><EncyclopediaSearch compact autoFocus onPick={(e) => window.open(e.href, '_blank', 'noopener')} /><p className="mt-2 text-[11px] text-faint">Les fiches s’ouvrent dans votre navigateur ; le compagnon garde sa place.</p></div>
        )}
      </div>
    </div>
  );
}

function GuideTab() {
  const ch = useCharacter();
  const { state, set } = useCompanion(ch.character.id);
  const [list, setList] = useState<GuideListEntry[] | null>(null);
  const [guide, setGuide] = useState<CompanionGuide | null>(null);
  const [failed, setFailed] = useState(false);
  const g = state.guide;
  useEffect(() => { json('/api/compagnon').then((d: { guides: GuideListEntry[] }) => setList(d.guides), () => setFailed(true)); }, []);
  useEffect(() => {
    if (!g?.slug) { setGuide(null); return; }
    let live = true;
    json(`/api/compagnon?guide=${g.slug}`).then((d: CompanionGuide) => live && setGuide(d), () => live && setFailed(true));
    return () => { live = false; };
  }, [g?.slug]);
  const route = guide?.routes[Math.min(g?.route ?? 0, (guide?.routes.length ?? 1) - 1)];
  const steps = route?.steps ?? [];
  const done = (id: string) => ch.progress.done.has(id);
  const at = g && guide ? Math.min(g.step, steps.length - 1) : 0;
  const go = (i: number) => g && set((s) => ({ ...s, guide: { ...g, step: Math.max(0, Math.min(i, steps.length - 1)) } }));

  // ← → move between steps, in whichever window the companion lives
  useEffect(() => {
    if (!guide) return;
    const doc = (document.activeElement?.ownerDocument ?? document);
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input, textarea, select')) return;
      if (e.key === 'ArrowRight') go(at + 1); else if (e.key === 'ArrowLeft') go(at - 1);
    };
    const views = new Set([window, doc.defaultView].filter(Boolean) as Window[]);
    for (const v of views) v.addEventListener('keydown', onKey);
    return () => { for (const v of views) v.removeEventListener('keydown', onKey); };
  });

  // first opening of a guide (step -1): start at the first step not done yet
  useEffect(() => { if (g && g.step < 0 && steps.length) set((st) => ({ ...st, guide: { ...g, step: startStep(steps, null, done) } })); });
  // ?guide=<slug>: opened from a Dofus guide page. Applied once per character: the active character loads after the
  // first render (placeholder id first), and the player may then switch guides freely.
  const applied = useRef<string | null>(null);
  useEffect(() => {
    if (applied.current === ch.character.id) return;
    applied.current = ch.character.id;
    const asked = new URLSearchParams(location.search).get('guide');
    if (asked && /^[a-z0-9-]{1,80}$/.test(asked) && asked !== state.guide?.slug) set((st) => ({ ...st, guide: { slug: asked, route: 0, step: -1 } }));
  }, [ch.character.id, set, state.guide?.slug]);

  if (failed) return <p className="p-3 text-sm text-check" role="alert">Le guide n’a pas pu se charger. Réessayez.</p>;
  if (!g) return (
    <div className="p-3">
      <p className="mb-2 text-sm text-muted">Choisissez une chaîne de quêtes : le compagnon vous suit étape par étape.</p>
      {!list ? <p className="text-sm text-muted">Chargement…</p> : (
        <ul className="divide-y divide-line/60 overflow-hidden rounded-lg border border-line/80 bg-surface/60">
          {list.map((x) => (
            <li key={x.slug}>
              <button onClick={() => set((s) => ({ ...s, guide: { slug: x.slug, route: 0, step: -1 } }))} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2/60">
                <span className="min-w-0 flex-1 truncate">{x.name}</span><span className="shrink-0 text-xs tabular-nums text-faint">niv. {x.level} · {x.steps} étapes</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-faint">Chaînes tirées des données du jeu : les mêmes que les guides des Dofus.</p>
    </div>
  );
  if (!guide || !route) return <p className="p-3 text-sm text-muted">Chargement du guide…</p>;
  const cur = g.step < 0 ? startStep(steps, null, done) : at;
  const s = steps[cur];
  const isDone = s ? done(s.id) : false;
  const doneCount = steps.filter((x) => done(x.id)).length;

  return (
    <div className="flex flex-col">
      <div className="border-b border-line/70 bg-surface/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-xs font-medium">{guide.name}</p>
          <button onClick={() => set((st) => ({ ...st, guide: null }))} className="text-[11px] text-muted hover:text-text">Changer</button>
        </div>
        {guide.routes.length > 1 && (
          <label className="mt-1 flex items-center gap-1.5 text-[11px] text-faint">Voie
            <select value={g.route} onChange={(e) => set((st) => ({ ...st, guide: { ...g, route: Number(e.target.value), step: -1 } }))} className="min-w-0 flex-1 rounded border border-line bg-bg px-1 py-0.5 text-[11px] text-text">
              {guide.routes.map((r, i) => <option key={i} value={i}>{r.source} ({r.steps.length})</option>)}
            </select>
          </label>
        )}
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-faint">
          <span className="tabular-nums">Étape {cur + 1} / {steps.length}</span>
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-line" aria-hidden><span className="block h-full bg-done transition-[width] duration-300" style={{ width: `${(doneCount / Math.max(1, steps.length)) * 100}%` }} /></span>
          <span className="tabular-nums">{doneCount} faites</span>
        </div>
      </div>
      {s && (
        <article key={s.id} className="appear flex flex-col gap-3 p-3" aria-live="polite">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-faint">{s.kind === 'quest' ? 'Quête' : 'Succès'}{s.where ? ` · ${s.where}` : ''}{s.level ? ` · niv. ${s.level}` : ''}</p>
            <h2 className="font-display text-lg leading-tight">{s.name}</h2>
            {isDone && <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-done"><Check size={13} aria-hidden /> Faite</p>}
          </div>
          {s.parts.map((p, i) => (
            <section key={i} className="rounded-lg border border-line/80 bg-surface/60 px-3 py-2">
              {p.name && s.parts.length > 1 && <p className="mb-1 text-xs font-medium text-muted">{i + 1}. {p.name}</p>}
              {p.objectives.length ? (
                <ol className="flex flex-col gap-1 text-sm">{p.objectives.map((o, j) => <li key={j} className="flex gap-2"><span className="mt-0.5 text-[11px] tabular-nums text-faint">{j + 1}.</span><span>{o}</span></li>)}</ol>
              ) : <p className="text-xs text-faint">Pas d’objectif détaillé dans les données du jeu.</p>}
            </section>
          ))}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <a href={s.href} {...ext} className="inline-flex items-center gap-1 text-accent hover:underline"><MapIcon size={12} aria-hidden /> Voir dans Atlas</a>
            {s.guide && <a href={s.guide} {...ext} className="inline-flex items-center gap-1 text-accent hover:underline"><BookOpen size={12} aria-hidden /> Guide DPLN <ExternalLink size={10} aria-hidden /></a>}
          </div>
        </article>
      )}
      <footer className="sticky bottom-0 mt-auto flex items-center gap-2 border-t border-line bg-surface px-3 py-2">
        <button onClick={() => go(cur - 1)} disabled={cur === 0} aria-label="Étape précédente" className="rounded-md border border-line p-1.5 text-muted transition-colors hover:text-text disabled:opacity-40"><ChevronLeft size={16} aria-hidden /></button>
        {s && !isDone ? (
          <button onClick={() => { ch.setMark(s.id, 'done', 'manual', `« ${s.name} » terminée (compagnon)`); go(nextStep(steps, cur, (id) => id === s.id || done(id))); }}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-cta px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cta-hi">
            <Check size={15} aria-hidden /> {s.kind === 'quest' ? 'Quête terminée' : 'Succès obtenu'}
          </button>
        ) : s ? (
          <button onClick={() => ch.setMark(s.id, null, 'manual', `« ${s.name} » n’est plus marquée faite (compagnon)`)} className="flex-1 rounded-md border border-line px-3 py-1.5 text-xs text-muted hover:text-text">Annuler « faite »</button>
        ) : <span className="flex-1" />}
        <button onClick={() => go(cur + 1)} disabled={cur >= steps.length - 1} aria-label="Étape suivante" className="rounded-md border border-line p-1.5 text-muted transition-colors hover:text-text disabled:opacity-40"><ChevronRight size={16} aria-hidden /></button>
      </footer>
    </div>
  );
}

const OBJ_ICON: Record<ObjectiveState, ReactNode> = {
  confirmed: <Check size={11} strokeWidth={3} aria-hidden />, inferred: <Check size={11} strokeWidth={3} aria-hidden />,
  todo: <CircleDashed size={11} aria-hidden />, unknown: <CircleHelp size={11} aria-hidden />,
};
function PinsTab() {
  const ch = useCharacter();
  const { state, togglePin } = useCompanion(ch.character.id);
  const [rows, setRows] = useState<AchievementInfo[] | null>(null);
  const key = state.pins.join(',');
  useEffect(() => {
    if (!key) { setRows([]); return; }
    let live = true;
    json(`/api/achievements?ids=${key}&v=2`).then((d: { achievements: AchievementInfo[] }) => live && setRows(d.achievements), () => live && setRows([]));
    return () => { live = false; };
  }, [key]);
  const list = useMemo(() => (rows ?? []).map((a) => ({ a, p: achievementProgress(a.id, a.objectives.map((o) => [o.id, o.criterion]), ch.progress) })), [rows, ch.progress]);
  if (!state.pins.length) return <p className="p-3 text-sm text-muted">Aucun succès épinglé. Dans la page Succès, ouvrez un succès et choisissez « Épingler au compagnon ».</p>;
  if (!rows) return <p className="p-3 text-sm text-muted">Chargement…</p>;
  return (
    <ul className="flex flex-col gap-2 p-3">
      {list.map(({ a, p }) => (
        <li key={a.id} className="rounded-lg border border-line/80 bg-surface/60">
          <div className="flex items-start gap-2 border-b border-line/60 px-3 py-2">
            <a href={`/progression/succes?a=${a.id}`} {...ext} className="min-w-0 flex-1">
              <span className="block text-sm font-medium hover:text-accent">{a.name}</span>
              <span className="block text-[11px] text-faint">{p.state === 'obtained' ? 'Obtenu' : `${p.met}/${p.total} objectifs`} · {a.points} pts</span>
            </a>
            <button onClick={() => togglePin(a.id)} aria-label={`Désépingler ${a.name}`} className="rounded p-1 text-faint hover:text-text"><X size={14} aria-hidden /></button>
          </div>
          <ul className="flex flex-col gap-1 px-3 py-2 text-[13px]">
            {a.objectives.map((o, i) => {
              const s = p.objectives[i] ?? 'unknown';
              const met = s === 'confirmed' || s === 'inferred';
              return (
                <li key={o.id} className="flex items-start gap-2">
                  {s === 'inferred' ? <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-done text-white" title="Déduit">{OBJ_ICON[s]}</span> : (
                    <input type="checkbox" checked={s === 'confirmed'} className="mt-0.5 size-4 shrink-0 accent-[var(--color-done)]" aria-label={`${o.name ?? `Objectif ${i + 1}`} : fait`}
                      onChange={(e) => ch.setMark(`obj:${o.id}`, e.target.checked ? 'done' : null, 'manual', `Objectif « ${o.name ?? i + 1} » de « ${a.name} » (compagnon)`)} />
                  )}
                  <span className={met ? 'text-muted line-through decoration-faint' : ''}>{o.name ?? `Objectif ${i + 1}`}</span>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}
