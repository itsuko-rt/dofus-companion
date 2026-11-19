import type { Metadata } from 'next';
import WorldView from '../../../components/quests/WorldView';

export const metadata: Metadata = { title: 'Quêtes · Atlas des Douze' };

export default function Page() {
  return <WorldView />;
}
