// Build statistics: plain addition of real item, set, characteristic and scroll values.
// Indicative totals ("jets maximaux"), not a reimplementation of the game's combat formulas.
import type { Element } from './spells.ts';

export interface ItemEffect { actionId: number; min: number; max: number; text: string | null; characteristic: number | null; sign: number }
export interface Item { id: number; name: string; typeId: number; typeName: string | null; level: number; setId: number | null; effects: ItemEffect[] }
export interface ItemSet { id: number; name: string; itemIds: number[]; bonuses: ItemEffect[][] }

/** The `fashionista-build` v1 format (dofusfashionista.gg/api/v1/import/schema/1/). */
export interface FashionistaBuild {
  level: number | null;
  items: (number | { id: number; type?: 'item' | 'mount' })[];
  characteristics?: Partial<Record<MainStat, number>>;
  scrolls?: Partial<Record<MainStat, number>>;
  exos?: { ap?: boolean; mp?: boolean; range?: boolean };
}

export type MainStat = 'vitality' | 'wisdom' | 'strength' | 'intelligence' | 'chance' | 'agility';
const MAIN_STATS: MainStat[] = ['vitality', 'wisdom', 'strength', 'intelligence', 'chance', 'agility'];
const ELEMENT_OF: Partial<Record<MainStat, Element>> = { strength: 'Terre', intelligence: 'Feu', chance: 'Eau', agility: 'Air' };

/** Meta effects with no stat value (tradability, emote, account binding…), hidden on item cards. */
export const isMetaEffect = (e: ItemEffect) => !e.text || /^(Échangeable|Attitude|Effet non documenté)/.test(e.text);

export interface BuildStats {
  totals: Record<string, number>; // characteristic keyword → value
  sets: { set: ItemSet; pieces: number; bonus: ItemEffect[] }[];
  items: Item[];
  missing: number[]; // item ids not found in our data
  elements: Element[];
}

export function computeBuild(b: FashionistaBuild, items: Map<number, Item>, sets: Map<number, ItemSet>, keywordOf: Map<number, string>): BuildStats {
  const totals: Record<string, number> = {};
  const add = (k: string, v: number) => { totals[k] = (totals[k] ?? 0) + v; };
  const addEffects = (effects: ItemEffect[]) => {
    for (const e of effects) {
      const k = e.characteristic != null ? keywordOf.get(e.characteristic) : undefined;
      if (k) add(k, e.sign * e.max);
    }
  };

  // Base character: 6 AP, +1 at level 100; 3 MP (game rules, not item data)
  add('actionPoints', (b.level ?? 1) >= 100 ? 7 : 6);
  add('movementPoints', 3);
  for (const s of MAIN_STATS) add(s, (b.characteristics?.[s] ?? 0) + (b.scrolls?.[s] ?? 0));
  if (b.exos?.ap) add('actionPoints', 1);
  if (b.exos?.mp) add('movementPoints', 1);
  if (b.exos?.range) add('range', 1);

  const worn: Item[] = [];
  const missing: number[] = [];
  // shortcut: mounts ({type: 'mount'}) are skipped, their stats are not in the item data
  for (const raw of b.items) {
    if (typeof raw === 'object' && raw.type === 'mount') continue;
    const id = typeof raw === 'number' ? raw : raw.id;
    const it = items.get(id);
    if (!it) { missing.push(id); continue; }
    worn.push(it);
    addEffects(it.effects);
  }

  const pieces = new Map<number, Set<number>>();
  for (const it of worn) if (it.setId) pieces.set(it.setId, (pieces.get(it.setId) ?? new Set()).add(it.id));
  const activeSets: BuildStats['sets'] = [];
  for (const [setId, ids] of pieces) {
    const set = sets.get(setId);
    if (!set) continue;
    const bonus = set.bonuses[ids.size - 1] ?? []; // bonuses[n-1] = bonus for n pieces worn
    if (bonus.length) addEffects(bonus);
    activeSets.push({ set, pieces: ids.size, bonus });
  }

  // Element(s): main damage characteristics within 70 % of the highest one. Scrolls are left out:
  // they usually add the same 100 to every characteristic and would hide the build's real focus.
  const scored = (Object.keys(ELEMENT_OF) as MainStat[])
    .map((s) => [s, (totals[s] ?? 0) - (b.scrolls?.[s] ?? 0)] as const).sort((a, b) => b[1] - a[1]);
  const top = scored[0][1];
  const elements = top > 0 ? scored.filter(([, v]) => v >= top * 0.7).map(([s]) => ELEMENT_OF[s]!) : [];

  return { totals, sets: activeSets, items: worn, missing, elements };
}
