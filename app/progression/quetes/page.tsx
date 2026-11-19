import type { Metadata } from 'next';
import WorldView from '../../../components/quests/WorldView';

export const metadata: Metadata = { title: 'Quêtes' };

export default function Page() {
  return <WorldView />;
}
