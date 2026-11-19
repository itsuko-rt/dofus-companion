import type { Metadata } from 'next';
import { pageMeta } from '../../../src/seo.ts';
import { latestDb, loadAchievementCategories } from '../../../src/load.ts';
import AchievementsView from '../../../components/progression/AchievementsView';

export const metadata: Metadata = pageMeta({ title: 'Suivi des succès', description: 'Les 2 777 succès de DOFUS par catégorie, avec leurs objectifs, récompenses et votre progression.', path: '/progression/succes' });
export default function Page() {
  const db = latestDb();
  return <AchievementsView categories={db ? loadAchievementCategories(db) : []} />;
}
