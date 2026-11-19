import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { latestDb, loadClass } from '../../../../src/load.ts';
import { SUPPORTED_BREEDS } from '../../../../components/breeds';
import SpellGuide from '../../../../components/SpellGuide';

// Built once per supported class from the imported game DB.
export const dynamicParams = false;
export function generateStaticParams() {
  return SUPPORTED_BREEDS.map((b) => ({ id: String(b.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `${SUPPORTED_BREEDS.find((b) => String(b.id) === id)?.name ?? 'Classe'}` };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = latestDb();
  const data = db ? loadClass(db, Number(id)) : null;
  if (!data) notFound();
  return <SpellGuide data={data} />;
}
