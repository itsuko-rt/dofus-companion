import type { Metadata } from 'next';
import Link from 'next/link';
import { Compass, Egg, Trophy } from 'lucide-react';
import Breadcrumbs from '../../components/Breadcrumbs';
import { Diamond, PageHero } from '../../components/ui';
import { pageMeta } from '../../src/seo.ts';

export const metadata: Metadata = pageMeta({
  title: 'Guides DOFUS', path: '/guides',
  description: 'Guides de référence DOFUS construits à partir des fichiers du jeu : ordre des quêtes par région, prérequis, et comment obtenir chacun des 34 Dofus.',
});

const GUIDES = [
  { href: '/guides/quetes', title: 'Guide des quêtes', text: 'Toutes les régions, leurs niveaux et leurs chaînes, puis chaque quête dans un ordre jouable avec ses prérequis.', icon: Compass, color: 'var(--color-sec-quests)' },
  { href: '/guides/dofus', title: 'Guide des Dofus', text: 'Les 34 Dofus, leur niveau, la quête ou le succès qui les donne et toute la chaîne à terminer avant.', icon: Egg, color: 'var(--color-accent)' },
  { href: '/progression/succes', title: 'Suivi des succès', text: 'Les 2 777 succès par catégorie, objectif par objectif, avec récompenses.', icon: Trophy, color: 'var(--color-sec-achievements)' },
];

export default function Page() {
  return (
    <div className="h-full overflow-y-auto">
      <PageHero color="var(--color-sec-quests)" kicker="Références" title="Guides DOFUS">
        <p className="max-w-2xl text-sm text-white/80">Des pages lisibles sans compte, générées à partir des données officielles du jeu. Chaque guide renvoie vers l’outil interactif correspondant.</p>
      </PageHero>
      <article className="mx-auto max-w-5xl px-4 py-6">
        <Breadcrumbs trail={[['Accueil', '/'], ['Guides', '/guides']]} />
        <ul className="mt-5 grid gap-4 sm:grid-cols-3">
          {GUIDES.map((g) => {
            const Icon = g.icon;
            return (
              <li key={g.href}>
                <Link href={g.href} className="flex h-full flex-col gap-2 rounded-md border border-line bg-surface p-4 transition-colors hover:border-faint">
                  <Diamond color={g.color} size={26}><Icon size={15} /></Diamond>
                  <h2 className="font-display text-lg">{g.title}</h2>
                  <p className="text-sm text-muted">{g.text}</p>
                </Link>
              </li>
            );
          })}
        </ul>
        <section className="mt-8 max-w-3xl text-sm leading-relaxed text-muted">
          <h2 className="mb-2 font-display text-base text-text">D’où viennent ces informations ?</h2>
          <p>
            Les quêtes, leurs conditions, les succès et les récompenses sont lus dans les fichiers de données du jeu
            (export communautaire <a className="underline" href="https://github.com/ledouxm/dofus-sqlite">dofus-sqlite</a>), à chaque mise à jour.
            Les liens vers les tutoriels pointent vers <a className="underline" href="https://www.dofuspourlesnoobs.com/">Dofus Pour Les Noobs</a> quand
            une page porte exactement le nom de la quête ; leur contenu n’est jamais recopié.
          </p>
        </section>
      </article>
    </div>
  );
}
