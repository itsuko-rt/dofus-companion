'use client';
// Profession journal: every profession of the game, grouped, with the active character's level in each.
import Link from 'next/link';
import type { JobSummary } from '../../src/professions-shared.ts';
import { useCharacter } from '../useCharacter';
import { ProgressBar } from '../ui';
import { jobIcon, KIND_LABEL } from './jobIcons';

const ORDER = ['gathering', 'crafting', 'forgemagus', 'other'] as const;

export default function ProfessionsIndex({ jobs }: { jobs: JobSummary[] }) {
  const ch = useCharacter();
  return (
    <div className="flex flex-col gap-6">
      {ORDER.map((kind) => {
        const list = jobs.filter((j) => j.kind === kind);
        if (!list.length) return null;
        return (
          <section key={kind}>
            <h2 className="mb-2 font-display text-base text-text">{KIND_LABEL[kind]}</h2>
            <ul className="parchment divide-y divide-line overflow-hidden rounded-md border border-[#c4a46e]">
              {list.map((j) => {
                const Icon = jobIcon(j.name);
                const lvl = ch.character.jobs[j.id];
                return (
                  <li key={j.id}>
                    <Link href={`/metiers/${j.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/50">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2"><Icon size={18} aria-hidden /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-text">{j.name}</span>
                        <span className="text-xs text-muted">
                          {[j.resources ? `${j.resources} ressources récoltables` : '', j.recipes ? `${j.recipes} recettes` : ''].filter(Boolean).join(' · ') || 'Pas de récolte ni de recette dans les données'}
                        </span>
                      </span>
                      <span className="hidden w-32 shrink-0 sm:block">
                        <span className="block text-right text-xs tabular-nums text-muted">{lvl ? `niv. ${lvl} / 200` : 'niveau non renseigné'}</span>
                        {lvl ? <ProgressBar value={lvl} max={200} className="mt-1 !h-1" label={`${j.name} : niveau ${lvl} sur 200`} /> : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
