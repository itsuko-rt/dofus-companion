// Companion guide types and the step position logic (client-safe).
export interface GuideListEntry { slug: string; name: string; level: number; steps: number }
export interface GuideStep {
  id: string; kind: 'quest' | 'achievement'; name: string; level: number | null; where: string | null; href: string;
  /** community walkthrough of the quest, when the database has one (DPLN link) */
  guide: string | null;
  /** the quest's own steps and objectives as the game words them (or the achievement's objectives) */
  parts: { name: string | null; objectives: string[] }[];
}
export interface CompanionGuide { slug: string; name: string; level: number; version: string; routes: { source: string; steps: GuideStep[] }[] }

/** Position to open a guide at: the saved step if valid, else the first step not done yet, else the last one. */
export function startStep(steps: { id: string }[], saved: number | null, done: (id: string) => boolean): number {
  if (!steps.length) return 0;
  if (saved != null && Number.isInteger(saved) && saved >= 0 && saved < steps.length) return saved;
  const i = steps.findIndex((s) => !done(s.id));
  return i < 0 ? steps.length - 1 : i;
}
/** Next step after finishing the current one: the next not done, else simply the next, clamped. */
export function nextStep(steps: { id: string }[], from: number, done: (id: string) => boolean): number {
  for (let i = from + 1; i < steps.length; i++) if (!done(steps[i].id)) return i;
  return Math.min(from + 1, steps.length - 1);
}
