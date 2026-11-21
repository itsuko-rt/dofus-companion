import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Castle, Map as MapIcon, MapPin } from 'lucide-react';
import Breadcrumbs from '../../components/Breadcrumbs';
import EncyclopediaSearch from '../../components/encyclopedia/EncyclopediaSearch';
import { latestDb } from '../../src/load.ts';
import { loadBrowse } from '../../src/encyclopedia.ts';
import { pageMeta } from '../../src/seo.ts';

export const metadata: Metadata = pageMeta({
  title: 'Encyclopédie DOFUS : monstres, objets, donjons et zones', path: '/encyclopedie',
  description: 'Toutes les fiches de DOFUS 3 reliées entre elles : monstres et leurs butins, objets, recettes et usages, donjons et leurs boss, zones et leurs ressources.',
});

const BANDS: [number, number][] = [[1, 50], [51, 100], [101, 150], [151, 200]];
const fmt = (n: number) => n.toLocaleString('fr-FR');

export default function Page() {
  const db = latestDb();
  const b = db ? loadBrowse(db) : null;
  return (
    <div className="h-full overflow-y-auto">
      <header className="relative isolate overflow-hidden border-b border-accent/25 bg-surface">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_srgb,var(--color-sec-achievements)_35%,transparent),transparent_65%)]" />
        <div className="mx-auto max-w-6xl px-4 pb-6 pt-3">
          <Breadcrumbs trail={[['Accueil', '/'], ['Encyclopédie', '/encyclopedie']]} />
          <div className="mt-3 flex items-center gap-3">
            <BookOpen size={26} className="text-accent" aria-hidden />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#e9c784]">Monde des Douze</p>
              <h1 className="title-hero text-2xl text-white sm:text-[1.75rem]">Encyclopédie</h1>
            </div>
          </div>
          {b && <p className="mt-2 max-w-2xl text-sm text-muted">{fmt(b.counts.monsters)} monstres, {fmt(b.counts.items)} objets, {fmt(b.counts.dungeons)} donjons, {fmt(b.counts.zones)} zones et {fmt(b.counts.sets)} panoplies, reliés entre eux : d’un monstre à ses butins, d’un objet à sa recette, d’un donjon à ses succès.</p>}
          <div className="mt-4 max-w-2xl"><EncyclopediaSearch autoFocus /></div>
        </div>
      </header>
      {!b ? <p className="p-8 text-sm text-muted">Base de jeu absente : lancez l’import.</p> : (
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-2">
          <section>
            <h2 className="mb-2 flex items-center gap-2 font-display text-lg"><Castle size={17} className="text-accent" aria-hidden /> Donjons par niveau</h2>
            <div className="flex flex-col gap-3">
              {BANDS.map(([lo, hi]) => {
                const list = b.dungeons.filter((d) => (d.level ?? 0) >= lo && (d.level ?? 0) <= hi);
                return list.length > 0 && (
                  <details key={lo} className="group overflow-hidden rounded-xl border border-line/80 bg-surface/60" open={lo === 1}>
                    <summary className="flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-surface-2/50">Niveaux {lo} à {hi}<span className="text-xs text-faint">{list.length}</span></summary>
                    <ul className="grid border-t border-line/60 sm:grid-cols-2">
                      {list.map((d) => <li key={d.id}><Link href={d.href} className="flex justify-between gap-2 px-4 py-1.5 text-sm hover:bg-surface-2/60"><span className="truncate">{d.name}</span><span className="shrink-0 text-xs tabular-nums text-faint">{d.level}</span></Link></li>)}
                    </ul>
                  </details>
                );
              })}
            </div>
          </section>
          <section>
            <h2 className="mb-2 flex items-center gap-2 font-display text-lg"><MapPin size={17} className="text-accent" aria-hidden /> Zones par région</h2>
            <div className="flex flex-col gap-2">
              {b.areas.map(([area, zones]) => (
                <details key={area} className="overflow-hidden rounded-xl border border-line/80 bg-surface/60">
                  <summary className="flex cursor-pointer items-center justify-between px-4 py-2 text-sm hover:bg-surface-2/50">{area}<span className="text-xs text-faint">{zones.length}</span></summary>
                  <ul className="grid border-t border-line/60 sm:grid-cols-2">
                    {zones.map((z) => <li key={z.id}><Link href={z.href} className="flex justify-between gap-2 px-4 py-1.5 text-sm hover:bg-surface-2/60"><span className="truncate">{z.name}</span>{z.level ? <span className="shrink-0 text-xs tabular-nums text-faint">{z.level}</span> : null}</Link></li>)}
                  </ul>
                </details>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-muted"><MapIcon size={15} aria-hidden /> Cartes interactives : <Link href="/carte" className="text-accent underline-offset-2 hover:underline">DofusDB et Dofus Maps</Link></p>
          </section>
        </div>
      )}
    </div>
  );
}
