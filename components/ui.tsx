// Shared UI primitives. Pages use these instead of repeating class strings.
import Link from 'next/link';
import { Check, CircleHelp, Lock, Play, X } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import type { Status } from '../src/graph.ts';
import type { Element } from '../src/spells.ts';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost';
const BTN: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:brightness-110 font-semibold',
  secondary: 'border border-line bg-surface-2 text-text hover:border-faint',
  ghost: 'text-muted hover:bg-surface-2 hover:text-text',
};
const btnBase = 'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm transition disabled:opacity-50';

export function Button({ variant = 'secondary', className, ...p }: ComponentProps<'button'> & { variant?: Variant }) {
  return <button className={cx(btnBase, BTN[variant], className)} {...p} />;
}
export function ButtonLink({ variant = 'secondary', className, ...p }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cx(btnBase, BTN[variant], className)} {...p} />;
}

export function Card({ className, ...p }: ComponentProps<'div'>) {
  return <div className={cx('rounded-xl border border-line bg-surface p-4', className)} {...p} />;
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="font-display text-base font-semibold text-text">{children}</h2>
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
      <div className="h-full rounded-full bg-done" style={{ width: `${pct}%` }} />
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
      className="absolute inset-y-0 right-0 z-20 flex w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl shadow-black/50"
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
