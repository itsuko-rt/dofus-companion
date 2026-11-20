// Which quests depend on the character's class, read from the class condition (PG=<breed id>) of their start criterion.
// exclusive: every PG in the condition names the same class (e.g. the Astrub class quest, "Dévotion à …");
// per-class: the condition has one branch per class (e.g. "Ça sent le gaz"): open to every class through its own branch.
// A quest without PG is general: never hidden because of the class.
import { atoms, type Crit } from './criteria.ts';
import type { GNode, Graph } from './graph.ts';

export type ClassScope = { kind: 'exclusive'; breed: number } | { kind: 'per-class'; breeds: number[] } | null;

export function classScope(crit: Crit): ClassScope {
  const breeds = [...new Set(atoms(crit).filter((a) => a.code === 'PG' && a.op === '=').map((a) => Number(a.value)))];
  if (!breeds.length) return null;
  return breeds.length === 1 ? { kind: 'exclusive', breed: breeds[0] } : { kind: 'per-class', breeds };
}

/** True only for a quest reserved to another class than the character's (unknown class: nothing is reserved). */
export const reservedToOtherClass = (n: GNode, breed: number | undefined) => {
  const s = classScope(n.crit);
  return breed != null && s?.kind === 'exclusive' && s.breed !== breed;
};

/** The character's class quests, by level: exclusive ones and the class's branch of per-class quests. */
export function classQuests(g: Graph, breed: number): GNode[] {
  return [...g.nodes.values()].filter((n) => {
    if (n.kind !== 'quest') return false;
    const s = classScope(n.crit);
    return s?.kind === 'exclusive' ? s.breed === breed : s?.kind === 'per-class' ? s.breeds.includes(breed) : false;
  }).sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.label.localeCompare(b.label, 'fr'));
}

/** Achievements tied to the class by the data: objectives (or conditions) that need one of its class quests.
 *  "named": achievements named after the class ("Dopeul Iop", "Challenge Iop"): related, not restricted to it. */
export function classAchievements(g: Graph, objectives: Record<number, [number, string][]>, breed: number, breedName: string):
  { linked: GNode[]; named: GNode[] } {
  const quests = new Set(classQuests(g, breed).map((n) => n.refId));
  const needsClassQuest = (c: string) => [...c.matchAll(/Q[fa]=(\d+)/g)].some((m) => quests.has(Number(m[1])));
  const fromEdges = new Set(g.edges.filter((e) => e.to.startsWith('ach:') && quests.has(Number(e.from.replace('quest:', '')))).map((e) => e.to));
  const linked: GNode[] = [], named: GNode[] = [];
  for (const n of g.nodes.values()) {
    if (n.kind !== 'achievement') continue;
    if (fromEdges.has(n.id) || (objectives[n.refId] ?? []).some(([, c]) => needsClassQuest(c))) linked.push(n);
    else if (n.label === `Dopeul ${breedName}` || n.label === `Challenge ${breedName}`) named.push(n);
  }
  return { linked, named };
}
