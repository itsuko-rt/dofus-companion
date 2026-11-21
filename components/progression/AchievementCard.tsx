'use client';
// One achievement in the journal.
// - AchievementCard: a compact entry to scan quickly (emblem with state, name, why it is shown or a preview, level,
//   points, progress). Its details open in place on narrow screens, or in the side panel on wide ones.
// - AchievementDetails: the parchment sheet (objectives with their own state, where to go, rewards, actions).
// The game files carry no achievement icons, so the emblem is the icon of the achievement's root category.
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  BookOpen, Castle, Check, ChevronRight, CircleDashed, CircleHelp, Clock, Coins, Compass, Droplets, ExternalLink, Gem, Gift,
  Hammer, Hourglass, Lock, Moon, PartyPopper, PawPrint, Scroll, Shield, Skull, Sparkles, Star, Swords, Trophy, Users, X,
  type LucideIcon,
} from 'lucide-react';
import type { AchievementInfo } from '../../src/load.ts';
import type { AchievementProgress, ObjectiveState } from '../../src/achievements.ts';
import { DISPLAY, type DisplayState } from '../../src/achievement-guide.ts';
import { CHANGE_SOURCES, type HistoryEntry } from '../../src/character.ts';
import { parse, reference } from '../../src/criteria.ts';
import type { Graph, Status } from '../../src/graph.ts';
import type { Progress } from '../../src/criteria.ts';
import { questHref } from '../quests/NextSteps';
import { Button, ProgressBar, StatusPill } from '../ui';

/** Root category name (achievementcategoriesdata, 3.7.14.18) → emblem; an unknown future category gets the trophy. */
const ROOT_ICON: Record<string, LucideIcon> = {
  'Quêtes': Scroll, 'Exploration': Compass, 'Monstres': Skull, 'Donjons': Castle, 'Métiers': Hammer, 'Général': Star,
  'Élevage': PawPrint, 'Compagnons': Users, 'Guilde': Shield, 'Kolizéum': Swords, 'Songes Infinis': Moon,
  'Anomalies Temporelles': Hourglass, "La Source : L'Héritage des Dofus": Droplets, 'Événements': PartyPopper, 'Temporis': Clock,
};
export const rootIcon = (name: string): LucideIcon => ROOT_ICON[name] ?? Trophy;

// state: badge icon + colour on the emblem, and always a text label next to it (never colour alone)
export const MARK: Record<DisplayState, { icon: LucideIcon; text: string; emblem: string }> = {
  obtained: { icon: Check, text: 'text-done', emblem: 'border-done/60 bg-done/15 text-done' },
  ready: { icon: Star, text: 'text-accent', emblem: 'border-accent/80 bg-accent/15 text-accent ring-2 ring-accent/15' },
  in_progress: { icon: CircleDashed, text: 'text-info', emblem: 'border-info/50 bg-info/10 text-info' },
  todo: { icon: Sparkles, text: 'text-muted', emblem: 'border-line bg-surface-2 text-muted' },
  later: { icon: Lock, text: 'text-faint', emblem: 'border-line/70 bg-transparent text-faint' },
};
const OBJ: Record<ObjectiveState, { label: string; tone: string; icon: LucideIcon; help?: string }> = {
  confirmed: { label: 'Coché', tone: 'text-done border-done/60 bg-done/10', icon: Check },
  inferred: { label: 'Déduit', tone: 'text-done border-done/60 bg-done/10', icon: Check, help: 'Condition officielle vérifiée avec vos quêtes, succès et niveau' },
  todo: { label: 'À faire', tone: 'text-muted border-line', icon: CircleDashed },
  unknown: { label: 'À vérifier', tone: 'text-check border-check/50', icon: CircleHelp, help: 'Impossible à vérifier ici (monstres, objets…) : cochez-le vous-même' },
};

export interface CardCtx {
  graph: Graph;
  progress: Progress;
  setMark: (id: string, value: 'done' | null, source: 'manual', label: string) => void;
  goTo: (achievementId: number) => void;
  provenance: Map<string, HistoryEntry>;
}

export function Emblem({ root, display, large }: { root: string; display: DisplayState; large?: boolean }) {
  const Icon = rootIcon(root);
  const m = MARK[display];
  const Badge = m.icon;
  return (
    <span aria-hidden className={`relative flex shrink-0 items-center justify-center rounded-md border transition-colors ${large ? 'size-12' : 'size-10'} ${m.emblem}`}>
      <Icon size={large ? 22 : 18} strokeWidth={1.75} />
      <span className={`absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full border border-current bg-surface ${m.text}`}>
        <Badge size={9} strokeWidth={3} />
      </span>
    </span>
  );
}

export default function AchievementCard({ a, p, display, root, path, note, open, inline, onToggle, details }: {
  a: AchievementInfo; p: AchievementProgress; display: DisplayState; root: string;
  /** where it lives (shown outside its own category: search, recommendations) */
  path?: string;
  /** why it is shown (recommendation reason, search match) */
  note?: string;
  open: boolean;
  /** details unfold under the entry (narrow screens) instead of the side panel */
  inline: boolean;
  onToggle: () => void; details: ReactNode;
}) {
  const m = MARK[display];
  const preview = note ?? a.description ?? a.objectives.map((o) => o.name).filter(Boolean).slice(0, 3).join(' · ');
  return (
    <li id={`ach-${a.id}`} className="relative">
      <button onClick={onToggle} aria-expanded={open} aria-controls={`ach-body-${a.id}`}
        className={`group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 sm:px-4 ${open ? 'bg-surface-2' : 'hover:bg-surface-2/50'} ${display === 'later' && !open ? 'opacity-80' : ''}`}>
        {open && <span className="absolute left-0 top-1.5 h-[2.6rem] w-0.5 rounded-full bg-accent" aria-hidden />}
        <Emblem root={root} display={display} />
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-medium leading-snug ${display === 'later' ? 'text-muted' : 'text-text'}`}>{a.name}</span>
          {preview && <span className={`block text-[13px] leading-snug ${note ? 'line-clamp-2 text-accent' : 'truncate text-muted'}`}>{preview}</span>}
          <span className="mt-0.5 flex min-w-0 items-center gap-2 text-[11.5px] text-faint">
            <span className="shrink-0">Niv. {a.level}</span>
            {path && <span className="truncate">{path}</span>}
            {a.dofus.length > 0 && <span className="inline-flex shrink-0 items-center gap-1"><Gem size={11} aria-hidden /> Dofus</span>}
          </span>
        </span>
        <span className="flex w-[4.75rem] shrink-0 flex-col items-end gap-0.5 sm:w-24">
          <span className="flex items-baseline gap-1">
            <span className={`font-display text-base tabular-nums ${display === 'obtained' ? 'text-done' : 'text-accent'}`}>{a.points}</span>
            <span className="text-[10px] uppercase tracking-wide text-faint">pts</span>
          </span>
          <span className={`text-[11px] font-medium ${m.text}`} title={DISPLAY[display].help}>{DISPLAY[display].label}</span>
          {p.total > 0 && display !== 'obtained' && (
            <span className="flex w-full items-center gap-1.5">
              <ProgressBar value={p.met} max={p.total} className="!h-1 flex-1" label={`${p.met} objectifs sur ${p.total}`} />
              <span className="text-[10.5px] tabular-nums text-faint">{p.met}/{p.total}</span>
            </span>
          )}
        </span>
        <ChevronRight size={16} aria-hidden className={`hidden shrink-0 text-faint transition-transform duration-200 group-hover:text-muted sm:block ${open ? (inline ? 'rotate-90 text-accent' : 'text-accent') : ''}`} />
      </button>
      {open && inline && <div className="px-2 pb-3 pt-1 sm:px-4">{details}</div>}
    </li>
  );
}

export function AchievementDetails({ a, p, display, root, where, ctx, onClose, inline }: {
  a: AchievementInfo; p: AchievementProgress; display: DisplayState; root: string; where: string; ctx: CardCtx; onClose?: () => void;
  /** unfolded under its entry, which already shows the name, state, level and points */
  inline?: boolean;
}) {
  const status = (id: string): Status => ctx.graph.status(id, ctx.progress);
  const src = ctx.provenance.get(`ach:${a.id}`);
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
  const rewards: { icon: LucideIcon; text: string }[] = [
    { icon: Trophy, text: `${a.points} points de succès` },
    ...(r ? [
      r.xp && { icon: Sparkles, text: 'Expérience' }, r.kamas && { icon: Coins, text: 'Kamas' },
      ...r.items.map((it) => ({ icon: Gift, text: `${it.qty > 1 ? `${it.qty} × ` : ''}${it.name ?? `objet n°${it.id}`}` })),
      r.titles > 0 && { icon: Star, text: 'Titre' }, r.ornaments > 0 && { icon: Star, text: 'Ornement' },
      r.emotes > 0 && { icon: Star, text: 'Attitude' }, r.spells > 0 && { icon: Star, text: 'Sort' },
    ] : []).filter((x): x is { icon: LucideIcon; text: string } => !!x),
  ];
  const h3 = 'mb-2 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider text-faint';

  return (
    <section id={`ach-body-${a.id}`} aria-label={`Détails : ${a.name}`} className="parchment animate-rise overflow-hidden rounded-lg border border-[#c4a46e] shadow-md">
      {!inline && <header className="flex items-start gap-3 border-b border-line bg-surface-2/70 px-4 py-3.5">
        <Emblem root={root} display={display} large />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] uppercase tracking-wider text-faint">{where}</p>
          <h3 className="font-display text-lg leading-tight">{a.name}</h3>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
            <span className={`font-semibold ${MARK[display].text}`}>{DISPLAY[display].label}</span>
            <span>Niveau {a.level}</span>
            <span><b className="text-text">{a.points}</b> points</span>
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Fermer le détail" className="-mr-1 rounded p-1 text-faint transition-colors hover:bg-surface hover:text-text"><X size={16} aria-hidden /></button>
        )}
      </header>}

      <div className="flex flex-col gap-5 px-4 py-4 text-sm">
        {a.description && <p className="leading-relaxed text-muted">{a.description}</p>}

        {objectives.length > 0 && (
          <section>
            <h4 className={h3}><span>Objectifs</span><span className="tabular-nums normal-case tracking-normal">{p.met} sur {p.total}</span></h4>
            <ProgressBar value={p.met} max={p.total} className="mb-2" label={`${p.met} objectifs sur ${p.total}`} />
            <ul className="divide-y divide-line/70">
              {objectives.map(({ o, i, s, target }) => {
                const O = OBJ[s];
                return (
                  <li key={o.id} className="flex items-start gap-2.5 py-2">
                    <span className={`mt-px flex size-5 shrink-0 items-center justify-center rounded-full border ${O.tone}`} title={O.help} aria-hidden><O.icon size={11} strokeWidth={2.5} /></span>
                    <span className="min-w-0 flex-1 leading-snug">
                      {target?.kind === 'quest' ? <Link className="underline decoration-faint underline-offset-2 hover:text-accent" href={questHref(target)}>{o.name ?? target.label}</Link>
                        : target?.kind === 'achievement' ? <button className="text-left underline decoration-faint underline-offset-2 hover:text-accent" onClick={() => ctx.goTo(target.refId)}>{o.name ?? target.label}</button>
                        : o.name ?? `Objectif ${i + 1}`}
                      <span className={`block text-[11px] font-medium ${O.tone.split(' ')[0]}`} title={O.help}>{O.label}</span>
                    </span>
                    {s !== 'inferred' && (
                      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-xs text-muted hover:text-text">
                        <input type="checkbox" checked={s === 'confirmed'} className="size-4 accent-[var(--color-brand)]"
                          onChange={(e) => ctx.setMark(`obj:${o.id}`, e.target.checked ? 'done' : null, 'manual', `Objectif « ${o.name ?? i + 1} » de « ${a.name} »`)} />
                        fait
                      </label>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-1 flex items-start gap-1 text-[11px] leading-snug text-faint"><CircleHelp size={12} className="mt-px shrink-0" aria-hidden /> « Déduit » : vérifié d’après vos quêtes, succès et niveau. « À vérifier » : seul le jeu le sait, cochez-le quand c’est fait.</p>
          </section>
        )}

        {(quests.size > 0 || a.dungeons.length > 0 || a.dofus.length > 0) && (
          <section>
            <h4 className={h3}>Où aller</h4>
            <ul className="flex flex-col gap-1.5">
              {[...quests].map(([id, label]) => (
                <li key={id} className="flex flex-wrap items-center gap-2">
                  <Scroll size={14} className="shrink-0 text-faint" aria-hidden />
                  <Link href={questHref(ctx.graph.nodes.get(id)!)} className="underline decoration-faint underline-offset-2 hover:text-accent">Quête : {label}</Link>
                  <StatusPill status={status(id)} className="!py-0 !text-[11px]" />
                </li>
              ))}
              {a.dungeons.map((d) => (
                <li key={d.name} className="flex items-center gap-2"><Castle size={14} className="shrink-0 text-faint" aria-hidden /> Donjon : {d.name} <span className="text-xs text-faint">· niv. {d.level}</span></li>
              ))}
              {a.dofus.map((d) => (
                <li key={d} className="flex items-center gap-2"><Gem size={14} className="shrink-0 text-faint" aria-hidden /> Compte pour le Dofus : {d}</li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h4 className={h3}><span className="flex items-center gap-1.5"><Gift size={13} aria-hidden /> Récompenses</span></h4>
          <ul className="flex flex-wrap gap-1.5 text-xs">
            {rewards.map(({ icon: I, text }) => <li key={text} className="inline-flex items-center gap-1.5 rounded border border-line bg-surface-2 px-2 py-1"><I size={12} className="text-accent" aria-hidden />{text}</li>)}
          </ul>
        </section>
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2/50 px-4 py-3">
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
      </footer>
    </section>
  );
}
