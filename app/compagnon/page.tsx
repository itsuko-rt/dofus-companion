import type { Metadata } from 'next';
import CompanionView from '../../components/companion/CompanionView';
import CompanionSyncPanel from '../../components/companion/CompanionSyncPanel';
import { PageHero, SECTION } from '../../components/ui';
import { pageMeta } from '../../src/seo.ts';

export const metadata: Metadata = pageMeta({
  title: 'Compagnon : vos outils par-dessus le jeu', path: '/compagnon',
  description: 'Une petite fenêtre qui reste au premier plan pendant que vous jouez : guide pas à pas des quêtes d’un Dofus, succès épinglés et recherche de l’encyclopédie.',
});

// ?fenetre=1: opened as a popup (browsers without an always-on-top window): only the panel, no page around it
export default async function Page({ searchParams }: { searchParams: Promise<{ fenetre?: string }> }) {
  const popup = (await searchParams).fenetre === '1';
  if (popup) return <div className="h-full"><CompanionView standalone /></div>;
  return (
    <div className="h-full overflow-y-auto">
      <PageHero color={SECTION.scan} kicker="Pendant que vous jouez" title="Compagnon" />
      <div className="px-4 pt-4"><CompanionSyncPanel /></div>
      <CompanionView />
    </div>
  );
}
