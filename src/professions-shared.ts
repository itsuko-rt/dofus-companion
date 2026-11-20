import { slugify } from './site.ts';
// Types and pure helpers of the professions guide, shared by the server loader (src/professions.ts),
// the browser components and the tests. No database access here.
export const jobSlug = (name: string) => slugify(name);
export type JobKind = 'gathering' | 'crafting' | 'forgemagus' | 'other';

export interface JobSummary { id: number; name: string; kind: JobKind; slug: string; iconId: number | null; resources: number; recipes: number }
export interface GatherTier { itemId: number; name: string; iconId: number | null; levelMin: number; zones: { id: number; name: string; area: string | null; level: number; zaap: [number, number] | null }[] }
export interface RecipeInfo {
  resultId: number; name: string; iconId: number | null; level: number;
  ingredients: { id: number; name: string; iconId: number | null; qty: number; source: IngredientSource }[];
}
/** Where an ingredient comes from, as far as the game data tells: harvested, crafted, or neither (loot, shop…). */
export type IngredientSource = { kind: 'gathered'; jobId: number; jobName: string; levelMin: number } | { kind: 'crafted'; jobId: number; jobName: string; level: number } | { kind: 'other'; drops: DropSource[] };
/** A monster that drops the item: chance in % before prospection (lowest and highest grade), conditional = the game sets a drop condition. */
export interface DropSource { monster: string; min: number; max: number; conditional: boolean }
export interface JobDetails { job: JobSummary; tiers: GatherTier[]; recipes: RecipeInfo[]; version: string }


export const MAX_JOB_LEVEL = 200;

/** Tiers as level brackets: each resource is the newest one from its unlock level until the next unlock. */
export function brackets<T extends { levelMin: number }>(tiers: T[]): { from: number; to: number; items: T[] }[] {
  const levels = [...new Set(tiers.map((t) => t.levelMin))].sort((a, b) => a - b);
  return levels.map((lv, i) => ({ from: lv, to: (levels[i + 1] ?? MAX_JOB_LEVEL + 1) - 1, items: tiers.filter((t) => t.levelMin === lv) }));
}

/** Index of the bracket a profession level falls in, and the next unlock (null at the top). */
export function currentBracket<T extends { levelMin: number }>(tiers: T[], level: number) {
  const b = brackets(tiers);
  const i = b.findLastIndex((x) => x.from <= level);
  return { index: i, current: b[i] ?? null, next: b[i + 1] ?? null };
}


/** True when every ingredient can be harvested or crafted with the character's own profession levels (jobId → level).
 *  Loot and shop items ('other') never qualify: the game data cannot say the character owns them. */
export const selfSufficient = (r: RecipeInfo, jobs: Record<string, number>) => r.ingredients.every((g) =>
  g.source.kind === 'gathered' ? (jobs[g.source.jobId] ?? 0) >= g.source.levelMin
    : g.source.kind === 'crafted' ? (jobs[g.source.jobId] ?? 0) >= g.source.level : false);
