import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '../../../components/Breadcrumbs';
import { Card, PageHero } from '../../../components/ui';
import { guideContext, regions } from '../../../src/guides-data.ts';
import { REGION_GROUPS } from '../../../src/regions.ts';
import { pageMeta } from '../../../src/seo.ts';

export const metadata: Metadata = pageMeta({
  title: 'Guide des quêtes DOFUS par région', path: '/guides/quetes',
  description: 'Toutes les régions de quêtes de DOFUS classées par niveau : nombre de quêtes, chaînes, Dofus à la clé, et l’ordre de chaque quête avec ses prérequis.',
});

export default function Page() {
  const c = guideContext();
  const rs = c ? regions(c) : [];
  const total = rs.reduce((s, r) => s + r.quests, 0);
  return (
    <div className="h-full overflow-y-auto">
      <PageHero color="var(--color-sec-quests)" kicker="Guide" title="Les quêtes de DOFUS, région par région">
        <p className="max-w-2xl text-sm text-white/80">{total} quêtes réparties en {rs.length} catégories, d’après les données du jeu {c?.version ?? ''}.</p>
      </PageHero>
      <article className="mx-auto max-w-6xl px-4 py-6">
        <Breadcrumbs trail={[['Accueil', '/'], ['Guides', '/guides'], ['Quêtes', '/guides/quetes']]} />
        <section className="mt-5 max-w-3xl text-sm leading-relaxed text-muted">
          <h2 className="mb-1 font-display text-base text-text">Comment lire ce guide</h2>
          <p>
            Une quête ne devient disponible que lorsque ses conditions sont remplies : terminer d’autres quêtes, atteindre un niveau,
            parfois un alignement ou un abonnement. Ces conditions forment des <b className="text-text">chaînes</b> : suivre une région
            dans l’ordre évite de buter sur une quête verrouillée. Les régions ci-dessous sont classées par niveau ; chaque page donne
            la liste des quêtes dans un ordre jouable.
          </p>
        </section>
        {REGION_GROUPS.map((g) => {
          const list = rs.filter((r) => r.group === g.id);
          if (!list.length) return null;
          return (
            <section key={g.id} className="mt-7">
              <h2 className="mb-3 font-display text-lg">{g.label}</h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((r) => (
                  <li key={r.id}>
                    <Card className="h-full">
                      <h3 className="font-display"><Link href={`/guides/quetes/${r.slug}`} className="hover:underline">{r.name}</Link></h3>
                      <p className="mt-1 text-xs text-muted">
                        {r.quests} quêtes · niveau {r.levelMin === r.levelMax ? r.levelMin : `${r.levelMin} à ${r.levelMax}`} · {r.chains} chaîne{r.chains > 1 ? 's' : ''}
                        {r.standalone ? ` · ${r.standalone} indépendante${r.standalone > 1 ? 's' : ''}` : ''}
                      </p>
                      {r.dofus.length > 0 && <p className="mt-1 text-xs text-accent">Dofus : {r.dofus.join(', ')}</p>}
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </article>
    </div>
  );
}
