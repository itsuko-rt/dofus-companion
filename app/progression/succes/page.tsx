import type { Metadata } from 'next';
import { latestDb, loadAchievementCategories } from '../../../src/load.ts';
import AchievementsView from '../../../components/progression/AchievementsView';

export const metadata: Metadata = { title: 'Succès' };
export default function Page() {
  const db = latestDb();
  return <AchievementsView categories={db ? loadAchievementCategories(db) : []} />;
}
