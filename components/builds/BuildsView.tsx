'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Eye, GitCompare, Heart, Info, Sparkles, X } from 'lucide-react';
import type { Element } from '../../src/spells.ts';
import { SUPPORTED_BREEDS } from '../breeds';
import { Button, ButtonLink, Card, ElementTag, EmptyState, Term } from '../ui';
import { useCharacter } from '../useCharacter';

interface ApiBuild {
  id: string; name: string; level: number; url: string; creator: string | null;
  likes: number; favorites: number; views: number; patch: string | null; upToDate: boolean;
  elements: Element[]; totals: Record<string, number> | null;
  items: { id: number; name: string; type: string | null; level: number; set: string | null; effects: (string | null)[] }[];
  sets: { name: string; pieces: number; total: number; bonus: (string | null)[] }[];
  missing: number[];
}
interface ApiResponse { patch: string | null; breed: string; source: string; fetchedAt: string; statNames: Record<string, string>; builds: ApiBuild[]; error?: string }

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

const prevPatch = (p: string | null) => { if (!p) return null; const [a, b] = p.split('.').map(Number); return b > 0 ? `${a}.${b - 1}` : null; };

export default function BuildsView() {
  const ch = useCharacter();
  const breed = SUPPORTED_BREEDS.find((b) => b.id === ch.character.profile.breed);
  const level = ch.character.level;
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [element, setElement] = useState<Element | 'all'>('all');
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
    const near = (b: ApiBuild) => Math.abs(b.level - level) + (b.level > level ? 15 : 0); // prefer builds you can already wear
    const list = data.builds.filter((b) => element === 'all' || b.elements.includes(element)).sort((a, b) => near(a) - near(b));
    const prev = prevPatch(data.patch);
    return {
      current: list.filter((b) => b.upToDate),
      previous: list.filter((b) => !b.upToDate && b.patch === prev),
      older: list.filter((b) => !b.upToDate && b.patch !== prev),
      prev,
    };
  }, [data, element, level]);

  if (!ch.ready) return null;
  if (!breed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <EmptyState title="Choisissez d’abord votre classe">
          Les builds dépendent de la classe. <Link className="text-accent underline" href="/personnage">Compléter mon profil</Link>
        </EmptyState>
      </div>
    );
  }

  const compared = data?.builds.filter((b) => compare.includes(b.id)) ?? [];
  const toggleCompare = (id: string) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c.slice(-1), id]));

  const BuildCard = ({ b }: { b: ApiBuild }) => {
    const wearable = b.level <= level;
    const isOpen = open === b.id;
    return (
      <Card className={`flex flex-col gap-3 ${isOpen ? 'border-faint' : ''}`}>
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-[15px] font-semibold">{b.name}</h3>
            <p className="text-xs text-muted">
              Niveau {b.level} · patch {b.patch ?? '?'}{b.creator ? ` · par ${b.creator}` : ''}
            </p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${wearable ? 'bg-done/15 text-done' : 'bg-surface-2 text-muted'}`}>
            {wearable ? 'Équipable à votre niveau' : `Niveau ${b.level} requis`}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {b.elements.map((el) => <ElementTag key={el} element={el} />)}
          <span className="ml-auto flex items-center gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1"><Heart size={12} /> {b.likes}</span>
            <span className="inline-flex items-center gap-1"><Eye size={12} /> {b.views}</span>
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
          <Button variant="ghost" aria-pressed={compare.includes(b.id)} onClick={() => toggleCompare(b.id)}>
            <GitCompare size={15} /> {compare.includes(b.id) ? 'Comparé' : 'Comparer'}
          </Button>
          <a href={b.url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 self-center text-xs text-muted hover:text-text">
            Fashionista <ExternalLink size={12} />
          </a>
        </div>
        {isOpen && <BuildDetail b={b} />}
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
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold">Équipement conseillé · {breed.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Les builds les mieux notés par la communauté sur <a className="text-accent underline" href="https://dofusfashionista.gg" target="_blank" rel="noopener noreferrer">Dofus Fashionista</a>, classés selon votre niveau ({level}).
            Les objets et les stats sont recalculés avec les données officielles du jeu.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par élément">
          {(['all', 'Feu', 'Eau', 'Terre', 'Air'] as const).map((el) => (
            <button key={el} onClick={() => setElement(el)} aria-pressed={element === el}
              className={`rounded-full border px-3 py-1 text-xs ${element === el ? 'border-accent bg-accent/10 text-text' : 'border-line text-muted hover:text-text'}`}>
              {el === 'all' ? 'Tous les éléments' : el}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ButtonLink href="https://dofusfashionista.gg/setup/" target="_blank" rel="noopener noreferrer" variant="secondary"><Sparkles size={15} /> Créer un build optimisé (Fashionista)</ButtonLink>
        <ButtonLink href="https://dofusbuilds.com/" target="_blank" rel="noopener noreferrer" variant="ghost">Simuler les dégâts (Dofus Builds) <ExternalLink size={13} /></ButtonLink>
        <ButtonLink href="https://dofuscreator.com/" target="_blank" rel="noopener noreferrer" variant="ghost">Dofus Creator <ExternalLink size={13} /></ButtonLink>
      </div>

      {error && <div className="mt-6"><EmptyState title="Impossible de charger les builds">{error}</EmptyState></div>}
      {!error && !groups && <p className="mt-6 text-sm text-muted">Chargement des builds de la communauté…</p>}
      {groups && (
        <>
          {groups.current.length + groups.previous.length + groups.older.length === 0 && (
            <div className="mt-6"><EmptyState title="Aucun build partagé pour ce filtre">Essayez « Tous les éléments », ou créez le vôtre sur Fashionista.</EmptyState></div>
          )}
          <Section title={`À jour (patch ${data!.patch})`} hint="Optimisés pour la version actuelle du jeu." builds={groups.current} />
          <Section title={`Patch précédent (${groups.prev})`} hint="Encore pertinents dans l’ensemble, mais quelques objets ont pu changer depuis." builds={groups.previous} />
          <Section title="Anciens patchs" hint="À utiliser comme inspiration seulement : les objets et leurs effets ont pu beaucoup changer." builds={groups.older} warn />
        </>
      )}

      <p className="mt-8 flex gap-2 text-xs text-faint">
        <Info size={14} className="shrink-0" />
        Stats indicatives : objets au jet maximal, bonus de panoplie, points de caractéristiques et parchemins du build. Le style de jeu (PvM, PvP) n’est pas encore filtrable :
        Fashionista ne le fournit pas. Pas de prix affichés : aucune source fiable n’existe.
      </p>

      {compared.length === 2 && <ComparePanel a={compared[0]} b={compared[1]} onClose={() => setCompare([])} />}
    </div>
  );
}

function BuildDetail({ b }: { b: ApiBuild }) {
  return (
    <div className="flex flex-col gap-4 border-t border-line pt-3">
      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Équipement ({b.items.length})</h4>
        <ul className="flex flex-col">
          {b.items.map((it) => (
            <li key={it.id}>
              <details className="rounded-lg px-2 py-1 hover:bg-surface-2">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-sm">
                  <span className="w-20 shrink-0 truncate text-xs text-muted">{it.type}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{it.name}</span>
                  <span className="text-xs text-muted">niv. {it.level}</span>
                </summary>
                <ul className="mt-1 grid gap-0.5 pb-1 pl-[5.5rem] text-xs text-muted sm:grid-cols-2">
                  {it.effects.filter(Boolean).map((e, i) => <li key={i}>{e}</li>)}
                  {it.set && <li className="text-check">Panoplie : {it.set}</li>}
                </ul>
              </details>
            </li>
          ))}
        </ul>
        {b.missing.length > 0 && <p className="mt-1 text-xs text-check">{b.missing.length} objet(s) inconnu(s) de nos données, non comptés.</p>}
      </div>
      {b.sets.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Panoplies</h4>
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
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{g.title}</h4>
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
