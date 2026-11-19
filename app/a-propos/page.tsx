import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '../../components/Breadcrumbs';
import { PageHero } from '../../components/ui';
import { BRAND } from '../../src/brand.ts';
import { pageMeta } from '../../src/seo.ts';

export const metadata: Metadata = pageMeta({
  title: 'À propos', path: '/a-propos',
  description: `${BRAND.name} est un compagnon gratuit pour DOFUS : suivi des quêtes et succès, guides des Dofus et builds, calculés à partir des fichiers du jeu.`,
});

export default function Page() {
  return (
    <div className="h-full overflow-y-auto">
      <PageHero color="var(--color-sec-quests)" kicker="À propos" title={BRAND.name}>
        <p className="max-w-2xl text-sm text-white/80">{BRAND.tagline}</p>
      </PageHero>
      <article className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 text-sm leading-relaxed text-muted">
        <Breadcrumbs trail={[['Accueil', '/'], ['À propos', '/a-propos']]} />
        <section>
          <h2 className="mb-1 font-display text-base text-text">Ce que fait le site</h2>
          <ul className="list-disc pl-5">
            <li><Link className="underline" href="/progression/quetes">Carte des quêtes</Link> : chaque quête avec ses conditions réelles, région par région.</li>
            <li><Link className="underline" href="/progression/succes">Suivi des succès</Link> : objectifs un par un, déduits de votre progression quand c’est possible.</li>
            <li><Link className="underline" href="/guides">Guides</Link> : ordre des quêtes, chaîne complète de chaque Dofus.</li>
            <li><Link className="underline" href="/builds">Builds</Link> : builds partagés sur Dofus Fashionista, recalculés avec les données du jeu.</li>
          </ul>
        </section>
        <section>
          <h2 className="mb-1 font-display text-base text-text">Sources</h2>
          <ul className="list-disc pl-5">
            <li>Données du jeu : fichiers extraits par <a className="underline" href="https://github.com/ledouxm/dofus-sqlite">dofus-sqlite</a> ; objets et panoplies par <a className="underline" href="https://github.com/dofusdude/dofus3-main">dofusdude</a>.</li>
            <li>Builds : API publique de <a className="underline" href="https://dofusfashionista.gg">Dofus Fashionista</a>, mise en cache une heure.</li>
            <li>Tutoriels : liens vers <a className="underline" href="https://www.dofuspourlesnoobs.com/">Dofus Pour Les Noobs</a> quand le titre correspond exactement ; aucun contenu recopié.</li>
          </ul>
          <p className="mt-2">Quand une information ne peut pas être vérifiée (une condition qui dépend de l’état du jeu, par exemple), le site l’indique au lieu de deviner.</p>
        </section>
        <section>
          <h2 className="mb-1 font-display text-base text-text">Gratuit</h2>
          <p>Le suivi des quêtes, des succès, les builds et les personnages restent gratuits. Le site pourra afficher de la publicité sur les pages de lecture, jamais au milieu des outils.</p>
        </section>
        <p className="text-xs text-faint">{BRAND.disclaimer} Le logo (un œuf doré et un soleil à douze rayons) est une création originale.</p>
      </article>
    </div>
  );
}
