// Dependency graph derived from official criteria. The criterion AST is the single
// source of truth for status; edges only exist to draw the graph.
import { parse, evaluate, atoms, blockers, reference, TRUE, type Atom, type Crit, type Progress } from './criteria.ts';

export type NodeKind = 'quest' | 'achievement' | 'dungeon' | 'gate';
export type EdgeKind =
  | 'requires'   // Qf=X / QF>X,0 / OA=X : X must be done
  | 'any_of'     // X is one alternative of an OR gate
  | 'excludes'   // Qf!X / OA!X : doing X closes this node (exclusive choice)
  | 'in_dungeon'; // dungeon → its achievements (DungeonData.achievements)

export interface NodeInput {
  id: string; kind: NodeKind; refId: number; label: string; criterion: string;
  points?: number | null;   // achievement points (Oa)
  level?: number | null;    // displayed level: quest levelMin, achievement level, dungeon optimal level
  category?: number | null; // quest category (≈ region) or achievement category
}
export interface GNode extends NodeInput { crit: Crit }
export interface GEdge { from: string; to: string; kind: EdgeKind }
export type Status = 'done' | 'available' | 'locked' | 'unknown';

const refs = (c: Crit) => atoms(c).map(reference).filter((r) => r !== null);

/** Turns one node's criterion into edges, creating an OR gate node per OR group that names quests. */
export function compileEdges(target: string, c: Crit): { edges: GEdge[]; gates: GNode[] } {
  const edges: GEdge[] = [];
  const gates: GNode[] = [];
  const walk = (c: Crit, to: string, inGate: boolean): void => {
    if (c.type === 'atom') {
      const r = reference(c);
      if (r) edges.push({ from: r.node, to, kind: r.negated ? 'excludes' : inGate ? 'any_of' : 'requires' });
      return;
    }
    if (c.type === 'and' || inGate) {
      // shortcut: AND-alternatives inside an OR are flattened into the gate for drawing only;
      // status stays exact because it evaluates the AST. Upgrade if the UI must show sub-groups.
      for (const x of c.children) walk(x, to, inGate);
      return;
    }
    if (!refs(c).length) return;
    const id = `gate:${target.replace(':', '-')}:${gates.length}`;
    gates.push({ id, kind: 'gate', refId: gates.length, label: 'Une au choix', criterion: '', crit: c });
    edges.push({ from: id, to, kind: 'requires' });
    for (const x of c.children) walk(x, id, true);
  };
  walk(c, target, false);
  return { edges, gates };
}

export class Graph {
  readonly nodes = new Map<string, GNode>();
  readonly edges: GEdge[] = [];
  readonly errors: { id: string; error: string }[] = [];
  /** quest:X / ach:X → nodes whose criterion mentions it. Used to find what a completion unlocks. */
  readonly dependents = new Map<string, Set<string>>();
  /** Nodes using QQ (quest count) or Oa (achievement points): any completion may unlock them. */
  readonly countDependents = new Set<string>();

  constructor(inputs: NodeInput[], extraEdges: GEdge[] = []) {
    for (const n of inputs) {
      let crit = TRUE;
      try { crit = parse(n.criterion); } catch (e) {
        // unparseable → an uninterpreted atom, so the node shows as 'unknown' instead of vanishing
        crit = { type: 'atom', code: '??', op: '=', value: n.criterion };
        this.errors.push({ id: n.id, error: (e as Error).message });
      }
      const node = { ...n, crit };
      this.nodes.set(n.id, node);
      const { edges, gates } = compileEdges(n.id, crit);
      this.edges.push(...edges);
      for (const g of gates) this.nodes.set(g.id, g);
      for (const a of atoms(crit)) {
        if (a.code === 'QQ' || a.code === 'Oa') this.countDependents.add(n.id);
        const k = reference(a)?.node ?? (a.code === 'Qa' && /^\d+$/.test(a.value) ? `quest:${a.value}` : null);
        if (!k) continue;
        if (!this.dependents.has(k)) this.dependents.set(k, new Set());
        this.dependents.get(k)!.add(n.id);
      }
    }
    this.edges.push(...extraEdges);
  }

  /** Adds derived facts (achievement points) unless the caller already set them. */
  private withFacts(p: Progress): Progress {
    if (p.achievementPoints !== undefined) return p;
    let points = 0;
    for (const id of p.done) points += this.nodes.get(id)?.points ?? 0;
    return { ...p, achievementPoints: points };
  }

  status(id: string, p: Progress): Status {
    const n = this.nodes.get(id);
    if (!n) throw new Error(`unknown node ${id}`);
    const r = evaluate(n.crit, this.withFacts(p));
    if (n.kind === 'gate') return r === true ? 'done' : r === false ? 'locked' : 'unknown';
    if (p.done.has(id)) return 'done';
    return r === true ? 'available' : r === false ? 'locked' : 'unknown';
  }

  /** Conditions currently failing or unknown for `id` (the "ce qui manque" list). */
  blockers(id: string, p: Progress): Atom[] {
    const n = this.nodes.get(id);
    return n ? blockers(n.crit, this.withFacts(p)) : [];
  }

  /** Nodes that become available if `id` is marked done now. */
  unlockedBy(id: string, p: Progress): string[] {
    const before = this.withFacts(p);
    const after = this.withFacts({ ...p, done: new Set([...p.done, id]), achievementPoints: undefined });
    const candidates = new Set([...(this.dependents.get(id) ?? []), ...this.countDependents]);
    return [...candidates].filter(
      (n) => n !== id && this.status(n, before) !== 'available' && this.status(n, after) === 'available',
    );
  }
}
