// Atelier on the server: recipes from the game database (loaded once per file), names and sources for the totals.
import { withDb } from './load.ts';
import { itemSources } from './professions.ts';
import { encyHref } from './encyclopedia.ts';
import { expand, type AtelierLine, type RecipeRow } from './atelier-shared.ts';
import type { IngredientSource } from './professions-shared.ts';

export * from './atelier-shared.ts';

const recipeCache = new Map<string, Map<number, RecipeRow>>();
function recipes(db: import('node:sqlite').DatabaseSync, path: string) {
  let m = recipeCache.get(path);
  if (m) return m;
  m = new Map();
  // an item with several recipes (rare) keeps the lowest-level one, like the item sheet
  for (const r of db.prepare('SELECT r.result_id id, i.name, j.name job, r.level, r.ingredients FROM recipe r LEFT JOIN item i ON i.id = r.result_id LEFT JOIN job j ON j.id = r.job_id ORDER BY r.level DESC').all() as Record<string, any>[]) {
    m.set(r.id, { id: r.id, name: r.name, job: r.job, level: r.level, ingredients: JSON.parse(r.ingredients) });
  }
  recipeCache.set(path, m);
  return m;
}

export interface AtelierItem { id: number; name: string; href: string; craftable: boolean; job: string | null; level: number | null }
export interface AtelierNeed { id: number; name: string; href: string; qty: number; source: IngredientSource }
export interface AtelierResult { items: AtelierItem[]; resources: AtelierNeed[]; intermediates: AtelierNeed[] }

export const computeAtelier = (path: string, lines: AtelierLine[], sub: boolean) => withDb(path, (db): AtelierResult => {
  const rec = recipes(db, path);
  const x = expand(lines, rec, sub);
  const ids = [...new Set([...lines.map((l) => l.id), ...x.resources.map((r) => r.id), ...x.intermediates.map((r) => r.id)])];
  const names = new Map(ids.length ? (db.prepare(`SELECT id, name FROM item WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids) as { id: number; name: string }[]).map((r) => [r.id, r.name]) : []);
  const name = (id: number) => names.get(id) ?? `Objet n°${id}`;
  const source = itemSources(db);
  const need = (n: { id: number; qty: number }): AtelierNeed => ({ id: n.id, name: name(n.id), href: encyHref('item', n.id, name(n.id)), qty: n.qty, source: source(n.id) });
  return {
    items: lines.map((l) => { const r = rec.get(l.id); return { id: l.id, name: name(l.id), href: encyHref('item', l.id, name(l.id)), craftable: !!r, job: r?.job ?? null, level: r?.level ?? null }; }),
    resources: x.resources.map(need),
    intermediates: x.intermediates.map(need),
  };
});
