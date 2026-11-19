import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen, Egg, ExternalLink, Map as MapIcon } from 'lucide-react';
import AdSlot from '../../../../components/AdSlot';
import Breadcrumbs from '../../../../components/Breadcrumbs';
import { ButtonLink, PageHero } from '../../../../components/ui';
import { guideContext, regionQuests, regions } from '../../../../src/guides-data.ts';
import { pageMeta } from '../../../../src/seo.ts';

export const dynamicParams = false;
export function generateStaticParams() {
  const c = guideContext();
  return c ? regions(c).map((r) => ({ region: r.slug })) : [];
}
const find = (slug: string) => { const c = guideContext(); return c ? regions(c).find((r) => r.slug === slug) : undefined; };
const levels = (a: number, b: number) => (a === b ? `niveau ${a}` : `niveaux ${a} à ${b}`);

export async function generateMetadata({ params }: { params: Promise<{ region: string }> }): Promise<Metadata> {
  const r = find((await params).region);
  if (!r) return {};
  return pageMeta({
    title: `Quêtes ${r.name} : ordre et prérequis`, path: `/guides/quetes/${r.slug}`,
    description: `Les ${r.quests} quêtes de ${r.name} dans DOFUS (${levels(r.levelMin, r.levelMax)}) dans un ordre jouable, avec les prérequis de chacune${r.dofus.length ? ` et le ${r.dofus.join(', ')}` : ''}.`,
  });
}

export default async function Page({ params }: { params: Promise<{ region: string }> }) {
  const r = find((await params).region);
  const c = guideContext();
  if (!r || !c) notFound();
  const qs = regionQuests(c, r.id);
  const withGuide = qs.filter((q) => q.guide).length;
  const chains = `${r.chains} chaîne${r.chains > 1 ? 's' : ''}`;
  return (
    <div className="h-full overflow-y-auto">
      <PageHero color="var(--color-sec-quests)" kicker={`${r.groupLabel} · ${levels(r.levelMin, r.levelMax)}`} title={`Quêtes : ${r.name}`}>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-white/80">{r.quests} quêtes · {chains} · données du jeu {c.version}</p>
          <ButtonLink href={`/progression/quetes/${r.slug}`} variant="primary"><MapIcon size={15} /> Ouvrir la carte interactive</ButtonLink>
        </div>
      </PageHero>
      <article className="mx-auto max-w-4xl px-4 py-6">
        <Breadcrumbs trail={[['Accueil', '/'], ['Guides', '/guides'], ['Quêtes', '/guides/quetes'], [r.name, `/guides/quetes/${r.slug}`]]} />
        <section className="mt-5 text-sm leading-relaxed text-muted">
          <h2 className="mb-1 font-display text-base text-text">En bref</h2>
          <p>
            {r.name} compte <b className="text-text">{r.quests} quêtes</b> ({levels(r.levelMin, r.levelMax)}) : {chains} de quêtes liées
            {r.standalone ? ` et ${r.standalone} quête${r.standalone > 1 ? 's' : ''} indépendante${r.standalone > 1 ? 's' : ''}` : ''}.
            {r.dofus.length ? <> Certaines donnent <b className="text-text">{r.dofus.join(', ')}</b>.</> : null}
            {' '}La liste suit un ordre jouable : chaque quête apparaît après celles qu’elle demande dans cette région.
            {' '}{withGuide} sur {qs.length} ont un tutoriel détaillé sur Dofus Pour Les Noobs.
          </p>
        </section>
        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_GUIDES} />
        <section className="mt-6">
          <h2 className="mb-2 font-display text-lg">Les quêtes dans l’ordre</h2>
          <ol className="flex flex-col gap-1.5">
            {qs.map((q, i) => (
              <li key={q.id} id={`quete-${q.id}`} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="w-7 shrink-0 text-right tabular-nums text-faint">{i + 1}.</span>
                  <h3 className="font-medium text-text">{q.name}</h3>
                  {q.level ? <span className="text-xs text-muted">niv. {q.level}</span> : null}
                  {q.dofus && <span className="inline-flex items-center gap-0.5 text-xs text-accent"><Egg size={12} /> donne un Dofus</span>}
                  <span className="ml-auto flex gap-3 text-xs">
                    <Link href={`/progression/quetes/${r.slug}#quest:${q.id}`} className="text-brand hover:underline">Sur la carte</Link>
                    {q.guide && <a href={q.guide} className="inline-flex items-center gap-0.5 text-brand hover:underline" rel="noopener"><BookOpen size={12} /> Tutoriel <ExternalLink size={10} /></a>}
                  </span>
                </div>
                {q.requires.length > 0 && <p className="ml-9 mt-0.5 text-xs text-muted">Demande : {q.requires.map((x) => x.name).join(', ')}</p>}
              </li>
            ))}
          </ol>
        </section>
      </article>
    </div>
  );
}
