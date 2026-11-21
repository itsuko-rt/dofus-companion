// Atelier: the resources a list of crafts needs. Pure functions shared by the API, the page and the tests.
export interface RecipeRow { id: number; name: string; job: string | null; level: number; ingredients: [number, number][] }
export interface AtelierLine { id: number; qty: number; done?: boolean }
export interface Need { id: number; qty: number }
export interface Expansion {
  /** what to gather, buy or loot: ingredients that are not crafted (or every ingredient without sub-crafts) */
  resources: Need[];
  /** intermediate crafts when sub-crafts are expanded (planks, alloys, potions…), with how many to make */
  intermediates: Need[];
  /** listed items that have no recipe in the game data: counted as resources themselves */
  uncraftable: number[];
}

const MAX_DEPTH = 8; // recipes in the game nest 3–4 levels; the guard also stops a malformed cycle

/**
 * Totals for the lines not marked done. With `sub`, an ingredient that has its own recipe is replaced by that recipe's
 * ingredients (recursively) and counted as an intermediate craft; without it, ingredients are taken as they are.
 */
export function expand(lines: AtelierLine[], recipes: Map<number, RecipeRow>, sub: boolean): Expansion {
  const res = new Map<number, number>(), mid = new Map<number, number>();
  const uncraftable: number[] = [];
  const addTo = (m: Map<number, number>, id: number, q: number) => m.set(id, (m.get(id) ?? 0) + q);
  const walk = (id: number, qty: number, depth: number, path: Set<number>) => {
    for (const [ing, per] of recipes.get(id)!.ingredients) {
      const need = per * qty;
      if (sub && recipes.has(ing) && depth < MAX_DEPTH && !path.has(ing)) {
        addTo(mid, ing, need);
        walk(ing, need, depth + 1, new Set(path).add(ing));
      } else addTo(res, ing, need);
    }
  };
  for (const l of lines) {
    if (l.done || !(l.qty > 0)) continue;
    if (!recipes.has(l.id)) { addTo(res, l.id, l.qty); uncraftable.push(l.id); continue; }
    walk(l.id, l.qty, 0, new Set([l.id]));
  }
  const sorted = (m: Map<number, number>) => [...m].map(([id, qty]) => ({ id, qty })).sort((a, b) => b.qty - a.qty || a.id - b.id);
  return { resources: sorted(res), intermediates: sorted(mid), uncraftable };
}

/** "8463:2,44:10" ⇄ lines; ignores malformed parts, merges duplicates, caps sizes (it comes from a URL or storage). */
export function parseLines(s: string): AtelierLine[] {
  const m = new Map<number, number>();
  for (const part of s.split(',').slice(0, 100)) {
    const [a, b] = part.split(':').map(Number);
    if (Number.isInteger(a) && a > 0 && Number.isInteger(b) && b > 0 && b <= 100000) m.set(a, Math.min(100000, (m.get(a) ?? 0) + b));
  }
  return [...m].map(([id, qty]) => ({ id, qty }));
}
export const formatLines = (lines: AtelierLine[]) => lines.filter((l) => !l.done).map((l) => `${l.id}:${l.qty}`).join(',');
