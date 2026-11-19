'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Compass, Search, Sparkles } from 'lucide-react';
import { regionSummaries, isRecommended, type RegionSummary } from '../../src/regions.ts';
import { Card, ProgressBar, SectionTitle } from '../ui';
import NextSteps, { questHref } from './NextSteps';
import { useGame } from './useGame';

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

function RegionCard({ r, recommended }: { r: RegionSummary; recommended: boolean }) {
  return (
    <Link href={`/progression/quetes/${r.id}`}
      className={`group flex flex-col gap-2 rounded-xl border bg-surface p-3.5 transition hover:-translate-y-0.5 hover:border-faint
        ${recommended ? 'border-accent/70 shadow-[0_0_0_1px_rgba(233,180,76,0.25)]' : 'border-line'}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-[15px] font-semibold text-text">{r.name}</h3>
          <p className="text-xs text-muted">{r.levelMin === r.levelMax ? `niv. ${r.levelMin}` : `niv. ${r.levelMin}–${r.levelMax}`} · {r.total} quêtes</p>
        </div>
        {recommended && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-ink"><Sparkles size={11} /> Pour vous</span>}
      </div>
      <ProgressBar value={r.done} max={r.total} label={`${r.name} : ${r.done} sur ${r.total}`} />
      <div className="flex justify-between text-xs">
        <span className="text-muted">{r.done}/{r.total} terminées</span>
        {r.available > 0 && <span className="font-medium text-accent">{r.available} disponible{r.available > 1 ? 's' : ''}</span>}
      </div>
    </Link>
  );
}

export default function WorldView() {
  const { data, error, graph, status, categoryName, ch } = useGame();
  const [query, setQuery] = useState('');

  const regions = useMemo(() => (graph && data ? regionSummaries(graph, data.categories, status) : []), [graph, data, status]);
  const results = useMemo(() => {
    const q = norm(query.trim());
    if (!graph || q.length < 2) return [];
    return [...graph.nodes.values()].filter((n) => n.kind === 'quest' && norm(n.label).includes(q)).slice(0, 12);
  }, [graph, query]);

  if (error) return <p className="p-8 text-sm text-muted">Impossible de charger les quêtes : {error}</p>;
  if (!graph || !data) return <p className="p-8 text-sm text-muted">Chargement des quêtes…</p>;

  const main = regions.filter((r) => !r.side);
  const side = regions.filter((r) => r.side);
  const level = ch.character.level;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><Compass size={22} className="text-accent" /> Votre parcours</h1>
              <p className="mt-1 max-w-xl text-sm text-muted">
                Les régions sont classées du niveau le plus bas au plus haut. Celles marquées « Pour vous » correspondent à votre niveau ({level}) et ont des quêtes disponibles.
              </p>
            </div>
            <label className="relative w-full sm:w-72">
              <span className="sr-only">Rechercher une quête</span>
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une quête…"
                className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm placeholder:text-faint" />
              {results.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-line bg-surface-2 shadow-xl">
                  {results.map((n) => (
                    <li key={n.id}>
                      <Link href={questHref(n)} className="block px-3 py-2 text-sm hover:bg-line">
                        {n.label} <span className="text-xs text-muted">· {categoryName.get(n.category ?? -1)}{n.level ? ` · niv. ${n.level}` : ''}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </label>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {main.map((r) => <li key={r.id}><RegionCard r={r} recommended={isRecommended(r, level)} /></li>)}
          </ul>

          <h2 className="mb-2 mt-8 font-display text-base font-semibold">Quêtes annexes</h2>
          <p className="mb-3 text-sm text-muted">Quêtes quotidiennes, répétables, saisonnières ou d’évènement : elles ne font pas avancer la progression principale.</p>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {side.map((r) => <li key={r.id}><RegionCard r={r} recommended={false} /></li>)}
          </ul>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <SectionTitle hint={ch.hasCharacter ? `${ch.character.name} · niv. ${level}` : `niv. ${level}`}>Vos prochaines étapes</SectionTitle>
            <NextSteps graph={graph} status={status} progress={ch.progress} categoryName={categoryName} />
          </Card>
        </aside>
      </div>
    </div>
  );
}
