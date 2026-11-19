// Dev tool: for each criterion code, show operators, value shapes and which ID tables its values hit.
import { DatabaseSync } from 'node:sqlite';
import { latestDb } from '../src/load.ts';
import { parse, atoms, type Atom } from '../src/criteria.ts';
const db = new DatabaseSync(latestDb()!, { readOnly: true });
const ids = (sql: string) => new Set((db.prepare(sql).all() as any[]).map((r) => Number(r.id)));
const tables: Record<string, Set<number>> = {
  quest: ids('SELECT id FROM quest'), ach: ids('SELECT id FROM achievement'),
  dungeon: ids('SELECT id FROM dungeon'), qstep: ids('SELECT id FROM quest_step'),
  breed: ids('SELECT id FROM breed'), achcat: ids('SELECT id FROM achievement_category'),
};
const by = new Map<string, { n: number; ops: Record<string, number>; vals: string[]; where: Set<string> }>();
const add = (a: Atom, where: string) => {
  const e = by.get(a.code) ?? { n: 0, ops: {}, vals: [], where: new Set() };
  e.n++; e.ops[a.op] = (e.ops[a.op] ?? 0) + 1; e.vals.push(a.value); e.where.add(where); by.set(a.code, e);
};
for (const r of db.prepare('SELECT criterion_raw c FROM quest').all() as any[]) { try { atoms(parse(r.c)).forEach((a) => add(a, 'quest')); } catch {} }
for (const r of db.prepare('SELECT criterion_raw c FROM achievement_objective').all() as any[]) { try { atoms(parse(r.c)).forEach((a) => add(a, 'achobj')); } catch {} }
for (const [code, e] of [...by].sort((a, b) => b[1].n - a[1].n)) {
  const first = e.vals.map((v) => Number(v.split(',')[0])).filter(Number.isFinite);
  const hits = Object.entries(tables).map(([t, s]) => [t, first.filter((v) => s.has(v)).length / first.length] as const)
    .filter(([, f]) => f > 0.5).map(([t, f]) => `${t}:${Math.round(f * 100)}%`);
  const multi = e.vals.filter((v) => v.includes(',')).length;
  const nums = first.slice().sort((a, b) => a - b);
  console.log(`${code.padEnd(3)} n=${String(e.n).padEnd(5)} ops=${JSON.stringify(e.ops)} in=${[...e.where]} range=${nums[0]}..${nums.at(-1)} comma=${multi} hits=${hits.join(' ') || '-'} ex=${[...new Set(e.vals)].slice(0, 5).join(' ')}`);
}
