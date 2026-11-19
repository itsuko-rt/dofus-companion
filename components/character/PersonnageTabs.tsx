'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/personnage', label: 'Profil', match: (p: string) => p === '/personnage' },
  { href: '/personnage/sorts', label: 'Sorts', match: (p: string) => p.startsWith('/personnage/sorts') },
];

export default function PersonnageTabs() {
  const path = usePathname();
  return (
    <div className="flex shrink-0 gap-1 border-b border-line bg-surface px-4" role="tablist" aria-label="Personnage">
      {TABS.map((t) => {
        const active = t.match(path);
        return (
          <Link key={t.href} href={t.href} role="tab" aria-selected={active}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm ${active ? 'border-accent font-medium text-text' : 'border-transparent text-muted hover:text-text'}`}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
