import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumbs from '../../../../components/Breadcrumbs';
import { PageHero } from '../../../../components/ui';
import { dofusChain, dofusSlugs, guideContext, regions } from '../../../../src/guides-data.ts';
import { pageMeta } from '../../../../src/seo.ts';

export const dynamicParams = false;
export function generateStaticParams() {
  const c = guideContext();
  return c ? [...dofusSlugs(c.dofus).values()].map((slug) => ({ slug })) : [];
}
function find(slug: string) {
  const c = guideContext();
  if (!c) return null;
  const slugs = dofusSlugs(c.dofus);
  const d = c.dofus.find((x) => slugs.get(x.itemId) === slug);
  return d ? { c, d, slug } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const f = find((await params).slug);
  if (!f) return {};
  const src = [...f.d.quests.map((q) => `la quête « ${q.name} »`), ...f.d.achievements.map((a) => `le succès « ${a.name} »`)].join(' ou ');
  return pageMeta({
    title: `${f.d.name} : comment l’obtenir`, path: `/guides/dofus/${f.slug}`,
    description: `${f.d.name} (niveau ${f.d.level}) dans DOFUS : ${src ? `obtenu en terminant ${src}` : 'ni quête ni succès ne le donne'}. Liste complète des étapes à faire avant.`,
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const f = find((await params).slug);
  if (!f) notFound();
  const { c, d, slug } = f;
  const chains = dofusChain(c, d);
  const regionSlug = new Map(regions(c).map((r) => [r.name, r.slug]));
  const icon = d.iconId != null ? `/ankama/items/${d.iconId}.png` : null;
  return (
    <div className="h-full overflow-y-auto">
      <PageHero color="#7a4a12" kicker={`Dofus · niveau ${d.level}`} title={d.name}>
        {icon && <img src={icon} alt={`Icône du ${d.name}`} width={64} height={64} />}
      </PageHero>
      <article className="mx-auto max-w-4xl px-4 py-6">
        <Breadcrumbs trail={[['Accueil', '/'], ['Guides', '/guides'], ['Dofus', '/guides/dofus'], [d.name, `/guides/dofus/${slug}`]]} />
        {chains.length === 0 ? (
          <p className="mt-5 text-sm text-muted">Aucune quête ni aucun succès ne donne le {d.name} dans les données du jeu : il s’obtient en butin, par échange ou lors d’un évènement.</p>
        ) : chains.map((ch) => {
          const src = c.graph.nodes.get(ch.source);
          const prior = ch.steps.length - 1;
          return (
            <section key={ch.source} className="mt-6">
              <h2 className="font-display text-lg">Par {ch.source.startsWith('ach:') ? 'le succès' : 'la quête'} « {src?.label} »</h2>
              <p className="mt-1 text-sm text-muted">
                {prior === 0 ? 'Aucune autre quête ni succès n’est demandé avant.'
                  : `${prior} quête${prior > 1 ? 's' : ''} ou succès à terminer avant, du plus bas niveau au plus haut (une seule option retenue quand le jeu laisse le choix).`}
              </p>
              <ol className="mt-3 flex flex-col gap-1 text-sm">
                {ch.steps.map((s, i) => {
                  const rs = s.category ? regionSlug.get(s.category) : undefined;
                  const href = s.id.startsWith('quest:') && rs ? `/guides/quetes/${rs}#quete-${s.id.slice(6)}` : null;
                  return (
                    <li key={s.id} className={`flex flex-wrap items-baseline gap-x-2 rounded-md px-2 py-1 ${s.id === ch.source ? 'border border-accent/60 bg-accent/10' : 'bg-surface'}`}>
                      <span className="w-7 text-right tabular-nums text-faint">{i + 1}.</span>
                      {href ? <Link href={href} className="font-medium hover:underline">{s.name}</Link> : <span className="font-medium">{s.name}</span>}
                      <span className="text-xs text-muted">{[s.category, s.level ? `niv. ${s.level}` : null].filter(Boolean).join(' · ')}</span>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
        <p className="mt-8 text-xs text-faint">Source : récompenses et conditions des quêtes et succès dans les fichiers du jeu ({c.version}).</p>
      </article>
    </div>
  );
}
