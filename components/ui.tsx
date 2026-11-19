// Shared UI primitives. Pages use these instead of repeating class strings.
import Link from 'next/link';
import { Check, CircleHelp, Lock, Play, X } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import type { Status } from '../src/graph.ts';
import type { Element } from '../src/spells.ts';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost';
const BTN: Record<Variant, string> = {
  // the official site's green call-to-action: display face, uppercase, pressed-in bottom edge
  primary: 'bg-cta text-white font-display uppercase tracking-wide shadow-[inset_0_-3px_0_rgba(0,0,0,0.28),0_2px_8px_rgba(0,0,0,0.25)] hover:bg-cta-hi active:translate-y-px',
  secondary: 'border border-line bg-surface-2 text-text hover:border-faint hover:bg-line/60',
  ghost: 'text-muted hover:bg-surface-2 hover:text-text',
};
const btnBase = 'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm transition disabled:pointer-events-none disabled:opacity-50';

export function Button({ variant = 'secondary', className, ...p }: ComponentProps<'button'> & { variant?: Variant }) {
  return <button className={cx(btnBase, BTN[variant], className)} {...p} />;
}
export function ButtonLink({ variant = 'secondary', className, ...p }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cx(btnBase, BTN[variant], className)} {...p} />;
}

/** Panel. `paper` turns it into parchment: same utilities inside, ink colours. */
export function Card({ className, paper, ...p }: ComponentProps<'div'> & { paper?: boolean }) {
  return <div className={cx('rounded-xl border p-4', paper ? 'parchment border-[#c4a46e] shadow-[0_6px_20px_rgba(0,0,0,0.35)]'
    : 'border-line bg-surface shadow-[inset_0_1px_0_rgba(255,240,210,0.04)]', className)} {...p} />;
}

/** Section colours (globals.css --color-sec-*): each area keeps its own hue. */
export const SECTION = {
  quests: 'var(--color-sec-quests)', achievements: 'var(--color-sec-achievements)', builds: 'var(--color-sec-builds)',
  characters: 'var(--color-sec-characters)', scan: 'var(--color-sec-scan)', account: 'var(--color-sec-account)',
} as const;

/**
 * Banner at the top of a page: section colour, optional official artwork (local copy, see scripts/fetch-assets.ts)
 * that simply does not show when it was not downloaded.
 */
export function PageHero({ title, kicker, color, image, children, className }: {
  title: ReactNode; kicker?: ReactNode; color: string; image?: string; children?: ReactNode; className?: string;
}) {
  return (
    <header className={cx('relative isolate overflow-hidden border-b border-black/30', className)}
      style={{ backgroundColor: color, backgroundImage: `${image ? `url(${image}), ` : ''}linear-gradient(115deg, rgba(0,0,0,0.55), rgba(0,0,0,0.05))`, backgroundSize: 'cover', backgroundPosition: 'right center' }}>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/70 via-black/35 to-transparent" aria-hidden />
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 sm:py-8">
        {kicker && <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#ffe2a6]">{kicker}</p>}
        <h1 className="title-hero text-2xl leading-tight text-white sm:text-3xl">{title}</h1>
        {children}
      </div>
    </header>
  );
}

/** Rotated-square tile (roles, elements, statuses in the official style). */
export function Diamond({ color, size = 34, children, label }: { color: string; size?: number; children?: ReactNode; label?: string }) {
  return (
    <span role={label ? 'img' : undefined} aria-label={label} className="inline-flex shrink-0 items-center justify-center" style={{ width: size * 1.42, height: size * 1.42 }}>
      <span className="diamond flex items-center justify-center border-2 border-black/30 text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.25),0_3px_8px_rgba(0,0,0,0.35)]"
        style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 60%, black))` }}>
        <span className="flex items-center justify-center">{children}</span>
      </span>
    </span>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="font-display text-base text-text">{children}</h2>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

/** Status wording for players (never colour alone: icon + text). */
export const STATUS: Record<Status, { label: string; help: string; icon: typeof Check; text: string; bg: string; border: string }> = {
  done: { label: 'Terminée', help: 'Vous avez marqué cette quête comme terminée.', icon: Check, text: 'text-done', bg: 'bg-done/12', border: 'border-done/60' },
  available: { label: 'Disponible', help: 'Toutes les conditions sont remplies : vous pouvez la faire maintenant.', icon: Play, text: 'text-accent', bg: 'bg-accent/10', border: 'border-accent' },
  locked: { label: 'Verrouillée', help: 'Il manque au moins une condition (une quête, un niveau…).', icon: Lock, text: 'text-muted', bg: 'bg-surface-2', border: 'border-line' },
  unknown: { label: 'À vérifier en jeu', help: "Une condition ne peut pas être vérifiée ici (objet possédé, jour de l'Almanax…).", icon: CircleHelp, text: 'text-check', bg: 'bg-check/10', border: 'border-check/50 border-dashed' },
};

export function StatusPill({ status, className }: { status: Status; className?: string }) {
  const s = STATUS[status];
  const Icon = s.icon;
  return (
    <span title={s.help} className={cx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', s.text, s.bg, s.border, className)}>
      <Icon size={12} aria-hidden /> {s.label}
    </span>
  );
}

export const ELEMENT_CLASS: Record<Element, string> = {
  Feu: 'text-el-feu border-el-feu/50 bg-el-feu/10',
  Eau: 'text-el-eau border-el-eau/50 bg-el-eau/10',
  Terre: 'text-el-terre border-el-terre/50 bg-el-terre/10',
  Air: 'text-el-air border-el-air/50 bg-el-air/10',
  Neutre: 'text-el-neutre border-el-neutre/50 bg-el-neutre/10',
};
export function ElementTag({ element }: { element: Element }) {
  return <span className={cx('rounded-full border px-2 py-0.5 text-[11px] font-medium', ELEMENT_CLASS[element])}>{element}</span>;
}

export function ProgressBar({ value, max, className, label }: { value: number; max: number; className?: string; label?: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className={cx('h-1.5 w-full overflow-hidden rounded-full bg-surface-2', className)}
      role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <div className="h-full rounded-full bg-gradient-to-r from-done to-[color-mix(in_srgb,var(--color-done)_70%,var(--color-accent))] transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Glossary term: dotted underline with an explanation on hover/focus. */
export function Term({ children, def }: { children: ReactNode; def: string }) {
  return (
    <abbr title={def} tabIndex={0} className="cursor-help underline decoration-faint decoration-dotted underline-offset-2">
      {children}
    </abbr>
  );
}

/** Panel sliding over the content (does not shrink it). */
export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  if (!open) return null;
  return (
    <aside
      role="dialog" aria-modal="false" aria-label={typeof title === 'string' ? title : undefined}
      className="parchment absolute inset-y-0 right-0 z-20 flex w-full max-w-md animate-rise flex-col border-l-4 border-[#a8834a] shadow-2xl shadow-black/60"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="flex items-start gap-2 border-b border-line p-4">
        <div className="min-w-0 flex-1">{title}</div>
        <button aria-label="Fermer" className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-text" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
    </aside>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-6 text-center">
      <p className="font-medium text-text">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}
