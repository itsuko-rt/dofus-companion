import type { Metadata } from 'next';
import Breadcrumbs from '../../../components/Breadcrumbs';
import AtelierView from '../../../components/professions/AtelierView';
import { PageHero } from '../../../components/ui';
import { pageMeta } from '../../../src/seo.ts';

export const metadata: Metadata = pageMeta({
  title: 'Atelier de craft : le total des ressources', path: '/metiers/atelier',
  description: 'Ajoutez les objets à fabriquer : l’atelier additionne les ressources des recettes du jeu, sous-crafts compris, et ce qu’il vous reste à réunir.',
});

export default function Page() {
  return (
    <div className="h-full overflow-y-auto">
      <PageHero color="#5b6236" kicker="Métiers" title="Atelier de craft">
        <p className="max-w-2xl text-sm text-white/85">Les objets à fabriquer, et tout ce qu’il faut réunir pour eux d’après les recettes du jeu.</p>
      </PageHero>
      <div className="mx-auto max-w-6xl px-4 pt-4"><Breadcrumbs trail={[['Accueil', '/'], ['Métiers', '/metiers'], ['Atelier', '/metiers/atelier']]} /></div>
      <AtelierView />
    </div>
  );
}
