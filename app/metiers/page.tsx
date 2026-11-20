import type { Metadata } from 'next';
import Breadcrumbs from '../../components/Breadcrumbs';
import ProfessionsIndex from '../../components/professions/ProfessionsIndex';
import { PageHero } from '../../components/ui';
import { latestDb } from '../../src/load.ts';
import { pageMeta } from '../../src/seo.ts';
import { loadJobs } from '../../src/world.ts';

export const metadata: Metadata = pageMeta({
  title: 'Métiers',
  description: 'Tous les métiers de DOFUS : ressources débloquées niveau par niveau, zones de récolte sur la carte, recettes et origine de chaque ingrédient, avec votre progression par personnage.',
  path: '/metiers',
});

export default function Page() {
  const db = latestDb();
  const jobs = db ? loadJobs(db) ?? [] : [];
  return (
    <div className="h-full overflow-y-auto">
      <PageHero color="#5b6236" kicker="Carnet du récolteur" title="Métiers">
        <p className="max-w-2xl text-sm text-white/80">Les ressources débloquées à chaque niveau, où les récolter et ce qu’on en fabrique, d’après les données officielles du jeu.</p>
      </PageHero>
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Breadcrumbs trail={[['Accueil', '/'], ['Métiers', '/metiers']]} />
        {jobs.length ? <div className="mt-4"><ProfessionsIndex jobs={jobs} /></div>
          : <p className="mt-4 text-sm text-muted">Données des métiers absentes : lancez <code>npm run import</code>.</p>}
      </div>
    </div>
  );
}
