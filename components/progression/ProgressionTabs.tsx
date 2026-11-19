'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Egg, ScanLine, Trophy } from 'lucide-react';

// Each tab carries its section colour (globals.css --color-sec-*).
const TABS = [
  { href: '/progression/quetes', label: 'Quêtes', icon: Compass, color: 'var(--color-sec-quests)' },
  { href: '/progression/succes', label: 'Succès', icon: Trophy, color: 'var(--color-sec-achievements)' },
  { href: '/progression/dofus', label: 'Dofus', icon: Egg, color: 'var(--color-accent)' },
  { href: '/progression/scan', label: 'Scanner', icon: ScanLine, color: 'var(--color-sec-scan)' },
];

export default function ProgressionTabs() {
  const path = usePathname();
  return (
    <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-black/40 bg-surface px-3" role="tablist" aria-label="Progression">
      {TABS.map((t) => {
        const active = path.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link key={t.href} href={t.href} role="tab" aria-selected={active}
            className={`relative inline-flex items-center gap-1.5 px-3 py-2.5 font-display text-[12.5px] uppercase tracking-wide ${active ? 'text-white' : 'text-muted hover:text-text'}`}>
            <Icon size={14} style={{ color: active ? t.color : undefined }} aria-hidden /> {t.label}
            {active && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t" style={{ background: t.color }} />}
          </Link>
        );
      })}
    </div>
  );
}
