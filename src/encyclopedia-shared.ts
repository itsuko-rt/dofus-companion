// Client-safe encyclopaedia types, sheet URLs and the drop-odds maths (no server code).
import { slugify } from './site.ts';

export type EncyKind = 'item' | 'monster' | 'dungeon' | 'zone' | 'set';
export const KIND_LABEL: Record<EncyKind, string> = { item: 'Objet', monster: 'Monstre', dungeon: 'Donjon', zone: 'Zone', set: 'Panoplie' };
/** Sheet URL: /encyclopedie/monstre/31-bouftou (the id decides, the slug is for people and search engines). */
export const encyHref = (kind: EncyKind, id: number, name: string) =>
  `/encyclopedie/${({ item: 'objet', monster: 'monstre', dungeon: 'donjon', zone: 'zone', set: 'panoplie' } as const)[kind]}/${id}-${slugify(name) || 'fiche'}`;
export interface SearchEntry { kind: EncyKind; id: number; name: string; sub: string; level: number | null; href: string }

/**
 * Exact probability for independent tries: rate in % per try (one character, one monster), n tries.
 * The rate is the game's base rate unless the player enters another; prospection, challenges and bonuses change it in
 * game through rules the game files do not describe, so they are not applied here.
 */
export function dropOdds(ratePct: number, tries: number) {
  const p = Math.min(1, Math.max(0, ratePct / 100));
  const n = Math.max(0, Math.floor(tries));
  const atLeastOne = p >= 1 ? 1 : 1 - (1 - p) ** n;
  /** tries needed for a given chance of at least one drop; null when the rate is 0 */
  const triesFor = (target: number) => (p <= 0 ? null : p >= 1 ? 1 : Math.ceil(Math.log(1 - target) / Math.log(1 - p)));
  return { atLeastOne, expected: p * n, for50: triesFor(0.5), for90: triesFor(0.9), for99: triesFor(0.99) };
}
