// Achievement progress from objectives. An objective counts as met when the player ticked it
// (obj:<id>) or when its official condition is provably true for the character (inferred).
// An achievement is only "obtained" once the player confirms it (ach:<id> in done).
import { evaluate, parse, type Crit, type Progress } from './criteria.ts';

export type ObjectiveState = 'confirmed' | 'inferred' | 'todo' | 'unknown';
export type AchievementState = 'obtained' | 'ready' | 'in_progress' | 'not_started';
/** achievement id → its objectives as [objective id, official condition] */
export type ObjectiveIndex = Record<number, [number, string][]>;

const parsed = new Map<string, Crit | null>();
function crit(src: string): Crit | null {
  if (!parsed.has(src)) { try { parsed.set(src, parse(src)); } catch { parsed.set(src, null); } }
  return parsed.get(src)!;
}

export function objectiveState(id: number, criterion: string, p: Progress): ObjectiveState {
  if (p.done.has(`obj:${id}`)) return 'confirmed';
  const c = criterion ? crit(criterion) : null;
  if (!c) return 'unknown'; // no or unreadable condition: only the player can tell
  const r = evaluate(c, p);
  return r === true ? 'inferred' : r === false ? 'todo' : 'unknown';
}

export interface AchievementProgress { state: AchievementState; met: number; total: number; objectives: ObjectiveState[] }

export function achievementProgress(achId: number, objectives: [number, string][], p: Progress): AchievementProgress {
  const states = objectives.map(([id, c]) => objectiveState(id, c, p));
  const met = states.filter((s) => s === 'confirmed' || s === 'inferred').length;
  const state: AchievementState = p.done.has(`ach:${achId}`) ? 'obtained'
    : states.length > 0 && met === states.length ? 'ready'
    : met > 0 ? 'in_progress' : 'not_started';
  return { state, met, total: states.length, objectives: states };
}

export const ACHIEVEMENT_STATE: Record<AchievementState, string> = {
  obtained: 'Obtenu',
  ready: 'Objectifs remplis : à confirmer',
  in_progress: 'En cours',
  not_started: 'Non commencé',
};
