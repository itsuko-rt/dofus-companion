import type { Metadata } from 'next';
import Link from 'next/link';
import { SUPPORTED_BREEDS } from '../../../components/breeds';

export const metadata: Metadata = { title: 'Sorts · Atlas des Douze' };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-xl font-semibold">Sorts par classe</h1>
      <p className="mt-1 text-sm text-muted">
        Sorts, niveaux d&apos;obtention et effets lus directement dans les fichiers du jeu. Première version : Crâ et Pandawa.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {SUPPORTED_BREEDS.map((b) => (
          <li key={b.id}>
            <Link href={`/personnage/sorts/${b.id}`} className="block rounded-xl border border-line bg-surface p-4 hover:border-faint">
              <div className="text-base font-medium text-text">{b.name}</div>
              <div className="mt-1 text-xs text-muted">{b.blurb}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
