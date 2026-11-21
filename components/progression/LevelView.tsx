'use client';
// "Que faire à mon niveau": the game's suggestions near the character's level, the zones whose monsters match it
// (base XP per monster, unconditional drops, harvestable resources) and dungeons. Game values only: no prices, no XP/hour.
import { useEffect, useMemo, useState } from 'react';
import { Gauge } from 'lucide-react';
import Link from 'next/link';
import { forLevel, type ZoneData } from '../../src/zones-shared.ts';
import { encyHref } from '../../src/encyclopedia-shared.ts';
import { useCharacter } from '../useCharacter';
import { Card, EmptyState, PageHero, SECTION, SectionTitle } from '../ui';

let cache: Promise<ZoneData> | null = null;
const fetchZones = () => (cache ??= fetch('/api/zones').then(async (r) => {
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? r.statusText);
  return r.json() as Promise<ZoneData>;
}).catch((e) => { cache = null; throw e; }));

const BANDS = [5, 10, 20];
const CATEGORY_ORDER = ['Donjon', 'Quête', 'Archimonstre', 'Recherché', 'Découverte', 'Événement', 'Autres'];
const n = (x: number) => x.toLocaleString('fr-FR');
const pct = (x: number) => `${x.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`;

export default function LevelView() {
  const ch = useCharacter();
  const [data, setData] = useState<ZoneData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [own, setOwn] = useState<number | null>(null);
  const [band, setBand] = useState(10);
  useEffect(() => {
    fetchZones().then(setData, (e: Error) => setError(e.message));
    // ?niveau=N: opened from another page (an achievement's monster, zone or dungeon) at that level
    const asked = Math.round(Number(new URLSearchParams(location.search).get('niveau')));
    if (asked >= 1 && asked <= 200) setOwn(asked);
  }, []);
  const level = own ?? ch.character.level;
  const r = useMemo(() => (data ? forLevel(data, level, band) : null), [data, level, band]);

  return (
    <div className="h-full overflow-y-auto">
      <PageHero color={SECTION.quests} kicker="Progression" title={<span className="inline-flex items-center gap-3"><Gauge size={26} aria-hidden /> Que faire à mon niveau</span>}>
        <div className="flex flex-wrap items-end gap-3 text-sm text-white/85">
          <label>Niveau
            <input type="number" min={1} max={200} value={level} onChange={(e) => setOwn(Math.min(200, Math.max(1, Math.round(Number(e.target.value)) || 1)))}
              className="ml-2 w-20 rounded-md border border-line bg-bg px-2 py-1 text-text" />
          </label>
          <label>Écart
            <select value={band} onChange={(e) => setBand(Number(e.target.value))} className="ml-2 rounded-md border border-line bg-bg px-2 py-1 text-text">
              {BANDS.map((b) => <option key={b} value={b}>± {b} niveaux</option>)}
            </select>
          </label>
          <span className="text-xs text-white/70">{ch.hasCharacter && own == null ? `Niveau de ${ch.character.name}` : 'Données du jeu ' + (data?.version ?? '')}</span>
        </div>
      </PageHero>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6">
        {error && <p role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">Impossible de charger les données : {error}</p>}
        {!error && !r && <p className="text-sm text-muted">Chargement…</p>}
        {r && (
          <div className="appear flex flex-col gap-6">
            <section aria-labelledby="sugg">
              <h2 id="sugg" className="mb-1 font-display text-lg text-text">Suggestions du jeu</h2>
              <p className="mb-3 text-xs text-faint">Les activités que le jeu lui-même propose autour du niveau {level} (fichier des suggestions d’activités). Le lieu affiché est celui que le jeu associe à la suggestion (parfois un panneau d’avis de recherche plutôt que le territoire du monstre).</p>
              {r.byCategory.size === 0 ? <EmptyState title="Aucune suggestion à ce niveau">Élargissez l’écart.</EmptyState> : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {CATEGORY_ORDER.filter((c) => r.byCategory.has(c)).map((c) => (
                    <Card key={c}>
                      <SectionTitle hint={`${r.byCategory.get(c)!.length}`}>{c}</SectionTitle>
                      <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto text-sm">
                        {r.byCategory.get(c)!.map((a) => (
                          <li key={a.id}>
                            <span className="text-text">{a.name}</span> <span className="text-xs text-muted">niv. {a.level}{a.zone ? ` · ${a.zone}` : ''}</span>
                            {a.description && !a.zone && <span className="block text-xs text-faint">{a.description}</span>}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="zones">
              <h2 id="zones" className="mb-1 font-display text-lg text-text">Zones et monstres de votre niveau</h2>
              <p className="mb-3 text-xs text-faint">
                Zones du Monde des Douze où vivent le plus de monstres de niveau {Math.max(1, level - band)}–{Math.min(200, level + band)}. Sans les archimonstres, monstres de quête (dont Pwâk), cibles d’avis de recherche, Dopeuls et invocations, qui ne peuplent pas la zone au quotidien.
                XP : valeur de base d’un monstre dans les données du jeu, avant sagesse, taille du groupe et bonus (« non renseignée » quand le fichier n’en donne pas).
                Butin : chance de base avant prospection, sans les butins sous condition (évènements, quêtes). Aucun prix : il n’est pas dans les données.
              </p>
              {r.zones.length === 0 ? <EmptyState title="Aucune zone à ce niveau">Élargissez l’écart.</EmptyState> : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {r.zones.map((z) => (
                    <Card key={z.id}>
                      <SectionTitle hint={z.area ?? undefined}><Link href={encyHref('zone', z.id, z.name)} className="hover:text-accent hover:underline">{z.name}</Link></SectionTitle>
                      <ul className="flex flex-col gap-0.5 text-sm">
                        {z.monsters.slice(0, 8).map((m) => (
                          <li key={m.id} className="flex justify-between gap-2">
                            <span className="truncate text-text"><Link href={encyHref('monster', m.id, m.name)} className="hover:text-accent hover:underline">{m.name}</Link> <span className="text-xs text-muted">niv. {m.lmin === m.lmax ? m.lmin : `${m.lmin}–${m.lmax}`}</span></span>
                            <span className="shrink-0 text-xs text-muted">{m.xpMin == null || m.xpMax == null ? 'XP non renseignée' : `${m.xpMin === m.xpMax ? n(m.xpMax) : `${n(m.xpMin)}–${n(m.xpMax)}`} XP`}</span>
                          </li>
                        ))}
                        {z.monsters.length > 8 && <li className="text-xs text-faint">et {z.monsters.length - 8} autres</li>}
                      </ul>
                      {z.loot.length > 0 && <p className="mt-2 text-xs text-muted"><span className="font-semibold text-text">Butin :</span> {z.loot.map((l) => `${l.item} (${l.min === l.max ? pct(l.max) : `${pct(l.min)}–${pct(l.max)}`}${l.uses ? `, ${l.uses} recette${l.uses > 1 ? 's' : ''}` : ''})`).join(', ')}</p>}
                      {z.harvest.length > 0 && <p className="mt-1 text-xs text-muted"><span className="font-semibold text-text">Récoltes :</span> {z.harvest.join(', ')}</p>}
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {r.wanted.length > 0 && (
              <section aria-labelledby="wanted">
                <h2 id="wanted" className="mb-1 font-display text-lg text-text">Ressources les plus utilisées par les artisans</h2>
                <p className="mb-3 text-xs text-faint">Butins des monstres de ces zones, classés par nombre de recettes du jeu qui les demandent : une indication de demande, pas un prix (aucun prix n’est dans les données du jeu).</p>
                <ul className="grid gap-2 text-sm sm:grid-cols-2">
                  {r.wanted.map((w) => (
                    <li key={w.item} className="rounded-md border border-line bg-surface px-3 py-2">
                      <span className="text-text">{w.item}</span> <span className="text-xs text-accent">· {n(w.uses)} recette{w.uses > 1 ? 's' : ''}</span>
                      <span className="block text-xs text-muted">jusqu’à {pct(w.max)} · {w.zones.slice(0, 3).join(', ')}{w.zones.length > 3 ? '…' : ''}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="donjons">
              <h2 id="donjons" className="mb-1 font-display text-lg text-text">Donjons de votre niveau</h2>
              <p className="mb-3 text-xs text-faint">Niveau minimum et niveau conseillé tels que le jeu les définit.</p>
              {r.dungeons.length === 0 ? <EmptyState title="Aucun donjon à ce niveau" /> : (
                <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  {r.dungeons.map((d) => (
                    <li key={d.id} className="rounded-md border border-line bg-surface px-3 py-2">
                      <Link href={encyHref('dungeon', d.id, d.name)} className="text-text hover:text-accent hover:underline">{d.name}</Link>
                      <span className="block text-xs text-muted">niv. min. {d.minLevel} · conseillé {d.optimalLevel}{d.bosses.length ? ` · ${d.bosses.join(', ')}` : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <p className="text-xs text-faint">La classe du personnage ne change pas ces listes : les fichiers du jeu ne relient pas ces activités à une classe.</p>
          </div>
        )}
      </div>
    </div>
  );
}
