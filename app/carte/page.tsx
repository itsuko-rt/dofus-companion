import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import Breadcrumbs from '../../components/Breadcrumbs';
import { PageHero } from '../../components/ui';
import { pageMeta } from '../../src/seo.ts';

export const metadata: Metadata = pageMeta({
  title: 'Cartes du monde',
  description: 'Les cartes interactives du Monde des Douze que nous recommandons : DofusDB pour explorer et chercher un lieu, Dofus Maps pour les ressources et les zones de récolte.',
  path: '/carte',
});

// External map tools: links only (no embedding, nothing copied). Monograms instead of their logos.
const TOOLS = [
  {
    name: 'DofusDB', href: 'https://dofusdb.fr/fr/tools/map', host: 'dofusdb.fr', mark: 'DB', tone: '#4e7a2c',
    text: 'Explorer le Monde des Douze, chercher un lieu et consulter la carte interactive.',
  },
  {
    name: 'Dofus Maps', href: 'https://dofus-maps.com/', host: 'dofus-maps.com', mark: 'DM', tone: '#a2702a',
    text: 'Trouver les ressources, les zones de récolte et les informations de carte utiles aux métiers.',
  },
];

export default function Page() {
  return (
    <div className="h-full overflow-y-auto">
      <PageHero color="var(--color-sec-quests)" kicker="Cartes" title="Cartes du monde">
        <p className="max-w-2xl text-sm text-white/80">Deux outils de la communauté, chacun dans son domaine. Ils s’ouvrent dans un nouvel onglet.</p>
      </PageHero>
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6">
        <Breadcrumbs trail={[['Accueil', '/'], ['Cartes', '/carte']]} />
        <ul className="grid gap-4 sm:grid-cols-2">
          {TOOLS.map((t) => (
            <li key={t.name}>
              <a href={t.href} target="_blank" rel="noopener noreferrer"
                className="group flex h-full flex-col gap-3 rounded-md border border-line bg-surface p-5 transition-colors hover:border-faint focus-visible:outline-2 focus-visible:outline-accent">
                <span className="flex items-center gap-3">
                  <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md font-display text-sm font-bold text-white" style={{ background: t.tone }}>{t.mark}</span>
                  <span className="min-w-0">
                    <span className="block font-display text-lg text-text">{t.name}</span>
                    <span className="block text-xs text-faint">{t.host}</span>
                  </span>
                </span>
                <span className="flex-1 text-sm leading-relaxed text-muted">{t.text}</span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-accent">
                  Ouvrir {t.name} <ArrowUpRight size={15} aria-hidden className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  <span className="text-xs font-normal text-faint">(site externe, nouvel onglet)</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="text-xs leading-relaxed text-faint">
          Sites indépendants, sans lien avec Atlas des Douze ni avec Ankama. Leurs contenus, publicités et règles de confidentialité sont les leurs.
        </p>
      </div>
    </div>
  );
}
