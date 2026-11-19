import type { Metadata } from 'next';
import { latestDb, loadGraphData } from '../../../../src/load.ts';
import QuestTracker from '../../../../components/quests/QuestTracker';

// One static page per quest category (≈ region), built from the imported game DB.
export const dynamicParams = false;
const categories = () => { const db = latestDb(); return db ? loadGraphData(db).categories : []; };

export function generateStaticParams() {
  return categories().map((c) => ({ region: String(c.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ region: string }> }): Promise<Metadata> {
  const { region } = await params;
  return { title: `${categories().find((c) => String(c.id) === region)?.name ?? 'Région'} · Quêtes` };
}

export default async function Page({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  return <QuestTracker region={Number(region)} />;
}
