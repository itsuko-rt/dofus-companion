// Facts derived from rendered spell effects (no community input).
import type { SpellInfo, SpellLevel } from './load.ts';

export const ELEMENTS = ['Feu', 'Eau', 'Terre', 'Air', 'Neutre'] as const;
export type Element = (typeof ELEMENTS)[number];

const ELEMENT_RE = /(?:dommages|vol|soins) (Feu|Eau|Terre|Air|Neutre)/g;

/** Elements a spell deals damage, steals life or heals in (any grade). */
export function spellElements(s: SpellInfo): Element[] {
  const found = new Set<Element>();
  for (const l of s.levels) for (const e of l.effects) for (const m of e.text.matchAll(ELEMENT_RE)) found.add(m[1] as Element);
  return ELEMENTS.filter((el) => found.has(el));
}

/** Highest grade usable at `level`, or null if the spell is not unlocked yet. */
export function gradeAt(s: SpellInfo, level: number): SpellLevel | null {
  let best: SpellLevel | null = null;
  for (const l of s.levels) if (l.minLevel <= level && (!best || l.grade > best.grade)) best = l;
  return best;
}

/** States the class applies or removes, with the spells involved ("État Saoul" → [Picole, …]). */
export function classStates(spells: SpellInfo[]): { state: string; applies: string[]; removes: string[] }[] {
  const map = new Map<string, { applies: Set<string>; removes: Set<string> }>();
  for (const s of spells) for (const l of s.levels) for (const e of l.effects) {
    const m = /^(Enlève l'état|État) (.+)$/.exec(e.text);
    if (!m) continue;
    const entry = map.get(m[2]) ?? { applies: new Set(), removes: new Set() };
    (m[1] === 'État' ? entry.applies : entry.removes).add(s.name);
    map.set(m[2], entry);
  }
  return [...map].map(([state, v]) => ({ state, applies: [...v.applies], removes: [...v.removes] }))
    .sort((a, b) => b.applies.length + b.removes.length - (a.applies.length + a.removes.length));
}
