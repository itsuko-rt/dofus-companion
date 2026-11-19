import type { Metadata } from 'next';
import { pageMeta } from '../../../src/seo.ts';
import { latestDb, loadDofus } from '../../../src/load.ts';
import DofusView from '../../../components/progression/DofusView';

export const metadata: Metadata = pageMeta({ title: 'Les 34 Dofus', description: "Liste des 34 Dofus de DOFUS avec leur niveau et la quête ou le succès qui les donne, d'après les fichiers du jeu.", path: '/progression/dofus' });
export default function Page() {
  const db = latestDb();
  return <DofusView dofus={db ? loadDofus(db) : []} />;
}
