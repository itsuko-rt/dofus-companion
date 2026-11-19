import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '../../../components/Breadcrumbs';
import { PageHero } from '../../../components/ui';
import { dofusChain, dofusSlugs, guideContext } from '../../../src/guides-data.ts';
import { pageMeta } from '../../../src/seo.ts';

export const metadata: Metadata = pageMeta({
  title: 'Guide des Dofus : comment obtenir les 34 Dofus', path: '/guides/dofus',
  description: 'Les 34 Dofus de DOFUS classés par niveau, avec la quête ou le succès qui donne chacun et le nombre d’étapes à terminer avant, d’après les fichiers du jeu.',
});

export default function Page() {
  const c = guideContext();
  const list = c?.dofus ?? [];
  const slugs = dofusSlugs(list);
  return (
    <div className="h-full overflow-y-auto">
      <PageHero color="#7a4a12" kicker="Guide" title="Comment obtenir chaque Dofus">
        <p className="max-w-2xl text-sm text-white/80">Les {list.length} Dofus du jeu, du plus accessible au plus exigeant. Données du jeu {c?.version ?? ''}.</p>
      </PageHero>
      <article className="mx-auto max-w-5xl px-4 py-6">
        <Breadcrumbs trail={[['Accueil', '/'], ['Guides', '/guides'], ['Dofus', '/guides/dofus']]} />
        <section className="mt-5 max-w-3xl text-sm leading-relaxed text-muted">
          <h2 className="mb-1 font-display text-base text-text">Ce qu’il faut savoir</h2>
          <p>
            Les Dofus sont des œufs de dragon qui se portent comme un équipement. La plupart s’obtiennent en terminant une quête
            ou un succès précis, souvent au bout d’une longue chaîne. Le tableau indique la source de chacun et le nombre de quêtes
            et de succès à terminer en amont (en prenant une seule option quand le jeu laisse le choix). Certains ne viennent
            d’aucune quête ni d’aucun succès : ils se trouvent alors en butin, en échange ou pendant un évènement.
          </p>
        </section>
        <div className="mt-6 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">Dofus, niveau, source et nombre d’étapes</caption>
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr><th scope="col" className="px-3 py-2">Dofus</th><th scope="col" className="px-3 py-2">Niveau</th><th scope="col" className="px-3 py-2">Obtenu par</th><th scope="col" className="px-3 py-2 text-right">Étapes avant</th></tr>
            </thead>
            <tbody>
              {list.map((d) => {
                const chain = c ? dofusChain(c, d) : [];
                const steps = chain.length ? Math.min(...chain.map((x) => x.steps.length - 1)) : null;
                const source = [...d.quests.map((q) => `quête « ${q.name} »`), ...d.achievements.map((a) => `succès « ${a.name} »`)].join(', ');
                return (
                  <tr key={d.itemId} className="border-t border-line">
                    <th scope="row" className="px-3 py-2 text-left font-medium"><Link href={`/guides/dofus/${slugs.get(d.itemId)}`} className="hover:underline">{d.name}</Link></th>
                    <td className="px-3 py-2 tabular-nums">{d.level}</td>
                    <td className="px-3 py-2 text-muted">{source || 'Ni quête ni succès (butin, échange, évènement)'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{steps ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
