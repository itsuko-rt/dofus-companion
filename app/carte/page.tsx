import type { Metadata } from 'next';
import { pageMeta } from '../../src/seo.ts';
import { Suspense } from 'react';
import WorldMap from '../../components/world/WorldMap';

export const metadata: Metadata = pageMeta({
  title: 'Carte du monde',
  description: 'Carte interactive du Monde des Douze : zones, niveaux, zaaps, donjons, ateliers, ressources de chaque métier et monstres, d’après les données officielles du jeu.',
  path: '/carte',
});
// useSearchParams (deep links) needs a Suspense boundary on a statically rendered page
export default function Page() {
  return (
    <>
      {/* server-rendered heading: the map itself waits for the URL parameters */}
      <h1 className="sr-only">Carte du monde de DOFUS</h1>
      <Suspense fallback={<p className="p-8 text-sm text-muted">Chargement de la carte…</p>}><WorldMap /></Suspense>
    </>
  );
}
