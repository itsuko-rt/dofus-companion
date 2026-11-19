import type { Metadata } from 'next';
import { pageMeta } from '../../../src/seo.ts';
import QuestTracker from '../../../components/quests/QuestTracker';

export const metadata: Metadata = pageMeta({ title: 'Suivi des quêtes', description: 'Carte interactive des quêtes DOFUS par région : prérequis, chaînes, statut de chaque quête et tutoriels.', path: '/progression/quetes' });

export default function Page() {
  return <QuestTracker />;
}
