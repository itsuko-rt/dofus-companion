'use client';
// One achievement in the journal.
// - AchievementCard: a compact entry to scan quickly: a medallion (root category icon inside a ring that fills with the
//   objectives met), the name, one line of context, the level, the points and the state.
// - AchievementDetails: the parchment sheet: what to do (objectives with their state and, when the game data names it,
//   the monster, zone or dungeon behind them), where to go (links), rewards, and the completion action.
// The game files carry no achievement icons, so the medallion shows the icon of the achievement's root category.
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowUpRight, BookOpen, Castle, Check, ChevronRight, CircleDashed, CircleHelp, Clock, Coins, Compass, Droplets, ExternalLink, Gem, Gift,
  Hammer, Hourglass, Lock, MapPin, Moon, PartyPopper, PawPrint, Scroll, Shield, Skull, Sparkles, Star, Swords, Trophy, Undo2, Users, X,
  type LucideIcon,
} from 'lucide-react';
import type { AchievementInfo, ObjectivePlace } from '../../src/load.ts';
import type { AchievementProgress, ObjectiveState } from '../../src/achievements.ts';
import { DISPLAY, type DisplayState } from '../../src/achievement-guide.ts';
import { CHANGE_SOURCES, type HistoryEntry } from '../../src/character.ts';
import { parse, reference } from '../../src/criteria.ts';
import type { Graph, Status } from '../../src/graph.ts';
import type { Progress } from '../../src/criteria.ts';
import { questHref } from '../quests/NextSteps';
import { Button, StatusPill } from '../ui';

/** Root category name (achievementcategoriesdata, 3.7.14.18) → emblem; an unknown future category gets the trophy. */
const ROOT_ICON: Record<string, LucideIcon> = {
  'Quêtes': Scroll, 'Exploration': Compass, 'Monstres': Skull, 'Donjons': Castle, 'Métiers': Hammer, 'Général': Star,
  'Élevage': PawPrint, 'Compagnons': Users, 'Guilde': Shield, 'Kolizéum': Swords, 'Songes Infinis': Moon,
  'Anomalies Temporelles': Hourglass, "La Source : L'Héritage des Dofus": Droplets, 'Événements': PartyPopper, 'Temporis': Clock,
};
export const rootIcon = (name: string): LucideIcon => ROOT_ICON[name] ?? Trophy;

// state: ring and disc colours on the medallion, a badge for the two states that call for attention or reward,
// and always the text label next to it (never colour alone)
export const MARK: Record<DisplayState, { text: string; disc: string; badge?: { icon: LucideIcon; tone: string } }> = {
  obtained: { text: 'text-done', disc: 'bg-done/20 text-done', badge: { icon: Check, tone: 'bg-done text-bg' } },
  ready: { text: 'text-accent', disc: 'bg-accent/20 text-accent', badge: { icon: Star, tone: 'bg-accent text-accent-ink' } },
  in_progress: { text: 'text-info', disc: 'bg-info/12 text-info' },
  todo: { text: 'text-muted', disc: 'bg-surface-2 text-muted' },
  later: { text: 'text-faint', disc: 'bg-transparent text-faint', badge: { icon: Lock, tone: 'bg-surface-2 text-faint' } },
};

/** Points tier, from the game's point values (0–5, 10, 20–30, 40+): presentation only, to scan the bigger rewards. */
const tier = (pts: number) => (pts >= 40 ? 'gold' : pts >= 20 ? 'silver' : pts >= 10 ? 'bronze' : 'plain');
const TIER: Record<ReturnType<typeof tier>, string> = {
  gold: 'text-[#f5c85c] border-[#f5c85c]/55 bg-[#f5c85c]/12',
  silver: 'text-[#e2dccf] border-[#e2dccf]/40 bg-[#e2dccf]/[0.07]',
  bronze: 'text-[#dba070] border-[#dba070]/45 bg-[#dba070]/10',
  plain: 'text-muted border-line bg-transparent',
};

export interface CardCtx {
  graph: Graph;
  progress: Progress;
  setMark: (id: string, value: 'done' | null, source: 'manual', label: string) => void;
  goTo: (achievementId: number) => void;
  provenance: Map<string, HistoryEntry>;
}

/** Medallion: category icon in a disc, inside a ring filled by the share of objectives met (full once obtained). */
export function Medal({ root, display, met = 0, total = 0, size = 40 }: { root: string; display: DisplayState; met?: number; total?: number; size?: number }) {
  const Icon = rootIcon(root);
  const m = MARK[display];
  const r = size / 2 - 2, c = 2 * Math.PI * r;
  const frac = display === 'obtained' ? 1 : total ? met / total : 0;
  const B = m.badge;
  return (
    <span aria-hidden className={`relative inline-flex shrink-0 items-center justify-center ${m.text}`} style={{ width: size, height: size }}>
      <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth={2.5} />
        {frac > 0 && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - frac)} className="transition-[stroke-dashoffset] duration-500 ease-out" />}
      </svg>
      <span className={`flex items-center justify-center rounded-full transition-colors ${m.disc}`} style={{ width: size - 10, height: size - 10 }}>
        <Icon size={Math.round(size * 0.4)} strokeWidth={1.75} />
      </span>
      {B && (
        <span className={`absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full ring-2 ring-surface ${B.tone}`} style={{ width: size * 0.36, height: size * 0.36 }}>
          <B.icon size={Math.round(size * 0.22)} strokeWidth={3} />
        </span>
      )}
    </span>
  );
}

export function Points({ value, done }: { value: number; done?: boolean }) {
  const t = tier(value);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-px font-display text-[13px] tabular-nums leading-5 ${done ? 'border-done/50 bg-done/12 text-done' : TIER[t]}`}
      title={t === 'plain' ? `${value} points de succès` : `${value} points de succès (palier ${t === 'gold' ? 'or : 40 et plus' : t === 'silver' ? 'argent : 20 à 30' : 'bronze : 10'})`}>
      {value}<span className="font-sans text-[9.5px] font-semibold uppercase tracking-wider opacity-80">pts</span>
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
  const done = display === 'obtained';
  const preview = note ?? a.description ?? a.objectives.map((o) => o.name).filter(Boolean).slice(0, 3).join(' · ');
  return (
    <li id={`ach-${a.id}`} className="relative">
      <button onClick={onToggle} aria-expanded={open} aria-controls={`ach-body-${a.id}`}
        className={`group flex w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-150 sm:px-4 ${open ? 'bg-surface-2' : done ? 'bg-gradient-to-r from-done/[0.07] to-transparent hover:bg-surface-2/50' : 'hover:bg-surface-2/50'}`}>
        <span className={`absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent transition-opacity duration-150 ${open ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
        <Medal root={root} display={display} met={p.met} total={p.total} />
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[14.5px] font-medium leading-snug ${display === 'later' ? 'text-muted' : 'text-text'}`}>{a.name}</span>
          {preview && <span className={`block text-[12.5px] leading-snug ${note ? 'line-clamp-2 text-accent/90' : 'truncate text-muted'}`}>{preview}</span>}
          {path && <span className="block truncate text-[11px] text-faint">{path}</span>}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="flex items-center gap-2">
            <span className="hidden text-[11px] tabular-nums text-faint sm:inline">niv. {a.level}</span>
            <Points value={a.points} done={done} />
          </span>
          <span className={`text-[11px] font-medium tabular-nums ${m.text}`} title={DISPLAY[display].help}>
            {DISPLAY[display].label}{p.total > 0 && !done ? ` · ${p.met}/${p.total}` : ''}
            <span className="text-faint sm:hidden"> · niv. {a.level}</span>
          </span>
        </span>
        <ChevronRight size={16} aria-hidden className={`hidden shrink-0 text-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-muted sm:block ${open ? (inline ? 'rotate-90 text-accent' : 'text-accent') : ''}`} />
      </button>
      {open && inline && <div className="px-2 pb-3 pt-1 sm:px-4">{details}</div>}
    </li>
  );
}

const OBJ: Record<ObjectiveState, { label: string; icon: LucideIcon; disc: string; chip: string; help?: string }> = {
  confirmed: { label: 'Coché', icon: Check, disc: 'bg-done text-white', chip: 'text-done' },
  inferred: { label: 'Déduit', icon: Check, disc: 'bg-done text-white', chip: 'text-done', help: 'Condition officielle vérifiée avec vos quêtes, succès et niveau' },
  todo: { label: 'À faire', icon: CircleDashed, disc: 'border-[1.5px] border-faint/70 text-faint', chip: 'text-muted' },
  unknown: { label: 'À vérifier', icon: CircleHelp, disc: 'border-[1.5px] border-dashed border-check text-check', chip: 'text-check', help: 'Impossible à vérifier ici (monstres, objets…) : cochez-le vous-même' },
};
const levelHref = (lv: number) => `/progression/niveau?niveau=${lv}`;
const levelText = (l: [number, number] | null) => (!l ? null : l[0] === l[1] ? `niv. ${l[0]}` : `niv. ${l[0]}–${l[1]}`);
const PLACE: Record<ObjectivePlace['kind'], { icon: LucideIcon; label: string }> = {
  monster: { icon: Skull, label: 'Monstre' }, zone: { icon: MapPin, label: 'Zone' }, dungeon: { icon: Castle, label: 'Donjon' },
};

/** Where an objective's monster lives, which region a zone is in, a dungeon's level: with a link to the level page. */
function PlaceLine({ place }: { place: ObjectivePlace }) {
  const P = PLACE[place.kind];
  const shown = place.zones.slice(0, 3);
  const mid = place.level ? Math.round((place.level[0] + place.level[1]) / 2) : null;
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-muted">
      <P.icon size={11} className="shrink-0 text-faint" aria-hidden />
      <span>{P.label}{levelText(place.level) ? ` · ${levelText(place.level)}` : ''}</span>
      {shown.length > 0 && <span className="text-faint">· {place.kind === 'monster' ? 'vit à ' : ''}{shown.join(', ')}{place.zones.length > 3 ? ` +${place.zones.length - 3}` : ''}</span>}
      {mid && <Link href={levelHref(mid)} className="inline-flex items-center gap-0.5 font-medium text-accent underline-offset-2 hover:underline">voir ce niveau<ArrowUpRight size={11} aria-hidden /></Link>}
    </span>
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
  const left = p.total - p.met;
  const confirm = (how: 'manual' | 'objectives') =>
    ctx.setMark(`ach:${a.id}`, 'done', 'manual', how === 'objectives' ? `« ${a.name} » confirmé (objectifs remplis)` : `« ${a.name} » marqué obtenu`);
  const r = a.rewards;
  const rewards: { icon: LucideIcon; text: string; sub: string; main?: boolean }[] = [
    { icon: Trophy, text: `${a.points} points`, sub: 'de succès', main: true },
    ...(r ? [
      r.xp && { icon: Sparkles, text: 'Expérience', sub: 'selon le niveau' }, r.kamas && { icon: Coins, text: 'Kamas', sub: 'selon le niveau' },
      ...r.items.map((it) => ({ icon: Gift, text: it.name ?? `objet n°${it.id}`, sub: it.qty > 1 ? `× ${it.qty}` : 'objet' })),
      r.titles > 0 && { icon: Star, text: 'Titre', sub: 'cosmétique' }, r.ornaments > 0 && { icon: Star, text: 'Ornement', sub: 'cosmétique' },
      r.emotes > 0 && { icon: Star, text: 'Attitude', sub: 'cosmétique' }, r.spells > 0 && { icon: Star, text: 'Sort', sub: 'nouveau sort' },
    ] : []).filter((x): x is { icon: LucideIcon; text: string; sub: string } => !!x),
  ];
  const dungeonNames = new Set(a.dungeons.map((d) => d.name));
  const h4 = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-faint';
  const goRow = 'group flex items-center gap-3 rounded-md border border-line/80 bg-surface/70 px-3 py-2 transition-colors hover:border-accent/50 hover:bg-surface';

  return (
    <section id={`ach-body-${a.id}`} aria-label={`Détails : ${a.name}`}
      className="parchment animate-rise overflow-hidden rounded-xl border border-[#c4a46e] shadow-[0_10px_30px_-14px_rgb(0_0_0/0.7)]">
      {!inline && (
        <header className="flex items-start gap-3.5 px-5 pb-4 pt-5">
          <Medal root={root} display={display} met={p.met} total={p.total} size={52} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint">{where}</p>
            <h3 className="mt-0.5 font-display text-xl leading-tight">{a.name}</h3>
            <p className="mt-1 text-xs text-muted">
              <span className={`font-semibold ${MARK[display].text}`}>{DISPLAY[display].label}</span> · niveau {a.level}
            </p>
          </div>
          {onClose && (
            <button onClick={onClose} aria-label="Fermer le détail" className="-mr-1 -mt-1 rounded-md p-1.5 text-faint transition-colors hover:bg-surface-2 hover:text-text"><X size={16} aria-hidden /></button>
          )}
        </header>
      )}

      {/* at a glance: how much is left, what it pays */}
      <div className={`grid grid-cols-2 divide-x divide-line border-y border-line bg-surface-2/50 text-sm ${inline ? 'border-t-0' : ''}`}>
        <div className="px-5 py-2.5">
          <p className={h4}>Progression</p>
          <p className="mt-0.5 font-medium">{p.state === 'obtained' ? 'Obtenu' : p.total === 0 ? '—' : left === 0 ? 'Objectifs remplis' : `Reste ${left} objectif${left > 1 ? 's' : ''} sur ${p.total}`}</p>
          {(p.total > 0 || p.state === 'obtained') && <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-line" aria-hidden><span className="block h-full rounded-full bg-done transition-[width] duration-500" style={{ width: `${p.state === 'obtained' ? 100 : (p.met / p.total) * 100}%` }} /></span>}
        </div>
        <div className="px-5 py-2.5">
          <p className={h4}>Récompense</p>
          <p className="mt-0.5 font-medium"><span className="font-display text-base">{a.points}</span> points{rewards.length > 1 ? ` + ${rewards.length - 1} autre${rewards.length > 2 ? 's' : ''}` : ''}</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-5 py-5 text-sm">
        {a.description && <p className="border-l-2 border-accent/40 pl-3 italic leading-relaxed text-muted">{a.description}</p>}

        {objectives.length > 0 && (
          <section>
            <h4 className={`${h4} mb-2.5`}>Ce qu’il faut faire</h4>
            <ul className="flex flex-col gap-1.5">
              {objectives.map(({ o, i, s, target }) => {
                const O = OBJ[s];
                const met = s === 'confirmed' || s === 'inferred';
                // a dungeon objective already listed under "Où aller" keeps its line short
                const linked = target?.kind === 'quest' || target?.kind === 'achievement';
                const place = !linked && o.place && !(o.place.kind === 'dungeon' && dungeonNames.has(o.name ?? '')) ? o.place : undefined;
                return (
                  <li key={o.id} className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${met ? 'border-done/25 bg-done/[0.06]' : 'border-line/80 bg-surface/60'}`}>
                    <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${O.disc}`} aria-hidden><O.icon size={12} strokeWidth={3} /></span>
                    <span className="min-w-0 flex-1 leading-snug">
                      <span className={met ? 'text-muted' : 'font-medium text-text'}>
                        {target?.kind === 'quest' ? <Link className="underline decoration-faint/60 underline-offset-2 hover:text-accent hover:decoration-accent" href={questHref(target)}>{o.name ?? target.label}</Link>
                          : target?.kind === 'achievement' ? <button className="text-left underline decoration-faint/60 underline-offset-2 hover:text-accent hover:decoration-accent" onClick={() => ctx.goTo(target.refId)}>{o.name ?? target.label}</button>
                          : o.name ?? `Objectif ${i + 1}`}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px]">
                        <span className={`font-semibold ${O.chip}`} title={O.help}>{O.label}</span>
                        {target?.kind === 'quest' && <span className="text-faint">· Quête</span>}
                        {target?.kind === 'achievement' && <span className="text-faint">· Succès</span>}
                      </span>
                      {place && <PlaceLine place={place} />}
                    </span>
                    {s !== 'inferred' && (
                      <label className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${s === 'confirmed' ? 'border-done/40 text-done' : 'border-line text-muted hover:border-faint hover:text-text'}`}>
                        <input type="checkbox" checked={s === 'confirmed'} className="size-3.5 accent-[var(--color-done)]"
                          onChange={(e) => ctx.setMark(`obj:${o.id}`, e.target.checked ? 'done' : null, 'manual', `Objectif « ${o.name ?? i + 1} » de « ${a.name} »`)} />
                        fait
                      </label>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-faint"><CircleHelp size={12} className="mt-px shrink-0" aria-hidden /> « Déduit » : vérifié d’après vos quêtes, succès et niveau. « À vérifier » : seul le jeu le sait, cochez-le quand c’est fait.</p>
          </section>
        )}

        {(quests.size > 0 || a.dungeons.length > 0 || a.dofus.length > 0) && (
          <section>
            <h4 className={`${h4} mb-2.5`}>Où aller</h4>
            <ul className="flex flex-col gap-1.5">
              {[...quests].map(([id, label]) => (
                <li key={id}>
                  <Link href={questHref(ctx.graph.nodes.get(id)!)} className={goRow}>
                    <Scroll size={16} className="shrink-0 text-accent" aria-hidden />
                    <span className="min-w-0 flex-1">Quête : {label}</span>
                    <StatusPill status={status(id)} className="!py-0 !text-[11px]" />
                    <ChevronRight size={14} className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              ))}
              {a.dungeons.map((d) => (
                <li key={d.name}>
                  <Link href={levelHref(d.level)} className={goRow}>
                    <Castle size={16} className="shrink-0 text-accent" aria-hidden />
                    <span className="min-w-0 flex-1">Donjon : {d.name}<span className="block text-[11px] text-faint">niv. {d.level} · zones et donjons de ce niveau</span></span>
                    <ChevronRight size={14} className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              ))}
              {a.dofus.map((d) => (
                <li key={d.slug}>
                  <Link href={`/guides/dofus/${d.slug}`} className={goRow}>
                    <Gem size={16} className="shrink-0 text-accent" aria-hidden />
                    <span className="min-w-0 flex-1">Compte pour le Dofus : {d.name}<span className="block text-[11px] text-faint">guide du Dofus : tout ce qu’il demande</span></span>
                    <ChevronRight size={14} className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h4 className={`${h4} mb-2.5`}>Récompenses</h4>
          <ul className="grid grid-cols-2 gap-1.5">
            {rewards.map(({ icon: I, text, sub, main }) => (
              <li key={text} className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 ${main ? 'border-accent/45 bg-accent/10' : 'border-line/80 bg-surface/60'}`}>
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${main ? 'bg-accent text-parchment' : 'bg-surface-2 text-accent'}`}><I size={15} aria-hidden /></span>
                <span className="min-w-0 leading-tight"><span className="line-clamp-2 font-medium" title={text}>{text}</span><span className="block text-[11px] text-faint">{sub}</span></span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <footer className={`flex flex-wrap items-center gap-x-3 gap-y-2 border-t px-5 py-3.5 ${p.state === 'obtained' ? 'border-done/30 bg-done/10' : p.state === 'ready' ? 'border-accent/40 bg-accent/10' : 'border-line bg-surface-2/50'}`}>
        {p.state === 'obtained' ? (
          <>
            <span className="flex items-center gap-2 font-medium text-done"><span className="flex size-6 items-center justify-center rounded-full bg-done text-white"><Check size={14} strokeWidth={3} aria-hidden /></span>Obtenu</span>
            {src && <span className="text-xs text-faint">{CHANGE_SOURCES[src.source]} · {new Date(src.at).toLocaleDateString('fr-FR')}</span>}
            <Button variant="ghost" className="ml-auto !px-2.5 !py-1 text-xs" onClick={() => ctx.setMark(`ach:${a.id}`, null, 'manual', `« ${a.name} » n’est plus marqué obtenu`)}><Undo2 size={13} aria-hidden /> Annuler « obtenu »</Button>
          </>
        ) : p.state === 'ready' ? (
          <>
            <span className="min-w-0 flex-1 text-xs text-muted">Tout est rempli d’après votre progression. Vérifiez dans le jeu, puis confirmez.</span>
            <Button variant="primary" className="!px-3 !py-1.5 text-xs" onClick={() => confirm('objectives')}><Check size={14} aria-hidden /> Tous les objectifs sont remplis : confirmer</Button>
          </>
        ) : (
          <>
            <span className="min-w-0 flex-1 text-xs text-muted">Déjà obtenu dans le jeu ? Marquez-le : vos suggestions se mettent à jour.</span>
            <Button variant="primary" className="!px-3 !py-1.5 text-xs" onClick={() => confirm('manual')}><Check size={14} aria-hidden /> Je l’ai obtenu</Button>
          </>
        )}
        {a.guide && (
          <a href={a.guide.url} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center gap-1.5 text-xs font-medium text-accent underline-offset-2 hover:underline">
            <BookOpen size={13} aria-hidden /> Guide sur {a.guide.site} <ExternalLink size={11} aria-hidden />
          </a>
        )}
      </footer>
    </section>
  );
}
