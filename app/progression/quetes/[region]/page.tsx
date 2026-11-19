import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { latestDb, loadGraphData } from '../../../../src/load.ts';
import { regionSlugMap } from '../../../../src/regions.ts';
import { pageMeta } from '../../../../src/seo.ts';
import QuestTracker from '../../../../components/quests/QuestTracker';

// One static page per quest category (≈ region), under a readable slug (/progression/quetes/incarnam).
// The former numeric URLs (/progression/quetes/19) are kept and answer with a permanent redirect.
export const dynamicParams = false;
const categories = () => { const db = latestDb(); return db ? loadGraphData(db).categories : []; };
const resolve = (param: string) => {
  const cats = categories();
  const slugs = regionSlugMap(cats);
  const cat = cats.find((c) => slugs.get(c.id) === param) ?? cats.find((c) => String(c.id) === param);
  return cat ? { cat, slug: slugs.get(cat.id)! } : null;
};

export function generateStaticParams() {
  const cats = categories();
  const slugs = regionSlugMap(cats);
  return cats.flatMap((c) => [{ region: slugs.get(c.id)! }, { region: String(c.id) }]);
}

export async function generateMetadata({ params }: { params: Promise<{ region: string }> }): Promise<Metadata> {
  const r = resolve((await params).region);
  if (!r) return {};
  return pageMeta({
    title: `${r.cat.name} : carte des quêtes`, path: `/progression/quetes/${r.slug}`,
    description: `Carte interactive des quêtes de ${r.cat.name} dans DOFUS : chaînes, prérequis, statut de chaque quête pour votre personnage.`,
  });
}

export default async function Page({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const r = resolve(region);
  if (r && region !== r.slug) permanentRedirect(`/progression/quetes/${r.slug}`);
  return <QuestTracker region={r?.cat.id} />;
}
