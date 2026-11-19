// Ankama criterion language, as found in QuestData.startCriterion and
// AchievementObjectiveData.criterion: `PL>129&(Qf=272|Qf=273)&Qa!496`.
// Atom = 2-letter code + operator (= ! < > E X) + value. `&` and `|` are never mixed
// at the same depth without parentheses in the data (checked on 3.7.14.18), so we refuse it.

// E / X only appear with PO: item equipped / not equipped (`POE11563`).
export type Op = '=' | '!' | '<' | '>' | 'E' | 'X';
export type Atom = { type: 'atom'; code: string; op: Op; value: string };
export type Crit = Atom | { type: 'and' | 'or'; children: Crit[] };

export const TRUE: Crit = { type: 'and', children: [] };

export function parse(src: string): Crit {
  const s = src.trim();
  if (!s) return TRUE;
  let i = 0;

  function expr(): Crit {
    const items = [term()];
    let op: string | null = null;
    while (s[i] === '&' || s[i] === '|') {
      if (op && op !== s[i]) throw new Error(`mixed & and | without parentheses at ${i} in "${src}"`);
      op = s[i++];
      items.push(term());
    }
    return items.length === 1 ? items[0] : { type: op === '&' ? 'and' : 'or', children: items };
  }

  function term(): Crit {
    if (s[i] === '(') {
      i++;
      const e = expr();
      if (s[i++] !== ')') throw new Error(`missing ) at ${i - 1} in "${src}"`);
      return e;
    }
    const m = /^([A-Za-z]{2})([=!<>EX])([^&|()]*)/.exec(s.slice(i));
    if (!m) throw new Error(`bad atom at ${i} in "${src}"`);
    i += m[0].length;
    return { type: 'atom', code: m[1], op: m[2] as Op, value: m[3] };
  }

  const e = expr();
  if (i !== s.length) throw new Error(`unexpected "${s[i]}" at ${i} in "${src}"`);
  return e;
}

/** Character sheet. An unset field makes the conditions that need it 'unknown'. */
export interface Profile {
  breed?: number;          // PG — BreedData id (9 Crâ, 12 Pandawa)
  alignmentSide?: number;  // Ps — 0 neutral, 1 Bonta, 2 Brâkmar
  alignmentLevel?: number; // Pa
  alignmentOrder?: number; // Pr — AlignmentOrder id
  subscribed?: boolean;    // PZ
  serverType?: number;     // SC — ServerGameType id (5 = Temporis)
  jobs?: Readonly<Record<number, number>>; // Pj/PJ — job id → level
}

/** Character state the evaluator needs. Node ids: `quest:<id>`, `ach:<id>`, … */
export interface Progress {
  level: number;
  done: ReadonlySet<string>;
  active: ReadonlySet<string>;
  profile?: Profile;
  achievementPoints?: number; // Oa — Graph fills it from done achievements
}

export type Tri = true | false | 'unknown';

function compare(a: number, op: Op, b: number): Tri {
  switch (op) {
    case '=': return a === b;
    case '!': return a !== b;
    case '<': return a < b;
    case '>': return a > b;
    default: return 'unknown';
  }
}
const cmp = (a: number | undefined, op: Op, b: number): Tri => (a === undefined ? 'unknown' : compare(a, op, b));
const has = (yes: boolean, op: Op): Tri => (op === '=' ? yes : op === '!' ? !yes : 'unknown');

/** The progress node an atom points at: Qf=X / QF>X,0 → quest:X, OA=X → ach:X. */
export function reference(a: Atom): { node: string; negated: boolean } | null {
  const [id, n] = a.value.split(',');
  if (!/^\d+$/.test(id)) return null;
  if (a.code === 'Qf' && (a.op === '=' || a.op === '!')) return { node: `quest:${id}`, negated: a.op === '!' };
  if (a.code === 'OA' && (a.op === '=' || a.op === '!')) return { node: `ach:${id}`, negated: a.op === '!' };
  if (a.code === 'QF' && a.op === '>' && n === '0') return { node: `quest:${id}`, negated: false };
  return null;
}

// Meanings: see src/codes.ts. Codes not handled here evaluate to 'unknown', never guessed.
function evalAtom(a: Atom, p: Progress): Tri {
  const args = a.value.split(',');
  const n = Number(args[0]);
  if (!Number.isInteger(n)) return 'unknown';
  const pr = p.profile ?? {};
  const ref = reference(a);
  if (ref) return ref.negated ? !p.done.has(ref.node) : p.done.has(ref.node);
  switch (a.code) {
    case 'PL': return compare(p.level, a.op, n);
    case 'Qa': return has(p.active.has(`quest:${n}`), a.op);
    case 'QQ': return compare([...p.done].filter((d) => d.startsWith('quest:')).length, a.op, n);
    case 'Oa': return cmp(p.achievementPoints, a.op, n);
    case 'PG': return cmp(pr.breed, a.op, n);
    case 'Ps': return cmp(pr.alignmentSide, a.op, n);
    case 'Pa': return cmp(pr.alignmentLevel, a.op, n);
    case 'Pr': return cmp(pr.alignmentOrder, a.op, n);
    case 'SC': return cmp(pr.serverType, a.op, n);
    case 'PZ': return cmp(pr.subscribed === undefined ? undefined : Number(pr.subscribed), a.op, n);
    case 'Pj':
    case 'PJ': {
      if (!pr.jobs) return 'unknown';
      const lvl = pr.jobs[n];
      if (args.length === 2) return compare(lvl ?? 0, a.op, Number(args[1])); // job level
      return has(lvl !== undefined, a.op); // job learned
    }
    case 'Sc':
    case 'Sv': return true; // server-only: the client itself treats these as always true (dodumap)
    case 'BT': return true; // inferred, see src/codes.ts
    default: return 'unknown';
  }
}

/** Three-valued logic: false wins in AND, true wins in OR, otherwise unknown propagates. */
export function evaluate(c: Crit, p: Progress): Tri {
  if (c.type === 'atom') return evalAtom(c, p);
  const r = c.children.map((x) => evaluate(x, p));
  if (c.type === 'and') return r.includes(false) ? false : r.includes('unknown') ? 'unknown' : true;
  return r.includes(true) ? true : r.includes('unknown') ? 'unknown' : false;
}

/** Atoms that currently make `c` fail (or stay unknown) — the "what's missing" list for the UI. */
export function blockers(c: Crit, p: Progress): Atom[] {
  if (evaluate(c, p) === true) return [];
  if (c.type === 'atom') return [c];
  return c.children.flatMap((x) => blockers(x, p));
}

export function atoms(c: Crit): Atom[] {
  return c.type === 'atom' ? [c] : c.children.flatMap(atoms);
}
