'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Home, UserRound } from 'lucide-react';
import { SUPPORTED_BREEDS } from './breeds';
import { useCharacter } from './useCharacter';

// Équipement joins once item data is browsable (docs/AUDIT_UX.md §3.1): no links to empty pages.
const LINKS = [
  { href: '/', label: 'Accueil', icon: Home, match: (p: string) => p === '/' },
  { href: '/progression/quetes', label: 'Progression', icon: Compass, match: (p: string) => p.startsWith('/progression') },
  { href: '/personnage', label: 'Personnage', icon: UserRound, match: (p: string) => p.startsWith('/personnage') },
];

export default function Nav() {
  const path = usePathname();
  const ch = useCharacter();
  const breed = SUPPORTED_BREEDS.find((b) => b.id === ch.character.profile.breed)?.name;
  return (
    <nav className="flex h-12 shrink-0 items-center gap-1 border-b border-line bg-bg/95 px-3 text-sm" aria-label="Navigation principale">
      <Link href="/" className="mr-4 flex items-center gap-2 font-display text-[15px] font-semibold tracking-tight text-text">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[12px] font-bold text-accent-ink" aria-hidden>12</span>
        <span className="hidden sm:inline">Atlas des Douze</span>
      </Link>
      {LINKS.map((l) => {
        const active = l.match(path);
        const Icon = l.icon;
        return (
          <Link key={l.href} href={l.href} aria-current={active ? 'page' : undefined} aria-label={l.label}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${active ? 'bg-surface-2 text-text' : 'text-muted hover:bg-surface hover:text-text'}`}>
            <Icon size={15} aria-hidden /> <span className="hidden sm:inline">{l.label}</span>
          </Link>
        );
      })}
      {ch.hasCharacter && (
        <Link href="/personnage" className="ml-auto flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs hover:border-faint">
          <span className="font-medium text-text">{ch.character.name}</span>
          <span className="text-muted">{breed ? `${breed} · ` : ''}niv. {ch.character.level}</span>
        </Link>
      )}
    </nav>
  );
}
