'use client';
// Gathering journal of one profession: the player's level (per character), the current and next tier,
// level brackets with the zones of each resource, and the recipes with where every ingredient comes from.
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Check, Lock, Map as MapIcon, Search } from 'lucide-react';
import { brackets, currentBracket, MAX_JOB_LEVEL, type IngredientSource, type JobDetails, type RecipeInfo } from '../../src/professions-shared.ts';
import { checkInput, plan } from '../../src/craft-calc.ts';
import SourceLabel from './SourceLabel';
import { jobSlug } from '../../src/professions-shared.ts';
import { useCharacter } from '../useCharacter';
import { Button, ButtonLink, Card, ProgressBar, SectionTitle } from '../ui';
import { ItemIcon } from './jobIcons';

const PAGE = 40;

export default function JobGuide({ details, recipeTotal }: { details: JobDetails; recipeTotal?: number }) {
  const { job, tiers, version } = details;
  const [recipes, setRecipes] = useState(details.recipes);
  useEffect(() => {
    if (!recipeTotal || recipeTotal <= details.recipes.length) return;
    fetch(`/api/professions/${job.slug}`).then((r) => (r.ok ? r.json() : null)).then((d: JobDetails | null) => d && setRecipes(d.recipes)).catch(() => {});
  }, [job.slug, recipeTotal, details.recipes.length]);
  const ch = useCharacter();
  const saved = ch.character.jobs[job.id];
  const [local, setLocal] = useState(1);
  const level = ch.hasCharacter ? saved ?? 1 : local;
  const setLevel = (n: number) => {
    const v = Math.min(MAX_JOB_LEVEL, Math.max(1, Math.round(n) || 1));
    if (ch.hasCharacter) ch.setJobLevel(job.id, v); else setLocal(v);
  };
  const b = useMemo(() => brackets(tiers), [tiers]);
  const pos = currentBracket(tiers, level);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <SectionTitle hint={ch.hasCharacter ? `Enregistré sur ${ch.character.name}` : 'Créez un personnage pour l’enregistrer'}>Mon niveau</SectionTitle>
        <div className="flex flex-wrap items-center gap-3">
          <input type="range" min={1} max={MAX_JOB_LEVEL} value={level} onChange={(e) => setLevel(Number(e.target.value))} aria-label={`Niveau de ${job.name}`} className="min-w-40 flex-1 accent-[var(--color-accent)]" />
          <input type="number" min={1} max={MAX_JOB_LEVEL} value={level} onChange={(e) => setLevel(Number(e.target.value))} aria-label={`Niveau de ${job.name} (nombre)`}
            className="w-20 rounded-md border border-line bg-bg px-2 py-1.5 text-center font-semibold" />
        </div>
        <ProgressBar value={level} max={MAX_JOB_LEVEL} className="mt-3" label={`${job.name} : niveau ${level} sur ${MAX_JOB_LEVEL}`} />
        {tiers.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-accent/60 bg-accent/10 p-3">
              <p className="text-xs uppercase tracking-wide text-accent">À récolter maintenant</p>
              {pos.current ? pos.current.items.map((t) => (
                <p key={t.itemId} className="mt-1 flex items-center gap-2 font-medium text-text"><ItemIcon iconId={t.iconId} size={24} /> {t.name}
                  <span className="text-xs font-normal text-muted">niv. {t.levelMin} · {t.zones.length} zone(s)</span></p>
              )) : <p className="mt-1 text-sm text-muted">Aucune ressource à ce niveau.</p>}
              <ButtonLink href="/carte" variant="primary" className="mt-3 !py-1.5 text-xs">
                <MapIcon size={14} aria-hidden /> Cartes interactives
              </ButtonLink>
            </div>
            <div className="rounded-md border border-line p-3">
              <p className="text-xs uppercase tracking-wide text-faint">Prochain palier</p>
              {pos.next ? (
                <>
                  {pos.next.items.map((t) => <p key={t.itemId} className="mt-1 flex items-center gap-2 text-text"><ItemIcon iconId={t.iconId} size={24} /> {t.name}</p>)}
                  <p className="mt-1 text-sm text-muted">au niveau {pos.next.from} (encore {pos.next.from - level} niveau{pos.next.from - level > 1 ? 'x' : ''})</p>
                  <Button className="mt-3 !py-1.5 text-xs" onClick={() => setLevel(pos.next!.from)}><Check size={14} aria-hidden /> J’ai atteint le niveau {pos.next.from}</Button>
                </>
              ) : <p className="mt-1 text-sm text-muted">Toutes les ressources sont débloquées.</p>}
            </div>
          </div>
        )}
      </Card>

      {tiers.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-base text-text">Progression par palier</h2>
          <ol className="parchment divide-y divide-line overflow-hidden rounded-md border border-[#c4a46e]">
            {b.map((br, i) => {
              const state = i < pos.index ? 'past' : i === pos.index ? 'now' : 'locked';
              return (
                <li key={br.from} className={`border-l-[3px] px-4 py-3 ${state === 'now' ? 'border-accent bg-accent/10' : state === 'past' ? 'border-done' : 'border-transparent'}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-display text-sm text-text">Niveaux {br.from}–{br.to}</p>
                    <p className="text-xs text-muted">{state === 'past' ? 'dépassé' : state === 'now' ? 'votre palier' : <><Lock size={11} className="inline" aria-hidden /> au niveau {br.from}</>}</p>
                  </div>
                  {br.items.map((t) => (
                    <div key={t.itemId} className="mt-2">
                      <p className="flex items-center gap-2 font-medium text-text"><ItemIcon iconId={t.iconId} /> {t.name}</p>
                      {t.zones.length ? (
                        <p className="mt-1 text-xs text-muted">
                          {t.zones.slice(0, 5).map((z) => `${z.name}${z.area ? ` (${z.area}, niv. ${z.level})` : ''}`).join(' · ')}
                          {t.zones.length > 5 ? ` et ${t.zones.length - 5} autres` : ''}
                        </p>
                      ) : <p className="mt-1 text-xs text-faint">Aucune zone du Monde des Douze ne la liste dans les données du jeu.</p>}
                    </div>
                  ))}
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-xs text-faint">
            Paliers et zones : données officielles du jeu {version}. L’expérience gagnée par récolte, l’affluence sur les spots et les prix ne font pas partie de ces données : ils ne sont pas affichés plutôt que devinés.
          </p>
        </section>
      )}

      <Calculator recipes={recipes} level={level} jobName={job.name} />

      {recipes.length > 0 && <Recipes recipes={recipes} total={recipeTotal ?? recipes.length} level={level} />}
    </div>
  );
}

function Recipes({ recipes, total, level }: { recipes: RecipeInfo[]; total: number; level: number }) {
  const [q, setQ] = useState('');
  const [mine, setMine] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const shown = recipes.filter((r) => (!mine || r.level <= level) && (!q || r.name.toLowerCase().includes(q.toLowerCase())));
  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-base text-text">Recettes ({total})</h2>
        <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={mine} onChange={(e) => { setMine(e.target.checked); setLimit(PAGE); }} className="accent-[var(--color-brand)]" /> Jusqu’à mon niveau ({level})</label>
      </div>
      <label className="relative mb-3 block">
        <Search size={15} className="pointer-events-none absolute left-2.5 top-2.5 text-faint" aria-hidden />
        <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="Rechercher une recette…" className="w-full rounded-md border border-line bg-surface py-2 pl-8 pr-3 text-sm" />
      </label>
      <ul className="parchment divide-y divide-line overflow-hidden rounded-md border border-[#c4a46e]">
        {shown.slice(0, limit).map((r) => (
          <li key={r.resultId} className={`px-4 py-3 ${r.level > level ? 'opacity-70' : ''}`}>
            <p className="font-medium text-text">{r.name} <span className="text-xs font-normal text-muted">niv. {r.level}{r.level > level ? ' · pas encore accessible' : ''}</span></p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {r.ingredients.map((g) => (
                <li key={g.id} className="rounded-sm border border-line bg-surface-2/60 px-2 py-0.5 text-xs">
                  <span className="text-text">{g.qty} × {g.name}</span>{' '}
                  <SourceLabel source={g.source} />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="mt-2 text-sm text-muted">Aucune recette ne correspond.</p>}
      {limit < shown.length && <Button className="mt-3 w-full" onClick={() => setLimit((n) => n + PAGE)}>Afficher les {Math.min(PAGE, shown.length - limit)} suivantes ({shown.length - limit} restantes)</Button>}
      <p className="mt-2 text-xs text-faint">« Butin » : ni récolté ni fabriqué ; jusqu’à 3 monstres qui le lâchent, avec leur chance de base avant prospection (données du jeu). « Butin ou achat » : aucun monstre ne le lâche dans les données (boutique, quête…). L’expérience de fabrication et le coût n’y figurent pas.</p>
    </section>
  );
}

/** XP calculator: the XP numbers come from the game's own display (no XP table in the game files), the recipe from the game data. */
function Calculator({ recipes, level, jobName }: { recipes: RecipeInfo[]; level: number; jobName: string }) {
  const [xp, setXp] = useState({ xpNow: '', xpNext: '', xpPerAction: '' });
  const [recipeId, setRecipeId] = useState<number | ''>('');
  const usable = useMemo(() => recipes.filter((r) => r.level <= level).sort((a, b) => b.level - a.level || a.name.localeCompare(b.name, 'fr')), [recipes, level]);
  const recipe = usable.find((r) => r.resultId === recipeId);
  const filled = xp.xpNow !== '' && xp.xpNext !== '' && xp.xpPerAction !== '';
  const input = { xpNow: Number(xp.xpNow), xpNext: Number(xp.xpNext), xpPerAction: Number(xp.xpPerAction) };
  const error = filled ? checkInput(input) : null;
  const result = filled && !error ? plan(input, recipe?.ingredients ?? []) : null;
  const field = 'mt-1 block w-full rounded-md border border-line bg-bg px-2 py-1.5 text-text';
  const num = (k: keyof typeof xp, label: string, hint: string) => (
    <label className="text-sm text-muted">{label}
      <input inputMode="numeric" value={xp[k]} onChange={(e) => setXp({ ...xp, [k]: e.target.value.replace(/[^0-9]/g, '') })} className={field} aria-describedby={`calc-${k}`} />
      <span id={`calc-${k}`} className="mt-0.5 block text-[11px] text-faint">{hint}</span>
    </label>
  );
  const sourceById = new Map(recipe?.ingredients.map((g) => [g.id, g.source]) ?? []);
  return (
    <Card>
      <SectionTitle hint="Les nombres viennent de votre écran de jeu">Calculateur d’XP · {jobName}</SectionTitle>
      <p className="mb-3 text-xs text-faint">Les fichiers du jeu ne contiennent ni la table d’XP des métiers ni l’XP gagnée par fabrication : saisissez ce que le jeu affiche (fenêtre du métier, et le gain après une fabrication ou une récolte).</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {num('xpNow', 'XP actuelle', 'Premier nombre de la barre d’XP du métier')}
        {num('xpNext', 'XP du niveau suivant', 'Second nombre de la même barre')}
        {num('xpPerAction', 'XP par fabrication', 'Gain affiché après une fabrication ou une récolte')}
      </div>
      <label className="mt-3 block text-sm text-muted">Recette (facultatif, jusqu’à votre niveau {level})
        <select value={recipeId} onChange={(e) => setRecipeId(e.target.value ? Number(e.target.value) : '')} className={field}>
          <option value="">Aucune : compter seulement les fabrications ou récoltes</option>
          {usable.map((r) => <option key={r.resultId} value={r.resultId}>{r.name} (niv. {r.level})</option>)}
        </select>
      </label>
      {error && <p role="alert" className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
      {result && (
        <div className="appear mt-4" aria-live="polite">
          <ProgressBar value={input.xpNow} max={input.xpNext} label={`Niveau en cours : ${Math.round(result.progress * 100)} %`} />
          <p className="mt-2 text-sm text-text">
            Il reste <b>{result.remaining.toLocaleString('fr-FR')} XP</b> : <b>{result.actions.toLocaleString('fr-FR')}</b> {recipe ? `fabrication${result.actions > 1 ? 's' : ''} de ${recipe.name}` : `action${result.actions > 1 ? 's' : ''}`} pour passer au niveau suivant.
          </p>
          {result.resources.length > 0 && (
            <>
              <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Ressources à réunir</h3>
              <ul className="mt-1 flex flex-col divide-y divide-line text-sm">
                {result.resources.map((g) => (
                  <li key={g.id} className="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
                    <span className="text-text"><b>{g.total.toLocaleString('fr-FR')}</b> × {g.name} <span className="text-xs text-faint">({g.qty} par fabrication)</span></span>
                    <span className="text-xs">{sourceById.get(g.id) && <SourceLabel source={sourceById.get(g.id)!} />}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-2 text-[11px] text-faint">Valable jusqu’au niveau suivant seulement : l’XP par fabrication change avec le niveau, et la table d’XP n’est pas dans les données du jeu.</p>
        </div>
      )}
    </Card>
  );
}
