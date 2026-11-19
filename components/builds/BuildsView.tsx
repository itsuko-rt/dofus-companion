'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Bookmark, BookmarkCheck, ExternalLink, Eye, GitCompare, Heart, Info, Shirt, Sparkles, X } from 'lucide-react';
import type { Element } from '../../src/spells.ts';
import { SUPPORTED_BREEDS } from '../breeds';
import { Button, ButtonLink, Card, ElementTag, EmptyState, Term } from '../ui';
import { PLAYSTYLES, useCharacter } from '../useCharacter';

interface ApiItem { id: number; name: string; type: string | null; level: number; set: string | null; effects: (string | null)[] }
interface ApiBuild {
  id: string; name: string; level: number; url: string; creator: string | null; origin: 'top' | 'recent';
  likes: number; favorites: number; views: number; updated: string | null; patch: string | null; upToDate: boolean;
  elements: Element[]; totals: Record<string, number> | null;
  slots: { slot: string; items: ApiItem[] }[];
  sets: { name: string; pieces: number; total: number; bonus: (string | null)[] }[];
  missing: number[];
}
interface ApiResponse {
  patch: string | null; breed: { id: number; name: string }; gameVersion: string; fetchedAt: string;
  spellsByElement: Partial<Record<Element, string[]>>; builds: ApiBuild[]; error?: string;
}

// Labels chosen for clarity (the game's own names, e.g. "Terre (%)", are ambiguous out of context).
const GROUPS: { title: string; stats: [string, string, string?][] }[] = [
  { title: 'Principales', stats: [
    ['actionPoints', 'PA', 'Points d’Action : combien de sorts vous lancez par tour.'],
    ['movementPoints', 'PM', 'Points de Mouvement : combien de cases vous parcourez par tour.'],
    ['range', 'PO', 'Portée : bonus de distance de vos sorts.'],
    ['vitality', 'Vitalité'], ['wisdom', 'Sagesse'], ['strength', 'Force'], ['intelligence', 'Intelligence'], ['chance', 'Chance'], ['agility', 'Agilité'],
  ] },
  { title: 'Dommages', stats: [
    ['damagePercent', 'Puissance', 'Augmente tous vos dégâts en pourcentage.'], ['allDamageBonus', 'Dommages'], ['criticalHit', 'Critique (%)'],
    ['fireDamageBonus', 'Dommages Feu'], ['waterDamageBonus', 'Dommages Eau'], ['earthDamageBonus', 'Dommages Terre'], ['airDamageBonus', 'Dommages Air'],
    ['healBonus', 'Soins'], ['maxSummonedCreaturesBoost', 'Invocations'],
  ] },
  { title: 'Résistances', stats: [
    ['neutralElementResistPercent', 'Neutre %'], ['earthElementResistPercent', 'Terre %'], ['fireElementResistPercent', 'Feu %'],
    ['waterElementResistPercent', 'Eau %'], ['airElementResistPercent', 'Air %'],
  ] },
];
const KEY_STATS = ['actionPoints', 'movementPoints', 'range', 'vitality'];

type Sort = 'match' | 'likes' | 'views' | 'recent';
const SORTS: { id: Sort | 'budget' | 'damage'; label: string; disabled?: string }[] = [
  { id: 'match', label: 'Meilleure correspondance' },
  { id: 'likes', label: 'Plus appréciés (j’aime)' },
  { id: 'views', label: 'Plus consultés' },
  { id: 'recent', label: 'Mis à jour récemment' },
  { id: 'budget', label: 'Budget le plus bas', disabled: 'aucune source de prix fiable' },
  { id: 'damage', label: 'Dégâts vérifiés', disabled: 'aucune source ne publie de dégâts vérifiés' },
];

export default function BuildsView() {
  const ch = useCharacter();
  const [breedId, setBreedId] = useState<number | null>(null);
  const breed = SUPPORTED_BREEDS.find((b) => b.id === (breedId ?? ch.character.profile.breed));
  const [level, setLevel] = useState<number | null>(null);
  const lvl = level ?? ch.character.level;
  const [element, setElement] = useState<Element | 'all'>('all');
  const [sort, setSort] = useState<Sort>('match');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [compare, setCompare] = useState<string[]>([]);

  useEffect(() => { if (ch.character.element) setElement(ch.character.element); }, [ch.character.element]);
  useEffect(() => {
    if (!breed) return;
    setData(null); setError(null);
    fetch(`/api/builds?breed=${breed.id}`).then((r) => r.json()).then((d: ApiResponse) => (d.error ? setError(d.error) : setData(d)), (e: Error) => setError(e.message));
  }, [breed]);

  const groups = useMemo(() => {
    if (!data) return null;
    // "match": prefer builds you can already wear, closest level, element focus, then popularity
    const score = (b: ApiBuild) => Math.abs(b.level - lvl) + (b.level > lvl ? 15 : 0) - Math.min(b.likes, 10) * 0.3;
    const cmp: Record<Sort, (a: ApiBuild, b: ApiBuild) => number> = {
      match: (a, b) => score(a) - score(b),
      likes: (a, b) => b.likes - a.likes || b.views - a.views,
      views: (a, b) => b.views - a.views,
      recent: (a, b) => (b.updated ?? '').localeCompare(a.updated ?? ''),
    };
    const list = data.builds.filter((b) => element === 'all' || b.elements.includes(element)).sort(cmp[sort]);
    const [maj, min] = (data.patch ?? '0.0').split('.').map(Number);
    const prev = min > 0 ? `${maj}.${min - 1}` : null;
    return {
      current: list.filter((b) => b.upToDate),
      previous: list.filter((b) => !b.upToDate && b.patch === prev),
      older: list.filter((b) => !b.upToDate && b.patch !== prev),
      prev,
    };
  }, [data, element, lvl, sort]);

  if (!ch.ready) return null;
  const compared = data?.builds.filter((b) => compare.includes(b.id)) ?? [];
  const toggleCompare = (id: string) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c.slice(-1), id]));
  const saved = (id: string) => ch.character.builds.some((b) => b.id === id);
  const control = 'rounded-lg border border-line bg-surface px-3 py-2 text-sm';

  const BuildCard = ({ b }: { b: ApiBuild }) => {
    const wearable = b.level <= lvl;
    const isOpen = open === b.id;
    const isSaved = saved(b.id);
    const isCurrent = ch.character.currentBuild === b.id;
    return (
      <Card className={`flex flex-col gap-3 ${isOpen ? 'border-faint' : ''} ${isCurrent ? 'border-accent/70' : ''}`}>
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-[15px] font-semibold">{b.name}</h3>
            <p className="text-xs text-muted">
              Niveau {b.level} · patch {b.patch ?? '?'}{b.creator ? ` · par ${b.creator}` : ''}
              {b.updated ? ` · mis à jour le ${new Date(b.updated).toLocaleDateString('fr-FR')}` : ''}
            </p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${wearable ? 'bg-done/15 text-done' : 'bg-surface-2 text-muted'}`}>
            {wearable ? 'Équipable à votre niveau' : `Niveau ${b.level} requis`}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {b.elements.map((el) => <ElementTag key={el} element={el} />)}
          {b.origin === 'top' && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] text-accent">Top communauté</span>}
          <span className="ml-auto flex items-center gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1" title="« J’aime » sur Fashionista"><Heart size={12} /> {b.likes}</span>
            <span className="inline-flex items-center gap-1" title="Vues sur Fashionista"><Eye size={12} /> {b.views}</span>
          </span>
        </div>
        {b.totals && (
          <dl className="grid grid-cols-4 gap-2 rounded-lg bg-surface-2 p-2 text-center">
            {KEY_STATS.map((k) => (
              <div key={k}><dt className="text-[11px] text-muted">{GROUPS[0].stats.find((s) => s[0] === k)?.[1]}</dt><dd className="font-display text-base font-semibold">{b.totals![k] ?? 0}</dd></div>
            ))}
          </dl>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant={isOpen ? 'secondary' : 'primary'} onClick={() => setOpen(isOpen ? null : b.id)}>{isOpen ? 'Masquer le détail' : 'Voir l’équipement'}</Button>
          <Button variant="ghost" aria-pressed={isSaved} title={isSaved ? 'Retirer de mon personnage' : 'Enregistrer dans mon personnage'}
            onClick={() => (isSaved ? ch.removeBuild(b.id) : ch.saveBuild({ source: 'Dofus Fashionista', id: b.id, name: b.name, level: b.level, url: b.url }))}>
            {isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />} {isSaved ? 'Enregistré' : 'Enregistrer'}
          </Button>
          <Button variant="ghost" aria-pressed={compare.includes(b.id)} onClick={() => toggleCompare(b.id)}><GitCompare size={15} /> {compare.includes(b.id) ? 'Comparé' : 'Comparer'}</Button>
          <a href={b.url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 self-center text-xs text-muted hover:text-text">Fashionista <ExternalLink size={12} /></a>
        </div>
        {isOpen && <BuildDetail b={b} spells={b.elements.flatMap((el) => data?.spellsByElement[el] ?? [])} breedId={breed!.id}
          current={isCurrent} onWear={() => { if (!isSaved) ch.saveBuild({ source: 'Dofus Fashionista', id: b.id, name: b.name, level: b.level, url: b.url }, true); else ch.wearBuild(isCurrent ? undefined : b.id); }} />}
      </Card>
    );
  };

  const Section = ({ title, hint, builds, warn }: { title: string; hint: string; builds: ApiBuild[]; warn?: boolean }) => builds.length ? (
    <section className="mt-6">
      <h2 className="font-display text-base font-semibold">{title} <span className="text-sm font-normal text-muted">({builds.length})</span></h2>
      <p className={`mb-3 text-sm ${warn ? 'text-check' : 'text-muted'}`}>{hint}</p>
      <ul className="grid gap-3 md:grid-cols-2">{builds.map((b) => <li key={b.id}><BuildCard b={b} /></li>)}</ul>
    </section>
  ) : null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="flex items-center gap-2 font-display text-xl font-semibold"><Shirt size={20} className="text-accent" /> Builds de la communauté</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Des équipements complets partagés sur <a className="text-accent underline" href="https://dofusfashionista.gg" target="_blank" rel="noopener noreferrer">Dofus Fashionista</a>,
          classés pour votre personnage. Objets et stats sont recalculés avec les données officielles du jeu.
        </p>

        <Card className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="text-xs text-muted">Classe
            <select className={`${control} mt-1 w-full`} value={breed?.id ?? ''} onChange={(e) => setBreedId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Choisir…</option>
              {SUPPORTED_BREEDS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label className="text-xs text-muted">Niveau
            <input type="number" min={1} max={200} className={`${control} mt-1 w-full`} value={lvl} onChange={(e) => setLevel(Math.min(200, Math.max(1, Number(e.target.value) || 1)))} />
          </label>
          <label className="text-xs text-muted">Élément
            <select className={`${control} mt-1 w-full`} value={element} onChange={(e) => setElement(e.target.value as Element | 'all')}>
              <option value="all">Tous</option>{(['Feu', 'Eau', 'Terre', 'Air'] as const).map((el) => <option key={el}>{el}</option>)}
            </select>
          </label>
          <label className="text-xs text-muted">Style de jeu
            <select className={`${control} mt-1 w-full`} disabled title="Fashionista ne précise pas le style de jeu de ses builds">
              <option>{PLAYSTYLES.find((s) => s.id === ch.character.playstyle)?.label ?? 'Tous'} (non filtrable)</option>
            </select>
          </label>
          <label className="text-xs text-muted">Version
            <select className={`${control} mt-1 w-full`} disabled title="Nos données d’objets couvrent Dofus 3"><option>Dofus 3</option></select>
          </label>
          <label className="text-xs text-muted">Trier par
            <select className={`${control} mt-1 w-full`} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              {SORTS.map((s) => <option key={s.id} value={s.id} disabled={!!s.disabled}>{s.label}{s.disabled ? ` — indisponible (${s.disabled})` : ''}</option>)}
            </select>
          </label>
        </Card>

        <div className="mt-3 flex flex-wrap gap-2">
          <ButtonLink href="https://dofusfashionista.gg/setup/" target="_blank" rel="noopener noreferrer" variant="secondary"><Sparkles size={15} /> Créer un build optimisé (Fashionista)</ButtonLink>
          <ButtonLink href="https://dofusbuilds.com/" target="_blank" rel="noopener noreferrer" variant="ghost">Simuler les dégâts (Dofus Builds) <ExternalLink size={13} /></ButtonLink>
          <ButtonLink href="https://dofuscreator.com/" target="_blank" rel="noopener noreferrer" variant="ghost">Dofus Creator <ExternalLink size={13} /></ButtonLink>
        </div>

        {ch.character.builds.length > 0 && (
          <Card className="mt-4">
            <h2 className="mb-2 font-display text-sm font-semibold">Enregistrés dans « {ch.character.name} »</h2>
            <ul className="flex flex-wrap gap-2 text-sm">
              {ch.character.builds.map((b) => (
                <li key={b.id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1 ${ch.character.currentBuild === b.id ? 'border-accent' : 'border-line'}`}>
                  <a href={b.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{b.name}</a>
                  <span className="text-xs text-muted">niv. {b.level}{ch.character.currentBuild === b.id ? ' · porté' : ''}</span>
                  <button aria-label={`Retirer ${b.name}`} onClick={() => ch.removeBuild(b.id)} className="text-faint hover:text-text"><X size={13} /></button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {!breed && <div className="mt-6"><EmptyState title="Choisissez une classe">Les builds dépendent de la classe.</EmptyState></div>}
        {breed && error && <div className="mt-6"><EmptyState title="Impossible de charger les builds">{error}</EmptyState></div>}
        {breed && !error && !groups && <p className="mt-6 text-sm text-muted">Chargement des builds de la communauté…</p>}
        {groups && (
          <>
            {groups.current.length + groups.previous.length + groups.older.length === 0 && (
              <div className="mt-6"><EmptyState title="Aucun build partagé pour ce filtre">Essayez « Tous » les éléments, ou créez le vôtre sur Fashionista.</EmptyState></div>
            )}
            <Section title={`À jour (patch ${data!.patch})`} hint="Optimisés pour la version actuelle du jeu." builds={groups.current} />
            <Section title={`Patch précédent (${groups.prev})`} hint="Encore pertinents dans l’ensemble, mais quelques objets ont pu changer depuis." builds={groups.previous} />
            <Section title="Anciens patchs" hint="À utiliser comme inspiration seulement : les objets et leurs effets ont pu beaucoup changer." builds={groups.older} warn />
          </>
        )}

        <p className="mt-8 flex gap-2 text-xs text-faint">
          <Info size={14} className="shrink-0" />
          Popularité et vues : chiffres publiés par Fashionista. Stats indicatives : objets au jet maximal, bonus de panoplie, points et parchemins du build.
          Non disponibles faute de source fiable : budget, prix, dégâts vérifiés et style de jeu.
        </p>
        {compared.length === 2 && <ComparePanel a={compared[0]} b={compared[1]} onClose={() => setCompare([])} />}
      </div>
    </div>
  );
}

function BuildDetail({ b, spells, breedId, current, onWear }: { b: ApiBuild; spells: string[]; breedId: number; current: boolean; onWear: () => void }) {
  return (
    <div className="flex flex-col gap-4 border-t border-line pt-3">
      <div className="flex flex-col gap-2">
        {b.slots.map((s) => (
          <div key={s.slot}>
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted">{s.slot}</h4>
            <ul>
              {s.items.map((it) => (
                <li key={it.id}>
                  <details className="rounded-lg px-2 py-1 hover:bg-surface-2">
                    <summary className="flex cursor-pointer list-none items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate font-medium">{it.name}</span>
                      <span className="text-xs text-muted">{it.type} · niv. {it.level}</span>
                    </summary>
                    <ul className="mt-1 grid gap-0.5 pb-1 text-xs text-muted sm:grid-cols-2">
                      {it.effects.filter(Boolean).map((e, i) => <li key={i}>{e}</li>)}
                      {it.set && <li className="text-check">Panoplie : {it.set}</li>}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {b.missing.length > 0 && <p className="text-xs text-check">{b.missing.length} objet(s) inconnu(s) de nos données, non comptés.</p>}
      </div>
      {b.sets.length > 0 && (
        <div>
          <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Bonus de panoplie</h4>
          <ul className="flex flex-col gap-1 text-sm">
            {b.sets.map((s) => (
              <li key={s.name}><b className="font-medium">{s.name}</b> <span className="text-muted">({s.pieces}/{s.total})</span>
                {s.bonus.length > 0 && <span className="text-muted"> : {s.bonus.filter(Boolean).join(', ')}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {b.totals && (
        <div className="grid gap-3 sm:grid-cols-3">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{g.title}</h4>
              <dl className="flex flex-col gap-0.5 text-sm">
                {g.stats.filter(([k]) => (b.totals![k] ?? 0) !== 0 || g.title === 'Principales').map(([k, label, def]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <dt className="text-muted">{def ? <Term def={def}>{label}</Term> : label}</dt>
                    <dd className="font-medium tabular-nums">{b.totals![k] ?? 0}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}
      {spells.length > 0 && (
        <div>
          <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Sorts du même élément à jouer avec ce build</h4>
          <p className="text-sm">{[...new Set(spells)].slice(0, 14).join(' · ')}</p>
          <Link href={`/personnage/sorts/${breedId}`} className="text-xs text-accent underline">Voir le détail des sorts</Link>
        </div>
      )}
      <Button variant={current ? 'ghost' : 'secondary'} className="self-start" onClick={onWear}>
        <Shirt size={15} /> {current ? 'Ce n’est plus mon build actuel' : 'C’est mon build actuel'}
      </Button>
    </div>
  );
}

function ComparePanel({ a, b, onClose }: { a: ApiBuild; b: ApiBuild; onClose: () => void }) {
  const rows = GROUPS.flatMap((g) => g.stats).filter(([k]) => (a.totals?.[k] ?? 0) !== 0 || (b.totals?.[k] ?? 0) !== 0);
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 max-h-[60vh] overflow-y-auto border-t border-line bg-surface p-4 shadow-2xl shadow-black/60" role="dialog" aria-label="Comparaison de builds">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">Comparaison</h2>
          <button onClick={onClose} aria-label="Fermer la comparaison" className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-text"><X size={18} /></button>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted"><th className="py-1">Stat</th><th>{a.name} <span className="font-normal">(niv. {a.level})</span></th><th>{b.name} <span className="font-normal">(niv. {b.level})</span></th></tr></thead>
          <tbody>
            {rows.map(([k, label]) => {
              const x = a.totals?.[k] ?? 0, y = b.totals?.[k] ?? 0;
              return (
                <tr key={k} className="border-t border-line">
                  <td className="py-1 text-muted">{label}</td>
                  <td className={`tabular-nums ${x > y ? 'font-semibold text-done' : ''}`}>{x}</td>
                  <td className={`tabular-nums ${y > x ? 'font-semibold text-done' : ''}`}>{y}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
