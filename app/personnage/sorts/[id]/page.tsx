import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { pageMeta } from '../../../../src/seo.ts';
import { latestDb, loadClass } from '../../../../src/load.ts';
import { SUPPORTED_BREEDS } from '../../../../components/breeds';
import SpellGuide from '../../../../components/SpellGuide';

// Built once per supported class, under a readable slug (/personnage/sorts/cra); /personnage/sorts/9 redirects.
export const dynamicParams = false;
export function generateStaticParams() {
  return SUPPORTED_BREEDS.flatMap((b) => [{ id: b.slug }, { id: String(b.id) }]);
}
const find = (param: string) => SUPPORTED_BREEDS.find((b) => b.slug === param || String(b.id) === param);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const b = find((await params).id);
  if (!b) return {};
  return pageMeta({
    title: `Sorts du ${b.name} (${b.title})`, path: `/personnage/sorts/${b.slug}`,
    description: `Les sorts du ${b.name} dans DOFUS : niveau d'obtention, coût en PA, portée et effets de chaque variante, lus dans les fichiers du jeu. Rôles : ${b.roles.join(', ')}.`,
  });
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = find(id);
  if (b && id !== b.slug) permanentRedirect(`/personnage/sorts/${b.slug}`);
  const db = latestDb();
  const data = db && b ? loadClass(db, b.id) : null;
  if (!data) notFound();
  return <SpellGuide data={data} />;
}
