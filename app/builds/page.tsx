import type { Metadata } from 'next';
import { pageMeta } from '../../src/seo.ts';
import BuildsView from '../../components/builds/BuildsView';

export const metadata: Metadata = pageMeta({ title: 'Builds de la communauté', description: 'Builds DOFUS complets pour Crâ et Pandawa, classés pour votre niveau et votre élément, avec stats recalculées depuis les données officielles du jeu.', path: '/builds' });

export default function Page() {
  return <BuildsView />;
}
