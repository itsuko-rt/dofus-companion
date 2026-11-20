import type { Metadata } from 'next';
import { pageMeta } from '../../../src/seo.ts';
import LevelView from '../../../components/progression/LevelView';

export const metadata: Metadata = pageMeta({ title: 'Que faire à mon niveau', description: 'Suggestions officielles du jeu, zones et monstres de votre niveau avec leur XP de base et leur butin, et donjons, d’après les fichiers de DOFUS.', path: '/progression/niveau' });
export default function Page() {
  return <LevelView />;
}
