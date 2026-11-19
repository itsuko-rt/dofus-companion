'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Home, Shirt, Swords, UserRound, CircleUser } from 'lucide-react';
import { BRAND } from '../src/brand.ts';
import { SUPPORTED_BREEDS } from './breeds';
import { useCharacter } from './useCharacter';
import { useSession } from './account/useSession';

// Quests, achievements and Dofus live under "Progression" (sub-tabs) to keep the bar short.
const LINKS = [
  { href: '/', label: 'Accueil', icon: Home, match: (p: string) => p === '/' },
  { href: '/progression/quetes', label: 'Progression', icon: Compass, match: (p: string) => p.startsWith('/progression') },
  { href: '/builds', label: 'Builds', icon: Swords, match: (p: string) => p.startsWith('/builds') },
  { href: '/equipement', label: 'Équipement', icon: Shirt, match: (p: string) => p.startsWith('/equipement') },
  { href: '/personnage', label: 'Personnages', icon: UserRound, match: (p: string) => p.startsWith('/personnage') },
];

export default function Nav() {
  const path = usePathname();
  const ch = useCharacter();
  const session = useSession();
  const breed = SUPPORTED_BREEDS.find((b) => b.id === ch.character.profile.breed)?.name;
  const link = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${active ? 'bg-surface-2 text-text' : 'text-muted hover:bg-surface hover:text-text'}`;
  return (
    <nav className="flex h-12 shrink-0 items-center gap-1 overflow-x-auto border-b border-line bg-bg/95 px-3 text-sm" aria-label="Navigation principale">
      <Link href="/" className="mr-3 flex shrink-0 items-center gap-2 font-display text-[15px] font-semibold tracking-tight text-text" aria-label={BRAND.name}>
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[12px] font-bold text-accent-ink" aria-hidden>{BRAND.mark}</span>
        <span className="hidden lg:inline">{BRAND.name}</span>
      </Link>
      {LINKS.map((l) => {
        const Icon = l.icon;
        const active = l.match(path);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? 'page' : undefined} aria-label={l.label} className={link(active)}>
            <Icon size={15} aria-hidden /> <span className="hidden md:inline">{l.label}</span>
          </Link>
        );
      })}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {ch.hasCharacter && (
          <Link href="/personnage" className="hidden items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs hover:border-faint sm:flex">
            <span className="font-medium text-text">{ch.character.name}</span>
            <span className="text-muted">{breed ? `${breed} · ` : ''}niv. {ch.character.level}</span>
          </Link>
        )}
        <Link href="/compte" aria-current={path.startsWith('/compte') ? 'page' : undefined} aria-label="Mon compte" className={link(path.startsWith('/compte'))}>
          <CircleUser size={16} aria-hidden /> <span className="hidden md:inline">{session.user ? session.user.email.split('@')[0] : 'Compte'}</span>
        </Link>
      </div>
    </nav>
  );
}
