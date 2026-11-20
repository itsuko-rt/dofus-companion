// Profession XP calculator. The game files hold no profession XP table and no XP per craft (docs/GAME_DATA_INVENTORY.md),
// so the XP numbers are the ones the game shows the player: "current / next level" on the profession panel, and the XP
// gained by one craft (or harvest). Recipes and ingredients are the game's own. Nothing is estimated.

export interface CalcInput { xpNow: number; xpNext: number; xpPerAction: number }
export interface Ingredient { id: number; name: string; qty: number }
export interface CalcResult {
  remaining: number;          // XP still needed for the next level
  actions: number;            // crafts or harvests needed (rounded up)
  progress: number;           // 0–1, share of the level already done
  resources: (Ingredient & { total: number })[];  // ingredients × actions, for the chosen recipe
}

/** Validates the player's numbers: whole, non-negative, current ≤ next, XP per action > 0. */
export function checkInput(i: CalcInput): string | null {
  for (const [k, v] of Object.entries(i)) if (!Number.isFinite(v) || !Number.isInteger(v) || v < 0) return `${LABELS[k as keyof CalcInput]} : un nombre entier positif est attendu.`;
  if (i.xpNext <= 0) return 'XP du niveau suivant : doit être supérieure à 0.';
  if (i.xpNow > i.xpNext) return "L’XP actuelle dépasse celle du niveau suivant : vérifiez les deux nombres affichés en jeu.";
  if (i.xpPerAction <= 0) return 'XP par fabrication : doit être supérieure à 0.';
  return null;
}
const LABELS: Record<keyof CalcInput, string> = { xpNow: 'XP actuelle', xpNext: 'XP du niveau suivant', xpPerAction: 'XP par fabrication' };

export function plan(i: CalcInput, ingredients: Ingredient[] = []): CalcResult {
  const remaining = i.xpNext - i.xpNow;
  const actions = Math.ceil(remaining / i.xpPerAction);
  return {
    remaining, actions, progress: i.xpNext ? i.xpNow / i.xpNext : 0,
    resources: ingredients.map((g) => ({ ...g, total: g.qty * actions })),
  };
}
