'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { BookOpen, Compass, Shirt, Sparkles } from 'lucide-react';
import { regionSummaries, isRecommended } from '../src/regions.ts';
import { BRAND } from '../src/brand.ts';
import { SUPPORTED_BREEDS } from './breeds';
import Onboarding from './character/Onboarding';
import NextSteps from './quests/NextSteps';
import { useGame } from './quests/useGame';
import { ButtonLink, Card, ElementTag, ProgressBar, SectionTitle } from './ui';
import { PLAYSTYLES } from './useCharacter';

export default function Home() {
  const { data, graph, status, categoryName, ch } = useGame();
  const regions = useMemo(() => (graph && data ? regionSummaries(graph, data.categories, status) : []), [graph, data, status]);

  if (!ch.ready) return null;

  if (!ch.hasCharacter) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <p className="text-sm font-medium text-accent">Bienvenue</p>
          <h1 className="mt-1 font-display text-3xl font-semibold leading-tight">Votre aventure dans le Monde des Douze, étape par étape.</h1>
          <p className="mt-3 text-muted">
            {BRAND.name} vous dit quelles quêtes faire, comment les débloquer et quel équipement porter, à partir des données officielles du jeu.
            Commencez par décrire votre personnage : cela prend 30 secondes.
          </p>
          <div className="mt-6"><Onboarding /></div>
        </div>
      </div>
    );
  }

  const c = ch.character;
  const breed = SUPPORTED_BREEDS.find((b) => b.id === c.profile.breed);
  const main = regions.filter((r) => !r.side);
  const done = main.reduce((s, r) => s + r.done, 0);
  const total = main.reduce((s, r) => s + r.total, 0);
  const recommended = main.filter((r) => isRecommended(r, c.level)).slice(0, 3);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          <Card className="flex flex-wrap items-center gap-4 bg-gradient-to-br from-surface-2 to-surface">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 font-display text-xl font-bold text-accent" aria-hidden>
              {c.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-semibold">{c.name}</h1>
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
                {breed?.name ?? 'Classe non choisie'} · niveau {c.level}
                {c.playstyle && <> · {PLAYSTYLES.find((s) => s.id === c.playstyle)?.label}</>}
                {c.element && <ElementTag element={c.element} />}
              </p>
            </div>
            <ButtonLink href="/personnage" variant="ghost">Modifier</ButtonLink>
          </Card>

          <Card>
            <SectionTitle hint={`${done} / ${total} quêtes`}>Progression</SectionTitle>
            <ProgressBar value={done} max={total} label="Progression globale" />
            {recommended.length > 0 && (
              <>
                <p className="mb-2 mt-4 flex items-center gap-1.5 text-sm text-muted"><Sparkles size={14} className="text-accent" /> Régions conseillées pour votre niveau</p>
                <ul className="grid gap-2 sm:grid-cols-3">
                  {recommended.map((r) => (
                    <li key={r.id}>
                      <Link href={`/progression/quetes/${r.id}`} className="block rounded-lg border border-line bg-surface-2 p-3 hover:border-faint">
                        <span className="block truncate font-medium">{r.name}</span>
                        <span className="text-xs text-accent">{r.available} disponible{r.available > 1 ? 's' : ''}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <ButtonLink href="/progression/quetes" variant="secondary" className="mt-4"><Compass size={15} /> Voir toutes les régions</ButtonLink>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/builds" className="rounded-xl border border-line bg-surface p-4 hover:border-faint">
              <Shirt size={18} className="text-accent" />
              <h2 className="mt-2 font-display font-semibold">Équipement conseillé</h2>
              <p className="text-sm text-muted">Des builds réels pour votre classe et votre niveau.</p>
            </Link>
            <Link href={breed ? `/personnage/sorts/${breed.id}` : '/personnage/sorts'} className="rounded-xl border border-line bg-surface p-4 hover:border-faint">
              <BookOpen size={18} className="text-accent" />
              <h2 className="mt-2 font-display font-semibold">Vos sorts</h2>
              <p className="text-sm text-muted">Ce qu’ils font et quand vous les obtenez.</p>
            </Link>
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <SectionTitle>Vos prochaines étapes</SectionTitle>
            {graph ? <NextSteps graph={graph} status={status} progress={ch.progress} categoryName={categoryName} />
              : <p className="text-sm text-muted">Chargement…</p>}
          </Card>
        </aside>
      </div>
    </div>
  );
}
