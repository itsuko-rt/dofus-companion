import type { Metadata } from 'next';
import Link from 'next/link';
import { SUPPORTED_BREEDS } from '../../components/breeds';

export const metadata: Metadata = { title: 'Classes · Dofus Companion' };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold">Classes</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Sorts, niveaux d&apos;obtention et effets lus directement dans les fichiers du jeu. Première version : Crâ et Pandawa.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {SUPPORTED_BREEDS.map((b) => (
          <li key={b.id}>
            <Link href={`/classes/${b.id}`} className="block rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 hover:border-zinc-600">
              <div className="text-base font-medium text-zinc-100">{b.name}</div>
              <div className="mt-1 text-xs text-zinc-400">{b.blurb}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
