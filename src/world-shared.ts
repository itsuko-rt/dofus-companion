import { slugify } from './site.ts';
// Types and pure helpers of the world map and professions, shared by the server loaders (src/world.ts),
// the browser components and the tests. No database access here.
// ---------------------------------------------------------------- types sent to the browser
export interface WorldZone {
  id: number; name: string; area: string | null; level: number;
  cx: number; cy: number; zaap: [number, number] | null;
  /** gathered resources only (item ids a profession harvests), never event boxes or quest items */
  resources: number[];
  monsters: number[];
}
export interface WorldMarker { id: number; category: string; categoryId: number; name: string; x: number; y: number; zone: number | null }
export interface WorldResource { id: number; name: string; iconId: number | null; jobId: number; levelMin: number }
export interface WorldMonster { id: number; name: string; levelMin: number | null; levelMax: number | null }
export interface WorldNpc { name: string; zone: number; quest: { id: number; name: string; category: number } }
export interface WorldData {
  version: string; retrievedAt: string | null; source: string | null;
  map: { id: number; name: string }; maps: { id: number; name: string; cells: number }[];
  /** [x, y, zoneId] per map coordinate */
  cells: [number, number, number][];
  zones: WorldZone[]; markers: WorldMarker[];
  zaaps: { x: number; y: number; zone: number }[];
  resources: WorldResource[]; monsters: WorldMonster[]; jobs: { id: number; name: string; kind: JobKind; slug: string }[];
  npcs: WorldNpc[];
}
export const jobSlug = (name: string) => slugify(name);
export type JobKind = 'gathering' | 'crafting' | 'forgemagus' | 'other';

export interface JobSummary { id: number; name: string; kind: JobKind; slug: string; iconId: number | null; resources: number; recipes: number }
export interface GatherTier { itemId: number; name: string; iconId: number | null; levelMin: number; zones: { id: number; name: string; area: string | null; level: number; zaap: [number, number] | null }[] }
export interface RecipeInfo {
  resultId: number; name: string; iconId: number | null; level: number;
  ingredients: { id: number; name: string; iconId: number | null; qty: number; source: IngredientSource }[];
}
/** Where an ingredient comes from, as far as the game data tells: harvested, crafted, or neither (loot, shop…). */
export type IngredientSource = { kind: 'gathered'; jobId: number; jobName: string; levelMin: number } | { kind: 'crafted'; jobId: number; jobName: string; level: number } | { kind: 'other' };
export interface JobDetails { job: JobSummary; tiers: GatherTier[]; recipes: RecipeInfo[]; version: string }

// ---------------------------------------------------------------- pure helpers (tested)
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

export type Point = { x: number; y: number };
/**
 * Lower bound of maps to cross between two map coordinates: one map per step, four directions.
 * shortcut: ignores water, walls and zone exits (not in the data); shown to players as an estimate.
 */
export const mapSteps = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/**
 * Visit order for gathering stops: nearest neighbour from the start, then 2-opt until no swap helps.
 * With `zaaps`, a leg may start at the zaap nearest to the destination when that is shorter (zaap trip = 0 maps).
 */
export function orderStops<T extends Point>(stops: T[], start: Point | null = null, zaaps: Point[] = []): { order: T[]; legs: { from: Point; to: T; steps: number; zaap: Point | null }[]; total: number } {
  if (!stops.length) return { order: [], legs: [], total: 0 };
  const leg = (from: Point, to: Point) => {
    const walk = mapSteps(from, to);
    let best: { steps: number; zaap: Point | null } = { steps: walk, zaap: null };
    for (const z of zaaps) { const s = mapSteps(z, to); if (s < best.steps) best = { steps: s, zaap: z }; }
    return best;
  };
  const rest = [...stops];
  const order: T[] = [];
  let at: Point | null = start;
  if (!at) { order.push(rest.shift()!); at = order[0]; }
  while (rest.length) {
    let bi = 0;
    for (let i = 1; i < rest.length; i++) if (leg(at!, rest[i]).steps < leg(at!, rest[bi]).steps) bi = i;
    at = rest[bi];
    order.push(rest.splice(bi, 1)[0]);
  }
  const cost = (o: T[]) => o.reduce((s, p, i) => s + (i === 0 ? (start ? leg(start, p).steps : 0) : leg(o[i - 1], p).steps), 0);
  let improved = true;
  while (improved && order.length > 3) {
    improved = false;
    for (let i = start ? 0 : 1; i < order.length - 1; i++) for (let k = i + 1; k < order.length; k++) {
      const cand = [...order.slice(0, i), ...order.slice(i, k + 1).reverse(), ...order.slice(k + 1)];
      if (cost(cand) < cost(order)) { order.splice(0, order.length, ...cand); improved = true; }
    }
  }
  const legs = order.flatMap((p, i) => {
    const from = i === 0 ? start : order[i - 1];
    if (!from) return [];
    const l = leg(from, p);
    return [{ from, to: p, steps: l.steps, zaap: l.zaap }];
  });
  return { order, legs, total: legs.reduce((s, l) => s + l.steps, 0) };
}

/** Outline of a set of map cells as one SVG path (unit squares; inner edges between same-zone cells skipped). */
export function cellsOutline(cells: [number, number][]): string {
  const has = new Set(cells.map(([x, y]) => `${x},${y}`));
  const d: string[] = [];
  for (const [x, y] of cells) {
    if (!has.has(`${x},${y - 1}`)) d.push(`M${x} ${y}h1`);
    if (!has.has(`${x + 1},${y}`)) d.push(`M${x + 1} ${y}v1`);
    if (!has.has(`${x},${y + 1}`)) d.push(`M${x} ${y + 1}h1`);
    if (!has.has(`${x - 1},${y}`)) d.push(`M${x} ${y}v1`);
  }
  return d.join('');
}
