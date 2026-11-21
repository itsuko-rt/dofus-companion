'use client';
// One achievement in the journal: a compact row (state, name, why it is shown, level, points, progress) that opens in place
// on its objectives, rewards and related game content (quests with their status, dungeons, Dofus, guide).
import Link from 'next/link';
import { BookOpen, Castle, Check, ChevronDown, CircleDashed, CircleHelp, ExternalLink, Gem, Gift, Lock, Scroll, Sparkles, Star } from 'lucide-react';
import type { AchievementInfo } from '../../src/load.ts';
import type { AchievementProgress, ObjectiveState } from '../../src/achievements.ts';
import { DISPLAY, type DisplayState } from '../../src/achievement-guide.ts';
import { CHANGE_SOURCES, type HistoryEntry } from '../../src/character.ts';
import { parse, reference } from '../../src/criteria.ts';
import type { Graph, Status } from '../../src/graph.ts';
import type { Progress } from '../../src/criteria.ts';
import { questHref } from '../quests/NextSteps';
import { Button, ProgressBar, StatusPill } from '../ui';

// state marker: icon + colour + label (never colour alone)
const MARK: Record<DisplayState, { icon: typeof Check; tone: string; edge: string }> = {
  obtained: { icon: Check, tone: 'text-done border-done/70 bg-done/15', edge: 'border-l-done' },
  ready: { icon: Star, tone: 'text-accent border-accent bg-accent/15', edge: 'border-l-accent' },
  in_progress: { icon: CircleDashed, tone: 'text-info border-info/60 bg-info/10', edge: 'border-l-info' },
  todo: { icon: Sparkles, tone: 'text-muted border-line bg-surface-2', edge: 'border-l-transparent' },
  later: { icon: Lock, tone: 'text-faint border-line bg-transparent', edge: 'border-l-transparent' },
};
const OBJ: Record<ObjectiveState, { label: string; tone: string; help?: string }> = {
  confirmed: { label: 'Coché', tone: 'text-done' },
  inferred: { label: 'Déduit', tone: 'text-done', help: 'Condition officielle vérifiée avec vos quêtes, succès et niveau' },
  todo: { label: 'À faire', tone: 'text-muted' },
  unknown: { label: 'À vérifier', tone: 'text-check', help: 'Impossible à vérifier ici (monstres, objets…) : cochez-le vous-même' },
};

export interface CardCtx {
  graph: Graph;
  progress: Progress;
  setMark: (id: string, value: 'done' | null, source: 'manual', label: string) => void;
  goTo: (achievementId: number) => void;
  provenance: Map<string, HistoryEntry>;
}

export default function AchievementCard({ a, p, display, path, note, open, onToggle, ctx }: {
  a: AchievementInfo; p: AchievementProgress; display: DisplayState;
  /** where it lives (shown outside its own category: search, recommendations) */
  path?: string;
  /** why it is shown (recommendation reason, search match) */
  note?: string;
  open: boolean; onToggle: () => void; ctx: CardCtx;
}) {
  const m = MARK[display];
  const Icon = m.icon;
  const src = ctx.provenance.get(`ach:${a.id}`);
  return (
    <li id={`ach-${a.id}`} className={`border-l-[3px] ${m.edge} ${open ? 'bg-surface-2/70' : 'hover:bg-surface-2/40'}`}>
      <button onClick={onToggle} aria-expanded={open} aria-controls={`ach-body-${a.id}`} className="flex w-full items-start gap-3 px-3 py-2.5 text-left sm:items-center">
        <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border sm:mt-0 ${m.tone}`} title={DISPLAY[display].help}>
          <Icon size={14} aria-hidden />
          <span className="sr-only">{DISPLAY[display].label}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block font-medium leading-snug ${display === 'later' ? 'text-muted' : ''}`}>{a.name}</span>
          {note && <span className="block text-xs text-accent">{note}</span>}
          <span className="block text-xs text-muted">
            niv. {a.level} · {a.points} pts{path ? ` · ${path}` : ''}{a.dofus.length ? ` · ${a.dofus.join(', ')}` : ''}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className={`rounded-sm border px-1.5 py-0.5 text-[11px] font-medium ${m.tone}`}>{DISPLAY[display].label}</span>
          {p.total > 0 && display !== 'obtained' && (
            <span className="w-20">
              <ProgressBar value={p.met} max={p.total} className="!h-1" label={`${p.met} objectifs sur ${p.total}`} />
              <span className="block text-right text-[10.5px] tabular-nums text-faint">{p.met}/{p.total}</span>
            </span>
          )}
        </span>
        <ChevronDown size={16} aria-hidden className={`mt-1.5 shrink-0 text-faint transition-transform sm:mt-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <Details a={a} p={p} src={src} ctx={ctx} />}
    </li>
  );
}

function Details({ a, p, src, ctx }: { a: AchievementInfo; p: AchievementProgress; src?: HistoryEntry; ctx: CardCtx }) {
  const status = (id: string): Status => ctx.graph.status(id, ctx.progress);
  const quests = new Map<string, string>(); // related quests named by the objectives
  const objectives = a.objectives.map((o, i) => {
    const ref = (() => { try { const c = parse(o.criterion); return c.type === 'atom' ? reference(c) : null; } catch { return null; } })();
    const target = ref && !ref.negated ? ctx.graph.nodes.get(ref.node) : undefined;
    if (target?.kind === 'quest') quests.set(target.id, target.label);
    return { o, i, s: p.objectives[i] ?? 'unknown', target };
  });
  const confirm = (how: 'manual' | 'objectives') =>
    ctx.setMark(`ach:${a.id}`, 'done', 'manual', how === 'objectives' ? `« ${a.name} » confirmé (objectifs remplis)` : `« ${a.name} » marqué obtenu`);
  const r = a.rewards;
  const rewards = r ? [
    r.xp && 'Expérience', r.kamas && 'Kamas',
    ...r.items.map((it) => `${it.qty > 1 ? `${it.qty} × ` : ''}${it.name ?? `objet n°${it.id}`}`),
    r.titles > 0 && 'Titre', r.ornaments > 0 && 'Ornement', r.emotes > 0 && 'Attitude', r.spells > 0 && 'Sort',
  ].filter((x): x is string => !!x) : [];

  return (
    <div id={`ach-body-${a.id}`} className="appear flex flex-col gap-4 border-t border-line px-3 py-3 text-sm sm:pl-13">
      {a.description && <p className="text-muted">{a.description}</p>}

      {objectives.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-faint">Objectifs · {p.met}/{p.total}</h3>
          <ul className="flex flex-col gap-1">
            {objectives.map(({ o, i, s, target }) => (
              <li key={o.id} className="flex items-center gap-2 rounded-md bg-surface-2 px-2.5 py-1.5">
                <span className={`w-[4.5rem] shrink-0 text-[11px] font-medium ${OBJ[s].tone}`} title={OBJ[s].help}>
                  {s === 'confirmed' || s === 'inferred' ? <Check size={12} className="mr-0.5 inline" aria-hidden /> : null}{OBJ[s].label}
                </span>
                <span className="min-w-0 flex-1">
                  {target?.kind === 'quest' ? <Link className="underline decoration-faint underline-offset-2 hover:text-accent" href={questHref(target)}>{o.name ?? target.label}</Link>
                    : target?.kind === 'achievement' ? <button className="text-left underline decoration-faint underline-offset-2 hover:text-accent" onClick={() => ctx.goTo(target.refId)}>{o.name ?? target.label}</button>
                    : o.name ?? `Objectif ${i + 1}`}
                </span>
                {s !== 'inferred' && (
                  <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded px-1 py-1 text-xs text-muted">
                    <input type="checkbox" checked={s === 'confirmed'} className="size-4 accent-[var(--color-brand)]"
                      onChange={(e) => ctx.setMark(`obj:${o.id}`, e.target.checked ? 'done' : null, 'manual', `Objectif « ${o.name ?? i + 1} » de « ${a.name} »`)} />
                    fait
                  </label>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 flex items-start gap-1 text-[11px] text-faint"><CircleHelp size={12} className="mt-px shrink-0" aria-hidden /> « Déduit » : vérifié d’après vos quêtes, succès et niveau. « À vérifier » : seul le jeu le sait, cochez-le quand c’est fait.</p>
        </section>
      )}

      {(quests.size > 0 || a.dungeons.length > 0 || a.dofus.length > 0) && (
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-faint">Où aller</h3>
          <ul className="flex flex-col gap-1">
            {[...quests].map(([id, label]) => {
              const n = ctx.graph.nodes.get(id)!;
              return (
                <li key={id} className="flex flex-wrap items-center gap-2">
                  <Scroll size={14} className="shrink-0 text-faint" aria-hidden />
                  <Link href={questHref(n)} className="underline decoration-faint underline-offset-2 hover:text-accent">Quête : {label}</Link>
                  <StatusPill status={status(id)} className="!py-0 !text-[11px]" />
                </li>
              );
            })}
            {a.dungeons.map((d) => (
              <li key={d.name} className="flex items-center gap-2"><Castle size={14} className="shrink-0 text-faint" aria-hidden /> Donjon : {d.name} <span className="text-xs text-faint">· niv. {d.level}</span></li>
            ))}
            {a.dofus.map((d) => (
              <li key={d} className="flex items-center gap-2"><Gem size={14} className="shrink-0 text-faint" aria-hidden /> Compte pour le Dofus : {d}</li>
            ))}
          </ul>
        </section>
      )}

      {rewards.length > 0 && (
        <section>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-faint"><Gift size={13} aria-hidden /> Récompenses</h3>
          <ul className="flex flex-wrap gap-1.5 text-xs">{rewards.map((x) => <li key={x} className="rounded-sm bg-surface-2 px-2 py-0.5">{x}</li>)}</ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {p.state === 'obtained' ? (
          <>
            <Button variant="ghost" className="!px-2.5 !py-1 text-xs" onClick={() => ctx.setMark(`ach:${a.id}`, null, 'manual', `« ${a.name} » n’est plus marqué obtenu`)}>Annuler « obtenu »</Button>
            {src && <span className="text-xs text-faint">{CHANGE_SOURCES[src.source]} · {new Date(src.at).toLocaleDateString('fr-FR')}</span>}
          </>
        ) : p.state === 'ready' ? (
          <Button variant="primary" className="!px-2.5 !py-1 text-xs" onClick={() => confirm('objectives')}><Check size={13} aria-hidden /> Tous les objectifs sont remplis : confirmer</Button>
        ) : (
          <Button className="!px-2.5 !py-1 text-xs" onClick={() => confirm('manual')}><Check size={13} aria-hidden /> Je l’ai obtenu</Button>
        )}
        {a.guide && (
          <a href={a.guide.url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-accent underline underline-offset-2">
            <BookOpen size={13} aria-hidden /> Guide sur {a.guide.site} <ExternalLink size={11} aria-hidden />
          </a>
        )}
      </div>
    </div>
  );
}
