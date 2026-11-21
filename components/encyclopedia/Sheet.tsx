// Building blocks of an encyclopaedia sheet: one header, then sections of linked rows. Server components (no state).
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronRight, Gem, Scroll, Trophy, type LucideIcon } from 'lucide-react';
import Breadcrumbs from '../Breadcrumbs';
import type { AchievementRef, Ref } from '../../src/encyclopedia.ts';
import type { EncyKind } from '../../src/encyclopedia-shared.ts';
import { KIND_ICON } from './icons';

export { KIND_ICON };
const VERSION_NOTE = 'Données du jeu DOFUS 3.7.14.18 (fichiers du client).';

export function SheetLayout({ kind, kicker, title, meta, crumbs, children, aside }: {
  kind: EncyKind; kicker: string; title: string; meta?: ReactNode; crumbs: [string, string][]; children: ReactNode; aside?: ReactNode;
}) {
  const Icon = KIND_ICON[kind];
  return (
    <div className="h-full overflow-y-auto">
      <header className="relative isolate overflow-hidden border-b border-accent/25 bg-surface">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_srgb,var(--color-sec-achievements)_30%,transparent),transparent_65%)]" />
        <div className="mx-auto max-w-6xl px-4 pb-5 pt-3">
          <Breadcrumbs trail={[['Accueil', '/'], ['Encyclopédie', '/encyclopedie'], ...crumbs]} />
          <div className="mt-3 flex items-start gap-4">
            <span className="diamond mt-1 flex size-11 shrink-0 items-center justify-center border border-accent/40 bg-accent/10 text-accent"><Icon size={20} strokeWidth={1.75} aria-hidden /></span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#e9c784]">{kicker}</p>
              <h1 className="title-hero text-2xl leading-tight text-white sm:text-[1.75rem]">{title}</h1>
              {meta && <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">{meta}</div>}
            </div>
          </div>
        </div>
      </header>
      <div className={`mx-auto grid max-w-6xl gap-5 px-4 py-6 ${aside ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : ''}`}>
        <div className="flex min-w-0 flex-col gap-5">{children}</div>
        {aside && <aside className="flex min-w-0 flex-col gap-5">{aside}</aside>}
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-8 text-[11px] text-faint">{VERSION_NOTE}</p>
    </div>
  );
}

export function Section({ title, count, hint, children }: { title: string; count?: number; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-line/80 bg-surface/60 shadow-[0_1px_2px_rgb(0_0_0/0.25)]">
      <header className="flex items-baseline justify-between gap-3 border-b border-line/70 px-4 py-2.5">
        <h2 className="font-display text-base">{title}</h2>
        {count != null && <span className="text-xs tabular-nums text-faint">{count}</span>}
      </header>
      {hint && <p className="border-b border-line/50 px-4 py-2 text-xs text-muted">{hint}</p>}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-3 text-sm text-muted">{children}</p>;
}

/** Linked rows; long lists stay compact (columns on wide screens). */
export function RefList({ items, icon: Icon, columns, empty }: { items: (Ref & { right?: ReactNode })[]; icon?: LucideIcon; columns?: boolean; empty?: string }) {
  if (!items.length) return empty ? <Empty>{empty}</Empty> : null;
  return (
    <ul className={columns ? 'grid sm:grid-cols-2' : 'divide-y divide-line/60'}>
      {items.map((r) => (
        <li key={`${r.href}`} className={columns ? 'border-b border-line/50 sm:odd:border-r' : ''}>
          <Link href={r.href} className="group flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-surface-2/60">
            {Icon && <Icon size={15} className="shrink-0 text-faint group-hover:text-accent" aria-hidden />}
            <span className="min-w-0 flex-1"><span className="block truncate text-text">{r.name}</span>{r.sub && <span className="block truncate text-xs text-faint">{r.sub}</span>}</span>
            {r.right}
            <ChevronRight size={14} className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function QuestList({ quests }: { quests: { id: number; name: string; level: number | null; href: string }[] }) {
  return <RefList icon={Scroll} items={quests.map((q) => ({ id: q.id, name: q.name, href: q.href, sub: q.level ? `niv. ${q.level}` : undefined }))} />;
}

export function AchievementList({ items }: { items: AchievementRef[] }) {
  return (
    <RefList icon={Trophy} items={items.map((a) => ({ id: a.id, name: a.name, href: a.href, sub: `niv. ${a.level}`,
      right: <span className="rounded-full border border-accent/40 px-2 font-display text-xs tabular-nums text-accent">{a.points} pts</span> }))} />
  );
}

/** A drop rate per grade: one figure when all grades agree, else min–max. */
export const rateText = (r: number[]) => {
  if (!r.length) return '—';
  const f = (x: number) => `${x.toLocaleString('fr-FR', { maximumFractionDigits: 3 })} %`;
  const lo = Math.min(...r), hi = Math.max(...r);
  return lo === hi ? f(lo) : `${f(lo)} – ${f(hi)}`;
};
export const DROP_HINT = 'Taux de base du jeu, par grade du monstre, pour un personnage. La prospection, les challenges et les bonus les augmentent en jeu selon des règles que les fichiers du jeu ne décrivent pas. « Sous condition » : le jeu pose une condition (quête, niveau, carte…).';

export function DofusLink({ href }: { href: string }) {
  return <Link href={href} className="inline-flex items-center gap-1.5 text-accent underline-offset-2 hover:underline"><Gem size={14} aria-hidden /> Guide du Dofus</Link>;
}
