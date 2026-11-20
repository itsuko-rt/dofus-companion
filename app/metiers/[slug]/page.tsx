import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Breadcrumbs from '../../../components/Breadcrumbs';
import JobGuide from '../../../components/professions/JobGuide';
import { KIND_LABEL } from '../../../components/professions/jobIcons';
import { PageHero } from '../../../components/ui';
import { latestDb } from '../../../src/load.ts';
import { pageMeta } from '../../../src/seo.ts';
import { loadJob, loadJobs } from '../../../src/world.ts';

export const dynamicParams = false;
export function generateStaticParams() {
  const db = latestDb();
  return (db ? loadJobs(db) ?? [] : []).map((j) => ({ slug: j.slug }));
}
const find = (slug: string) => { const db = latestDb(); return db ? loadJob(db, slug) : null; };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = find((await params).slug);
  if (!d) return {};
  const first = d.tiers.slice(0, 3).map((t) => `${t.name} (niv. ${t.levelMin})`).join(', ');
  return pageMeta({
    title: `${d.job.name} : guide du métier`, path: `/metiers/${d.job.slug}`,
    description: d.tiers.length
      ? `Monter ${d.job.name} dans DOFUS : ${d.tiers.length} ressources de ${first}… jusqu’au niveau 200, les zones de récolte sur la carte et ${d.recipes.length} recettes.`
      : `${d.job.name} dans DOFUS : ${d.recipes.length} recettes avec le niveau requis et l’origine de chaque ingrédient (récolte, fabrication ou butin).`,
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const d = find((await params).slug);
  if (!d) notFound();
  return (
    <div className="h-full overflow-y-auto">
      <PageHero color="#5b6236" kicker={`Métier · ${KIND_LABEL[d.job.kind]}`} title={d.job.name} />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Breadcrumbs trail={[['Accueil', '/'], ['Métiers', '/metiers'], [d.job.name, `/metiers/${d.job.slug}`]]} />
        {/* the first recipes are in the HTML; the rest (up to 700+) is fetched by the page, not inlined */}
        <div className="mt-4"><JobGuide details={{ ...d, recipes: d.recipes.slice(0, 40) }} recipeTotal={d.recipes.length} /></div>
      </div>
    </div>
  );
}
