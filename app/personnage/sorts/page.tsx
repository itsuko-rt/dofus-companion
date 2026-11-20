import type { Metadata } from 'next';
import { pageMeta } from '../../../src/seo.ts';
import Link from 'next/link';
import { SUPPORTED_BREEDS } from '../../../components/breeds';
import ClassCard from '../../../components/character/ClassCard';

export const metadata: Metadata = pageMeta({ title: 'Classes et sorts', description: "Les sorts du Crâ et du Pandawa dans DOFUS : niveaux d'obtention, coûts, portées et effets lus dans les fichiers du jeu.", path: '/personnage/sorts' });

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="title-hero text-2xl">Classes et sorts</h1>
      <p className="mt-1 text-sm text-muted">
        Sorts, niveaux d&apos;obtention et effets lus directement dans les fichiers du jeu. Première version : Crâ et Pandawa.
      </p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {SUPPORTED_BREEDS.map((b) => (
          <li key={b.id}><Link href={`/personnage/sorts/${b.slug}`} className="block rounded-xl" aria-label={`${b.name} : la classe et ses sorts`}><ClassCard breed={b} /></Link></li>
        ))}
      </ul>
    </div>
  );
}
