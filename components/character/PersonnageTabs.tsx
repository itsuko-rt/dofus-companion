'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, UserRound } from 'lucide-react';

const TABS = [
  { href: '/personnage', label: 'Profil', icon: UserRound, match: (p: string) => p === '/personnage' },
  { href: '/personnage/sorts', label: 'Classes et sorts', icon: BookOpen, match: (p: string) => p.startsWith('/personnage/sorts') },
];

export default function PersonnageTabs() {
  const path = usePathname();
  return (
    <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-black/40 bg-surface px-3" role="tablist" aria-label="Personnage">
      {TABS.map((t) => {
        const active = t.match(path);
        const Icon = t.icon;
        return (
          <Link key={t.href} href={t.href} role="tab" aria-selected={active}
            className={`relative inline-flex items-center gap-1.5 px-3 py-2.5 font-display text-[12.5px] uppercase tracking-wide ${active ? 'text-white' : 'text-muted hover:text-text'}`}>
            <Icon size={14} aria-hidden /> {t.label}
            {active && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t bg-sec-characters" />}
          </Link>
        );
      })}
    </div>
  );
}
