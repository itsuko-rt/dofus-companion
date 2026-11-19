// Builds data/game-<version>.sqlite from the latest dofus-sqlite release (layer A: official data)
// and writes data/report-<version>.json. Usage: npm run import [-- --tag v6.0_3.7.14.18]
import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { Graph, type GEdge, type NodeInput } from '../src/graph.ts';
import { atoms } from '../src/criteria.ts';
import { CODES, EVALUATED, INFERRED } from '../src/codes.ts';

const REPO = 'ledouxm/dofus-sqlite';
const FILES = [
  'questsdata', 'queststepsdata', 'questcategoriesdata',
  'achievementsdata', 'achievementobjectivesdata', 'achievementcategoriesdata',
  'dungeonsdata', 'breedsdata', 'i18n_fr',
] as const;
const UA = { 'User-Agent': 'dofus-companion-import' };

type Row = Record<string, any>;
const arr = (x: any): any[] => x?.Array ?? [];

async function fetchOk(url: string): Promise<Response> {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${url}`);
  return r;
}

async function main() {
  const tagArg = process.argv.indexOf('--tag');
  const relUrl = tagArg > 0
    ? `https://api.github.com/repos/${REPO}/releases/tags/${process.argv[tagArg + 1]}`
    : `https://api.github.com/repos/${REPO}/releases/latest`;
  const rel = await (await fetchOk(relUrl)).json() as { tag_name: string; html_url: string; assets: { name: string; browser_download_url: string }[] };
  const tag = rel.tag_name;
  const version = tag.split('_').pop()!;
  if (!/^[\d.]+$/.test(version)) throw new Error(`unexpected release tag ${tag}`);

  const rawDir = `data/raw/${tag}`;
  mkdirSync(rawDir, { recursive: true });
  for (const f of FILES) {
    const path = `${rawDir}/${f}.json`;
    if (existsSync(path)) continue;
    const asset = rel.assets.find((a) => a.name === `${f}.json`);
    if (!asset) throw new Error(`release ${tag} has no ${f}.json`);
    console.log(`download ${f}.json`);
    writeFileSync(path, Buffer.from(await (await fetchOk(asset.browser_download_url)).arrayBuffer()));
  }

  const read = (f: string) => JSON.parse(readFileSync(`${rawDir}/${f}.json`, 'utf8'));
  const rows = (f: string): Row[] => read(f).references.RefIds.map((r: Row) => r.data).filter(Boolean);
  const fr: Record<string, string> = read('i18n_fr');
  const t = (id: unknown) => (id == null ? null : fr[String(id)] ?? null);

  const quests = rows('questsdata');
  const steps = rows('queststepsdata');
  const achievements = rows('achievementsdata');
  const objectives = rows('achievementobjectivesdata');
  const dungeons = rows('dungeonsdata');

  const dbPath = `data/game-${version}.sqlite`;
  rmSync(dbPath, { force: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE game_version(id TEXT PRIMARY KEY, source_tag TEXT, source_url TEXT, retrieved_at TEXT);
    CREATE TABLE quest_category(id INTEGER PRIMARY KEY, name TEXT, sort_order INTEGER);
    CREATE TABLE quest(id INTEGER PRIMARY KEY, name TEXT, category_id INTEGER, level_min INTEGER, level_max INTEGER,
      is_dungeon_quest INTEGER, is_party_quest INTEGER, repeat_type INTEGER,
      start_npc_id INTEGER, start_map_id INTEGER, start_positions TEXT, criterion_raw TEXT NOT NULL);
    CREATE TABLE quest_step(id INTEGER PRIMARY KEY, quest_id INTEGER NOT NULL, ordinal INTEGER, name TEXT,
      optimal_level INTEGER, objective_ids TEXT);
    CREATE TABLE achievement_category(id INTEGER PRIMARY KEY, name TEXT, parent_id INTEGER);
    CREATE TABLE achievement(id INTEGER PRIMARY KEY, name TEXT, description TEXT, category_id INTEGER,
      level INTEGER, points INTEGER, account_linked INTEGER);
    CREATE TABLE achievement_objective(id INTEGER PRIMARY KEY, achievement_id INTEGER NOT NULL, ordinal INTEGER,
      name TEXT, criterion_raw TEXT);
    CREATE TABLE dungeon(id INTEGER PRIMARY KEY, name TEXT, min_level INTEGER, optimal_level INTEGER,
      difficulty INTEGER, entrance_map_id INTEGER, required_objects TEXT);
    CREATE TABLE dungeon_boss(dungeon_id INTEGER, monster_id INTEGER, PRIMARY KEY(dungeon_id, monster_id));
    CREATE TABLE dungeon_achievement(dungeon_id INTEGER, achievement_id INTEGER, PRIMARY KEY(dungeon_id, achievement_id));
    CREATE TABLE breed(id INTEGER PRIMARY KEY, name TEXT, spell_ids TEXT);
    -- derived graph, rebuilt on every import, never edited by hand
    CREATE TABLE node(id TEXT PRIMARY KEY, kind TEXT NOT NULL, ref_id INTEGER, label TEXT, criterion TEXT NOT NULL, points INTEGER);
    CREATE TABLE edge(from_node TEXT NOT NULL, to_node TEXT NOT NULL, kind TEXT NOT NULL);
    CREATE INDEX edge_to ON edge(to_node);
    CREATE INDEX edge_from ON edge(from_node);
  `);

  const insert = (table: string, cols: string[], data: unknown[][]) => {
    const st = db.prepare(`INSERT INTO ${table}(${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
    for (const r of data) st.run(...(r as any[]));
  };

  db.exec('BEGIN');
  insert('game_version', ['id', 'source_tag', 'source_url', 'retrieved_at'],
    [[version, tag, rel.html_url, new Date().toISOString()]]);
  insert('quest_category', ['id', 'name', 'sort_order'],
    rows('questcategoriesdata').map((c) => [c.id, t(c.nameId), c.order ?? null]));
  insert('quest', ['id', 'name', 'category_id', 'level_min', 'level_max', 'is_dungeon_quest', 'is_party_quest',
    'repeat_type', 'start_npc_id', 'start_map_id', 'start_positions', 'criterion_raw'],
    quests.map((q) => {
      const pos = arr(q.startPosition);
      return [q.id, t(q.nameId), q.categoryId, q.levelMin, q.levelMax, q.isDungeonQuest, q.isPartyQuest,
        q.repeatType, pos[0]?.npcId ?? null, pos[0]?.mapId ?? null, JSON.stringify(pos), q.startCriterion ?? ''];
    }));
  const stepOrder = new Map<number, number>();
  for (const q of quests) arr(q.stepIds).forEach((s: number, i: number) => stepOrder.set(s, i));
  insert('quest_step', ['id', 'quest_id', 'ordinal', 'name', 'optimal_level', 'objective_ids'],
    steps.map((s) => [s.id, s.questId, stepOrder.get(s.id) ?? null, t(s.nameId), s.optimalLevel,
      JSON.stringify(arr(s.objectiveIds))]));
  insert('achievement_category', ['id', 'name', 'parent_id'],
    rows('achievementcategoriesdata').map((c) => [c.id, t(c.nameId), c.parentId ?? null]));
  insert('achievement', ['id', 'name', 'description', 'category_id', 'level', 'points', 'account_linked'],
    achievements.map((a) => [a.id, t(a.nameId), t(a.descriptionId), a.categoryId, a.level, a.points, a.accountLinked]));
  insert('achievement_objective', ['id', 'achievement_id', 'ordinal', 'name', 'criterion_raw'],
    objectives.map((o) => [o.id, o.achievementId, o.order, t(o.nameId), o.criterion ?? '']));
  insert('dungeon', ['id', 'name', 'min_level', 'optimal_level', 'difficulty', 'entrance_map_id', 'required_objects'],
    dungeons.map((d) => [d.id, t(d.nameId), d.minLevel, d.optimalPlayerLevel, d.difficulty, d.entranceMapId,
      JSON.stringify(arr(d.requiredObjects))]));
  insert('dungeon_boss', ['dungeon_id', 'monster_id'],
    dungeons.flatMap((d) => [...new Set(arr(d.bosses))].map((m) => [d.id, m])));
  insert('dungeon_achievement', ['dungeon_id', 'achievement_id'],
    dungeons.flatMap((d) => [...new Set(arr(d.achievements))].map((a) => [d.id, a])));
  insert('breed', ['id', 'name', 'spell_ids'],
    rows('breedsdata').map((b) => [b.id, t(b.shortNameId), JSON.stringify(arr(b.breedSpellsId))]));

  // Graph inputs. An achievement's criterion = AND of its objectives' criteria.
  const objByAch = new Map<number, string[]>();
  for (const o of [...objectives].sort((a, b) => a.order - b.order)) {
    if (!o.criterion) continue;
    if (!objByAch.has(o.achievementId)) objByAch.set(o.achievementId, []);
    objByAch.get(o.achievementId)!.push(`(${o.criterion})`);
  }
  const inputs: NodeInput[] = [
    ...quests.map((q): NodeInput => ({ id: `quest:${q.id}`, kind: 'quest', refId: q.id, label: t(q.nameId) ?? `#${q.id}`, criterion: q.startCriterion ?? '' })),
    ...achievements.map((a): NodeInput => ({ id: `ach:${a.id}`, kind: 'achievement', refId: a.id, label: t(a.nameId) ?? `#${a.id}`, criterion: (objByAch.get(a.id) ?? []).join('&'), points: a.points })),
    // shortcut: dungeon minLevel is not modelled as a hard condition until its in-game meaning is confirmed
    ...dungeons.map((d): NodeInput => ({ id: `dungeon:${d.id}`, kind: 'dungeon', refId: d.id, label: t(d.nameId) ?? `#${d.id}`, criterion: '' })),
  ];
  const achIds = new Set(achievements.map((a) => a.id));
  const dungeonEdges: GEdge[] = dungeons.flatMap((d) => [...new Set(arr(d.achievements))]
    .filter((a) => achIds.has(a)).map((a): GEdge => ({ from: `dungeon:${d.id}`, to: `ach:${a}`, kind: 'in_dungeon' })));
  const graph = new Graph(inputs, dungeonEdges);

  insert('node', ['id', 'kind', 'ref_id', 'label', 'criterion', 'points'],
    [...graph.nodes.values()].map((n) => [n.id, n.kind, n.refId, n.label, n.criterion, n.points ?? null]));
  insert('edge', ['from_node', 'to_node', 'kind'], graph.edges.map((e) => [e.from, e.to, e.kind]));
  db.exec('COMMIT');
  db.close();

  // ---- report
  const edgeKinds: Record<string, number> = {};
  for (const e of graph.edges) edgeKinds[e.kind] = (edgeKinds[e.kind] ?? 0) + 1;
  const dangling = graph.edges.filter((e) => !graph.nodes.has(e.from)).map((e) => `${e.from} → ${e.to}`);
  // Coverage: an atom is evaluated (codes.ts), documented-but-not-evaluable (objective, context…), or undocumented.
  const unknownCodes: Record<string, number> = {};
  const notEvaluatedByKind: Record<string, number> = {};
  let questsFullyInterpreted = 0;
  for (const n of graph.nodes.values()) {
    if (n.kind === 'gate') continue;
    const unk = atoms(n.crit).filter((a) => !EVALUATED.has(a.code));
    for (const a of unk) {
      const kind = CODES[a.code]?.kind;
      if (kind) notEvaluatedByKind[kind] = (notEvaluatedByKind[kind] ?? 0) + 1;
      else unknownCodes[a.code] = (unknownCodes[a.code] ?? 0) + 1;
    }
    if (n.kind === 'quest' && unk.length === 0) questsFullyInterpreted++;
  }
  const chain = longestChain(graph);

  const report = {
    version, source: rel.html_url, generated_at: new Date().toISOString(),
    counts: {
      quests: quests.length, quest_steps: steps.length, achievements: achievements.length,
      achievement_objectives: objectives.length, dungeons: dungeons.length,
      nodes: graph.nodes.size, gates: [...graph.nodes.values()].filter((n) => n.kind === 'gate').length,
      edges: graph.edges.length, edges_by_kind: edgeKinds,
    },
    parse_errors: graph.errors,
    quests_fully_interpreted: `${questsFullyInterpreted}/${quests.length}`,
    inferred_codes: INFERRED,
    documented_not_evaluable_by_kind: notEvaluatedByKind,
    undocumented_codes: Object.fromEntries(Object.entries(unknownCodes).sort((a, b) => b[1] - a[1])),
    dangling_references: dangling,
    cycles: chain.cycles,
    longest_requires_chain: chain.path.map((id) => `${id} ${graph.nodes.get(id)?.label ?? ''}`),
  };
  writeFileSync(`data/report-${version}.json`, JSON.stringify(report, null, 2));

  console.log(`\n${dbPath} built from ${tag}`);
  console.log(`quests ${quests.length} · achievements ${achievements.length} · dungeons ${dungeons.length}`);
  console.log(`nodes ${graph.nodes.size} (gates ${report.counts.gates}) · edges ${graph.edges.length}`, edgeKinds);
  console.log(`parse errors ${graph.errors.length} · dangling refs ${dangling.length} · cycles ${chain.cycles.length}`);
  console.log(`quests fully interpreted ${report.quests_fully_interpreted}`);
  console.log('documented but not evaluable', notEvaluatedByKind);
  console.log('undocumented codes', report.undocumented_codes);
  console.log(`longest chain: ${chain.path.length} quests (${report.longest_requires_chain[0]} … ${report.longest_requires_chain.at(-1)})`);
  console.log(`report → data/report-${version}.json`);
}

/** Longest path over requires/any_of edges (gates collapsed out of the result), plus any cycles met. */
function longestChain(g: Graph): { path: string[]; cycles: string[][] } {
  const preds = new Map<string, string[]>();
  for (const e of g.edges) {
    if (e.kind !== 'requires' && e.kind !== 'any_of') continue;
    if (!g.nodes.has(e.from)) continue;
    if (!preds.has(e.to)) preds.set(e.to, []);
    preds.get(e.to)!.push(e.from);
  }
  const best = new Map<string, string[]>();
  const onStack = new Set<string>();
  const cycles: string[][] = [];
  const visit = (id: string): string[] => {
    const memo = best.get(id);
    if (memo) return memo;
    if (onStack.has(id)) { cycles.push([id]); return []; }
    onStack.add(id);
    let longest: string[] = [];
    for (const p of preds.get(id) ?? []) {
      const c = visit(p);
      if (c.length > longest.length) longest = c;
    }
    onStack.delete(id);
    const res = [...longest, id];
    best.set(id, res);
    return res;
  };
  let path: string[] = [];
  for (const id of g.nodes.keys()) {
    const c = visit(id);
    if (c.length > path.length) path = c;
  }
  return { path: path.filter((id) => !id.startsWith('gate:')), cycles };
}

main().catch((e) => { console.error(e); process.exit(1); });
