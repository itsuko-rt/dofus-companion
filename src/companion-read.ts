// Evidence rules of the Windows companion (knowledge: Game Companion Design §4): which readings of a captured list
// may become completion events. Pure, shared with tests; the companion's OCR feeds it (companion/read.mjs).
import { isCertain, isLikely, matchLines, normalize, type Catalog, type OcrLine } from './recognize.ts';

/** What the player says the captured list is. Only these lists can prove a completion. */
export const LISTS = {
  'quests-done': { kind: 'quest', type: 'quest.completed', label: 'Quêtes terminées', sign: /termin/i },
  'achievements-done': { kind: 'achievement', type: 'achievement.completed', label: 'Succès obtenus', sign: /succ[eè]s|obtenu/i },
} as const;
export type ListKind = keyof typeof LISTS;

export interface Reading { type: string; objectId: string; name: string; certain: boolean; confidence: number; text: string; heading?: boolean }
/** The matcher's catalogs, and the game's heading and place names (normalised) when known. */
export type Catalogs = Record<'quest' | 'achievement', Catalog> & { headings?: Set<string> };
export const headingSet = (names: string[]) => new Set(names.map(normalize));

/**
 * - only a list the player declared as finished quests or obtained achievements can prove a completion;
 * - `certain` = the scanner's isCertain rule (exact, unshared name, OCR ≥ 55 %); `likely` ones wait for a confirmation;
 * - a name shared by two objects of the list's kind gives nothing: picking one of them would be a guess;
 * - a name that is also a category, area or subarea name is never certain: that heading may be what was read
 *   (« Landes de Cania », « Prison de Madrestam »…). Without the heading list, nothing is certain;
 * - names not read, or read too loosely, give nothing: absence never proves anything.
 */
export function completions(lines: OcrLine[], catalogs: Catalogs, list: string): { readings: Reading[]; signSeen: boolean } {
  if (!(list in LISTS)) return { readings: [], signSeen: false };
  const spec = LISTS[list as ListKind];
  const signSeen = lines.some((l) => spec.sign.test(l.text));
  const readings = matchLines(lines, catalogs[spec.kind]).flatMap((m): Reading[] => {
    const heading = !catalogs.headings || catalogs.headings.has(normalize(m.name));
    const exact = isCertain(m);
    if (!exact && !isLikely(m)) return [];
    return [{ type: spec.type, objectId: m.id, name: m.name, certain: exact && !heading, confidence: Math.round(m.confidence * 100) / 100, text: m.read, ...(heading ? { heading: true } : {}) }];
  });
  return { readings, signSeen };
}
