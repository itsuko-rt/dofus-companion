'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/quetes', label: 'Carte des quêtes' },
  { href: '/classes', label: 'Classes & sorts' },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="flex h-10 shrink-0 items-center gap-1 border-b border-zinc-800 bg-zinc-950 px-3 text-sm">
      <Link href="/" className="mr-3 font-semibold tracking-tight text-zinc-100">Dofus Companion</Link>
      {LINKS.map((l) => {
        const active = path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? 'page' : undefined}
            className={`rounded px-2.5 py-1 ${active ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
