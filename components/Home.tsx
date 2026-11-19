'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { BookOpen, Compass, History, ScanLine, Sparkles, Swords, Trophy } from 'lucide-react';
import { regionSummaries, isRecommended } from '../src/regions.ts';
import { BRAND } from '../src/brand.ts';
import { SUPPORTED_BREEDS } from './breeds';
import AdSlot from './AdSlot';
import Onboarding from './character/Onboarding';
import NextSteps, { regionPath } from './quests/NextSteps';
import { useAchievementProgress } from './progression/useAchievementProgress';
import { ButtonLink, Card, Diamond, ElementTag, ProgressBar, SectionTitle } from './ui';
import { PLAYSTYLES } from './useCharacter';

function Gauge({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-black/35 px-3 py-2 backdrop-blur-sm">
      <p className="flex items-baseline justify-between gap-2">
        <span className="truncate text-xs uppercase tracking-wide text-white/75">{label}</span>
        <span className="font-display text-lg leading-none text-white">{pct} %</span>
      </p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="mt-1 text-[11px] text-white/60">{value} / {max}</p>
    </div>
  );
}

const SHORTCUTS = [
  { href: '/builds', label: 'Builds', text: 'Des builds réels pour votre classe et votre niveau.', icon: Swords, color: 'var(--color-sec-builds)' },
  { href: '/progression/succes', label: 'Succès', text: 'Votre journal d’aventurier, objectif par objectif.', icon: Trophy, color: 'var(--color-sec-achievements)' },
  { href: '/progression/scan', label: 'Scanner', text: 'Une capture de Dofus, et votre progression se met à jour.', icon: ScanLine, color: 'var(--color-sec-scan)' },
];

export default function Home() {
  const { data, graph, status, categoryName, ch, progress, recent, almost } = useAchievementProgress();
  const regions = useMemo(() => (graph && data ? regionSummaries(graph, data.categories, status) : []), [graph, data, status]);

  if (!ch.ready) return null;

  if (!ch.hasCharacter) {
    return (
      <div className="h-full overflow-y-auto">
        <section className="relative isolate overflow-hidden border-b border-black/40 bg-sec-characters"
          style={{ backgroundImage: `url(${SUPPORTED_BREEDS[0].art.scene})`, backgroundSize: 'cover', backgroundPosition: 'right center' }}>
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/50 to-black/10" aria-hidden />
          <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#ffe2a6]">Bienvenue, aventurier</p>
            <h1 className="title-hero mt-2 max-w-2xl text-3xl leading-tight text-white sm:text-4xl">Votre aventure dans le Monde des Douze, étape par étape</h1>
            <p className="mt-3 max-w-xl text-white/80">
              {BRAND.name} vous dit quelles quêtes faire, comment les débloquer et quel équipement porter, à partir des données officielles du jeu.
            </p>
          </div>
        </section>
        <div className="mx-auto max-w-3xl px-4 py-8">
          <h2 className="mb-3 font-display text-lg">Créez votre personnage <span className="text-sm text-muted">· 30 secondes</span></h2>
          <Onboarding />
        </div>
      </div>
    );
  }

  const c = ch.character;
  const breed = SUPPORTED_BREEDS.find((b) => b.id === c.profile.breed);
  const main = regions.filter((r) => !r.side);
  const questsDone = main.reduce((s, r) => s + r.done, 0);
  const questsTotal = main.reduce((s, r) => s + r.total, 0);
  const achDone = [...progress.values()].filter((p) => p.state === 'obtained').length;
  const recommended = main.filter((r) => isRecommended(r, c.level)).slice(0, 3);
  const label = (id: string) => graph?.nodes.get(id)?.label ?? id;

  return (
    <div className="h-full overflow-y-auto">
      {/* hero: the character in its class scene */}
      <section className="relative isolate overflow-hidden border-b border-black/40"
        style={{ backgroundColor: breed?.hue ?? 'var(--color-sec-characters)', backgroundImage: breed ? `url(${breed.art.scene})` : undefined, backgroundSize: 'cover', backgroundPosition: 'right center' }}>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 via-black/55 to-black/5" aria-hidden />
        <div className="mx-auto flex max-w-6xl flex-wrap items-end gap-5 px-4 py-8 sm:py-10">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-[#ffe2a6]/60 shadow-[0_8px_24px_rgba(0,0,0,0.5)] sm:h-28 sm:w-28"
            style={{ background: breed?.hue ?? 'var(--color-surface-2)' }}>
            {breed && <img src={breed.art.portrait} alt={`Portrait de ${breed.name}`} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#ffe2a6]">{breed ? `${breed.name} · ${breed.title}` : 'Classe non choisie'}</p>
            <h1 className="title-hero text-3xl leading-tight text-white sm:text-4xl">{c.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/80">
              Niveau {c.level}
              {c.playstyle && <> · {PLAYSTYLES.find((s) => s.id === c.playstyle)?.label}</>}
              {c.element && <ElementTag element={c.element} />}
              <ButtonLink href="/personnage" variant="ghost" className="!px-2 !py-0.5 text-white/80 hover:!bg-white/10 hover:!text-white">Modifier</ButtonLink>
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-[22rem]">
            <Gauge label="Quêtes" value={questsDone} max={questsTotal} color="var(--color-done)" />
            <Gauge label="Succès" value={achDone} max={progress.size || 1} color="var(--color-accent)" />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          <Card>
            <SectionTitle hint={`${questsDone} / ${questsTotal} quêtes`}>Objectifs du moment</SectionTitle>
            {graph ? <NextSteps graph={graph} status={status} progress={ch.progress} categoryName={categoryName} />
              : <p className="text-sm text-muted">Chargement…</p>}
            {recommended.length > 0 && (
              <>
                <p className="mb-2 mt-4 flex items-center gap-1.5 text-sm text-muted"><Sparkles size={14} className="text-accent" /> Régions conseillées pour votre niveau</p>
                <ul className="grid gap-2 sm:grid-cols-3">
                  {recommended.map((r) => (
                    <li key={r.id}>
                      <Link href={regionPath(r.id)} className="group block rounded-lg border border-line bg-surface-2 p-3 transition hover:-translate-y-0.5 hover:border-sec-quests">
                        <span className="block truncate font-medium">{r.name}</span>
                        <span className="text-xs text-accent">{r.available} disponible{r.available > 1 ? 's' : ''}</span>
                        <ProgressBar value={r.done} max={r.total} className="mt-2 !h-1" label={`${r.name} : ${r.done} sur ${r.total}`} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <ButtonLink href="/progression/quetes" variant="primary" className="mt-4"><Compass size={15} /> Ouvrir la carte des quêtes</ButtonLink>
          </Card>

          <ul className="grid gap-3 sm:grid-cols-3">
            {SHORTCUTS.map((s) => {
              const Icon = s.icon;
              return (
                <li key={s.href}>
                  <Link href={s.href} className="group flex h-full flex-col gap-2 rounded-xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-faint">
                    <Diamond color={s.color} size={26}><Icon size={15} /></Diamond>
                    <h2 className="font-display uppercase tracking-wide">{s.label}</h2>
                    <p className="text-sm text-muted">{s.text}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
          <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME} />
          {breed && (
            <Link href={`/personnage/sorts/${breed.slug}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 hover:border-faint">
              <BookOpen size={18} className="text-accent" />
              <span className="flex-1"><span className="font-display">Sorts du {breed.name}</span><span className="block text-sm text-muted">Ce qu’ils font et quand vous les obtenez.</span></span>
            </Link>
          )}
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
          <Card paper>
            <SectionTitle hint={<Link href="/progression/succes" className="underline">Journal</Link>}>Succès presque terminés</SectionTitle>
            {almost.length ? (
              <ul className="flex flex-col">
                {almost.map(([id, p]) => (
                  <li key={id} className="flex items-center gap-2 border-b border-line/60 py-1.5 text-sm last:border-0">
                    <span className="min-w-0 flex-1 truncate">{label(`ach:${id}`)}</span>
                    <span className={`shrink-0 text-xs ${p.state === 'ready' ? 'font-medium text-accent' : 'text-muted'}`}>{p.state === 'ready' ? 'à confirmer' : `${p.met}/${p.total}`}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">Terminez des quêtes ou cochez des objectifs : les succès proches apparaîtront ici.</p>}
            <h3 className="mb-1 mt-4 flex items-center gap-1.5 text-sm font-medium"><History size={14} /> Derniers obtenus</h3>
            {recent.length ? recent.map((r) => (
              <p key={r.id} className="flex justify-between gap-2 text-sm"><span className="truncate">{label(r.id)}</span><span className="shrink-0 text-xs text-faint">{new Date(r.at).toLocaleDateString('fr-FR')}</span></p>
            )) : <p className="text-sm text-muted">Aucun pour l’instant.</p>}
          </Card>
        </aside>
      </div>
    </div>
  );
}
