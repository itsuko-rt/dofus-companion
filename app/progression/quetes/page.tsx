import type { Metadata } from 'next';
import QuestTracker from '../../../components/quests/QuestTracker';

export const metadata: Metadata = { title: 'Quêtes' };

export default function Page() {
  return <QuestTracker />;
}
