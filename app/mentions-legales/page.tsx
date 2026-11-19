import type { Metadata } from 'next';
import Breadcrumbs from '../../components/Breadcrumbs';
import { PageHero } from '../../components/ui';
import { BRAND } from '../../src/brand.ts';
import { pageMeta } from '../../src/seo.ts';

export const metadata: Metadata = pageMeta({ title: 'Mentions légales', path: '/mentions-legales', description: `Éditeur, hébergeur et propriété intellectuelle de ${BRAND.name}.` });

// Publisher details come from the environment so no personal data is committed to the repository.
// Required in France before going public (LCEN art. 6): see docs/LANCEMENT_PUBLIC.md §9.
const PUBLISHER = process.env.LEGAL_PUBLISHER;
const CONTACT = process.env.LEGAL_CONTACT;
const HOST = process.env.LEGAL_HOST;

export default function Page() {
  const missing = <span className="rounded bg-accent/15 px-1 text-accent">à compléter avant la mise en ligne</span>;
  return (
    <div className="h-full overflow-y-auto">
      <PageHero color="var(--color-sec-account)" kicker={BRAND.name} title="Mentions légales" />
      <article className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 text-sm leading-relaxed text-muted">
        <Breadcrumbs trail={[['Accueil', '/'], ['Mentions légales', '/mentions-legales']]} />
        <section>
          <h2 className="mb-1 font-display text-base text-text">Éditeur</h2>
          <p>{PUBLISHER ?? missing}</p>
          <p>Contact : {CONTACT ?? missing}</p>
        </section>
        <section>
          <h2 className="mb-1 font-display text-base text-text">Hébergement</h2>
          <p>{HOST ?? missing}</p>
        </section>
        <section>
          <h2 className="mb-1 font-display text-base text-text">Propriété intellectuelle</h2>
          <p>{BRAND.disclaimer} Les noms, données de jeu, illustrations et icônes de DOFUS appartiennent à Ankama et sont utilisés à titre de site de fan, sans affiliation ni approbation. Le code, les textes et le logo d’{BRAND.name} sont originaux.</p>
          <p className="mt-2">{BRAND.name} n’est affilié ni à Ankama, ni à Dofus Pour Les Noobs, ni à Dofus Fashionista, ni à aucun autre service cité.</p>
        </section>
      </article>
    </div>
  );
}
