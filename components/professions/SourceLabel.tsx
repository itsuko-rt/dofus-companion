'use client';
import Link from 'next/link';
import { jobSlug, type IngredientSource } from '../../src/professions-shared.ts';

/** Where an ingredient comes from, from the game data: a profession, or the monsters that drop it. */
export default function SourceLabel({ source }: { source: IngredientSource }) {
  if (source.kind === 'gathered') return <Link className="text-accent hover:underline" href={`/metiers/${jobSlug(source.jobName)}`}>{source.jobName} niv. {source.levelMin}</Link>;
  if (source.kind === 'crafted') return <Link className="text-accent hover:underline" href={`/metiers/${jobSlug(source.jobName)}`}>{source.jobName} niv. {source.level}</Link>;
  if (!source.drops?.length) return <span className="text-faint">butin ou achat</span>;
  const pct = (n: number) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`;
  return (
    <span className="text-muted" title="Chance de base avant prospection, selon le grade du monstre">
      butin : {source.drops.map((d) => `${d.monster} (${d.min === d.max ? pct(d.max) : `${pct(d.min)}–${pct(d.max)}`}${d.conditional ? ', sous condition' : ''})`).join(', ')}
    </span>
  );
}
