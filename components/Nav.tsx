'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Home, Map as MapIcon, Pickaxe, Shirt, Swords, UserRound, CircleUser } from 'lucide-react';
import { BRAND } from '../src/brand.ts';
import { SUPPORTED_BREEDS } from './breeds';
import { useCharacter } from './useCharacter';
import { useSession } from './account/useSession';
import { useEffect } from 'react';
import { warmGame } from './quests/useGame';

// Quests, achievements and Dofus live under "Progression" (sub-tabs) to keep the bar short.
const LINKS = [
  { href: '/', label: 'Accueil', icon: Home, match: (p: string) => p === '/' },
  { href: '/progression/quetes', label: 'Progression', icon: Compass, match: (p: string) => p.startsWith('/progression') },
  { href: '/carte', label: 'Cartes', icon: MapIcon, match: (p: string) => p.startsWith('/carte') },
  { href: '/metiers', label: 'Métiers', icon: Pickaxe, match: (p: string) => p.startsWith('/metiers') },
  { href: '/builds', label: 'Builds', icon: Swords, match: (p: string) => p.startsWith('/builds') },
  { href: '/equipement', label: 'Équipement', icon: Shirt, match: (p: string) => p.startsWith('/equipement') },
  { href: '/personnage', label: 'Personnages', icon: UserRound, match: (p: string) => p.startsWith('/personnage') },
];

// Once a page is loaded and the browser is idle, fetch and build the quest graph and load the graph view's code
// (~130 KB of data and the flow-graph chunk, both compressed): the first visit to Quêtes was mostly spent there.
// Skipped with data saver on, and on the pages that load them anyway.
function useWarmQuests(path: string) {
  useEffect(() => {
    if (path.startsWith('/progression/quetes') || path.startsWith('/progression/succes')) return;
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
    const run = () => { warmGame(); void import('./FlowCanvas'); };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const id = w.requestIdleCallback ? w.requestIdleCallback(run, { timeout: 5000 }) : window.setTimeout(run, 2500);
    return () => { if (!w.requestIdleCallback) window.clearTimeout(id); };
  }, [path]);
}

export default function Nav() {
  const path = usePathname();
  useWarmQuests(path);
  const ch = useCharacter();
  const session = useSession();
  const breed = SUPPORTED_BREEDS.find((b) => b.id === ch.character.profile.breed)?.name;
  const breedInfo = SUPPORTED_BREEDS.find((b) => b.id === ch.character.profile.breed);
  const link = (active: boolean) =>
    `relative inline-flex h-full items-center gap-1.5 px-2.5 font-display text-[13px] uppercase tracking-wide transition ${active
      ? 'text-white after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:bg-cta-hi'
      : 'text-muted hover:text-white'}`;
  return (
    <nav className="flex h-14 shrink-0 items-center gap-1 overflow-x-auto border-b border-line bg-[#1b1611] px-3" aria-label="Navigation principale">
      <Link href="/" className="mr-3 flex h-full shrink-0 items-center gap-2" aria-label={BRAND.name}>
        <img src="/favicon-96x96.png" alt="" width={30} height={30} />
        <span className="hidden font-display text-[15px] uppercase tracking-wide text-[#ffe2a6] lg:inline">{BRAND.name}</span>
      </Link>
      {LINKS.map((l) => {
        const Icon = l.icon;
        const active = l.match(path);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? 'page' : undefined} aria-label={l.label} className={link(active)}>
            <Icon size={15} aria-hidden /> <span className="hidden xl:inline">{l.label}</span>
          </Link>
        );
      })}
      <div className="ml-auto flex h-full shrink-0 items-center gap-2">
        {ch.hasCharacter && (
          <Link href="/personnage" className="hidden items-center gap-2 rounded-md border border-line bg-surface py-0.5 pl-0.5 pr-3 text-xs hover:border-faint sm:flex">
            <span className="h-8 w-8 overflow-hidden rounded border border-black/40" style={{ background: breedInfo?.hue ?? 'var(--color-surface-2)' }}>
              {breedInfo && <img src={breedInfo.art.portrait} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
            </span>
            <span className="leading-tight">
              <span className="block font-medium text-text">{ch.character.name}</span>
              <span className="text-muted">{breed ? `${breed} · ` : ''}niv. {ch.character.level}</span>
            </span>
          </Link>
        )}
        <Link href="/compte" aria-current={path.startsWith('/compte') ? 'page' : undefined} aria-label="Mon compte" className={link(path.startsWith('/compte'))}>
          <CircleUser size={16} aria-hidden /> <span className="hidden md:inline">{session.user ? session.user.email.split('@')[0] : 'Compte'}</span>
        </Link>
      </div>
    </nav>
  );
}
