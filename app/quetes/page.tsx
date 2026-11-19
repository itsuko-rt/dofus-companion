import type { Metadata } from 'next';
import QuestMap from '../../components/QuestMap';

export const metadata: Metadata = { title: 'Carte des quêtes · Dofus Companion' };

export default function Page() {
  return <QuestMap />;
}
