// Builds data/game-<version>.sqlite from the latest dofus-sqlite release (layer A: official data)
// and writes data/report-<version>.json. Usage: npm run import [-- --tag v6.0_3.7.14.18]
import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { Graph, type GEdge, type NodeInput } from '../src/graph.ts';
import { atoms } from '../src/criteria.ts';
import { CODES, EVALUATED, INFERRED } from '../src/codes.ts';
import { renderEffect, type RawEffect } from '../src/effects.ts';
import { renderObjective } from '../src/objectives.ts';
import { matchGuides } from '../src/guides.ts';
import { statSync } from 'node:fs';
import { importProfessions, PROFESSION_FILES } from './professions-import.ts';
import { importCreatures, CREATURE_FILES } from './creatures-import.ts';

const REPO = 'ledouxm/dofus-sqlite';
const FILES = [
  'questsdata', 'queststepsdata', 'questcategoriesdata',
  'achievementsdata', 'achievementobjectivesdata', 'achievementcategoriesdata',
  'dungeonsdata', 'breedsdata', 'i18n_fr',
  // spells (spelllevelsdata ≈ 200 MB, monstersdata ≈ 140 MB: parsed once, filtered, released)
  'spellsdata', 'spellvariantsdata', 'spelllevelsdata', 'effectsdata', 'spellstatesdata', 'monstersdata',
  'itemtypesdata', 'characteristicsdata',
  'questobjectivesdata', 'questobjectivetypesdata', 'queststeprewardsdata', 'npcsdata', 'subareasdata', 'achievementrewardsdata',
  // professions (scripts/professions-import.ts)
  ...PROFESSION_FILES,
  // classes, monsters, character XP (scripts/creatures-import.ts)
  ...CREATURE_FILES,
] as const;
const DPLN_SITEMAP = 'https://www.dofuspourlesnoobs.com/sitemap.xml';
// Items and sets come from dofusdude's release of the same game version: dofus-sqlite's JSON
// rounds the 64-bit Unity reference ids, which breaks the item → effect links.
const DODU_REPO = 'dofusdude/dofus3-main';
const DODU_FILES = ['items', 'item_sets'] as const;
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

  const doduDir = `data/raw/dofusdude-${version}`;
  mkdirSync(doduDir, { recursive: true });
  for (const f of DODU_FILES) {
    const path = `${doduDir}/${f}.json`;
    if (existsSync(path)) continue;
    console.log(`download dofusdude ${f}.json`);
    writeFileSync(path, Buffer.from(await (await fetchOk(`https://github.com/${DODU_REPO}/releases/download/${version}/${f}.json`)).arrayBuffer()));
  }
  /** Unity file with exact references: 64-bit rids kept as strings. */
  const readUnity = (path: string) => {
    const refs = JSON.parse(readFileSync(path, 'utf8').replace(/"rid":(-?\d+)/g, '"rid":"$1"')).references.RefIds as Row[];
    return { refs, byRid: new Map(refs.map((r) => [r.rid as string, r.data as Row])) };
  };

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
      optimal_level INTEGER, objective_ids TEXT, description TEXT, objectives TEXT, rewards TEXT);
    CREATE INDEX quest_step_quest ON quest_step(quest_id);
    CREATE TABLE quest_start(quest_id INTEGER PRIMARY KEY, npc_name TEXT, subarea_name TEXT);
    -- external, non-official guides (layer B): link only, with provenance
    CREATE TABLE external_guide(quest_id INTEGER NOT NULL, site TEXT NOT NULL, url TEXT NOT NULL, language TEXT,
      status TEXT, checked_at TEXT, PRIMARY KEY(quest_id, site));
    CREATE TABLE dofus(item_id INTEGER PRIMARY KEY, name TEXT, level INTEGER, quest_ids TEXT, achievement_ids TEXT);
    CREATE TABLE achievement_category(id INTEGER PRIMARY KEY, name TEXT, parent_id INTEGER);
    CREATE TABLE achievement(id INTEGER PRIMARY KEY, name TEXT, description TEXT, category_id INTEGER,
      level INTEGER, points INTEGER, account_linked INTEGER, rewards TEXT);
    CREATE TABLE achievement_guide(achievement_id INTEGER NOT NULL, site TEXT NOT NULL, url TEXT NOT NULL, language TEXT,
      status TEXT NOT NULL, checked_at TEXT NOT NULL);
    CREATE TABLE achievement_objective(id INTEGER PRIMARY KEY, achievement_id INTEGER NOT NULL, ordinal INTEGER,
      name TEXT, criterion_raw TEXT);
    CREATE INDEX achievement_category_idx ON achievement(category_id);
    CREATE INDEX achievement_objective_ach ON achievement_objective(achievement_id, ordinal);
    CREATE INDEX achievement_guide_ach ON achievement_guide(achievement_id);
    CREATE TABLE dungeon(id INTEGER PRIMARY KEY, name TEXT, min_level INTEGER, optimal_level INTEGER,
      difficulty INTEGER, entrance_map_id INTEGER, required_objects TEXT);
    CREATE TABLE dungeon_boss(dungeon_id INTEGER, monster_id INTEGER, PRIMARY KEY(dungeon_id, monster_id));
    CREATE TABLE dungeon_achievement(dungeon_id INTEGER, achievement_id INTEGER, PRIMARY KEY(dungeon_id, achievement_id));
    CREATE TABLE breed(id INTEGER PRIMARY KEY, name TEXT, spell_ids TEXT);
    -- class spells: each slot holds 2 variants (SpellVariantData); effects are rendered in French at import
    CREATE TABLE data_source(dataset TEXT PRIMARY KEY, url TEXT, retrieved_at TEXT);
    CREATE TABLE characteristic(id INTEGER PRIMARY KEY, keyword TEXT, name TEXT);
    CREATE TABLE item_type(id INTEGER PRIMARY KEY, name TEXT, super_type_id INTEGER);
    -- effects: [{actionId, min, max, text, characteristic, sign}] — sign -1 for maluses
    CREATE TABLE item(id INTEGER PRIMARY KEY, name TEXT, type_id INTEGER, level INTEGER, set_id INTEGER,
      icon_id INTEGER, criterion TEXT, effects TEXT);
    CREATE TABLE item_set(id INTEGER PRIMARY KEY, name TEXT, item_ids TEXT, bonuses TEXT);
    CREATE TABLE spell(id INTEGER PRIMARY KEY, breed_id INTEGER NOT NULL, slot INTEGER, variant INTEGER,
      name TEXT, description TEXT, icon_id INTEGER);
    CREATE TABLE spell_level(id INTEGER PRIMARY KEY, spell_id INTEGER NOT NULL, grade INTEGER, min_player_level INTEGER,
      ap_cost INTEGER, min_range INTEGER, range INTEGER, crit_chance INTEGER, max_cast_per_turn INTEGER,
      max_cast_per_target INTEGER, min_cast_interval INTEGER, initial_cooldown INTEGER, global_cooldown INTEGER,
      effects TEXT, critical_effects TEXT);
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
  // quest steps are inserted after items and monsters are known (objective and reward names)
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

  // ---- class spells
  const spellData = rows('spellsdata');
  const spellName = new Map(spellData.map((s) => [s.id as number, t(s.nameId)]));
  const variants = rows('spellvariantsdata');
  const classSpellIds = new Set(variants.flatMap((v) => arr(v.spellIds) as number[]));
  const levels = rows('spelllevelsdata').filter((l) => classSpellIds.has(l.spellId));
  const templates = new Map(rows('effectsdata').map((e) => [e.id as number, t(e.descriptionId) ?? undefined]));
  const stateName = new Map(rows('spellstatesdata').map((s) => [s.id as number, t(s.nameId)]));
  const monsterRows = rows('monstersdata');
  const monsterName = new Map(monsterRows.map((m) => [m.id as number, t(m.nameId)]));
  const lookups = {
    template: (a: number) => templates.get(a),
    spell: (id: number) => spellName.get(id) ?? undefined,
    state: (id: number) => stateName.get(id) ?? undefined,
    monster: (id: number) => monsterName.get(id) ?? undefined,
  };
  let undocumentedEffects = 0;
  const render = (list: unknown) => JSON.stringify((arr(list) as Row[]).flatMap((e) => {
    const raw: RawEffect = { actionId: e.actionId, diceNum: e.diceNum, diceSide: e.diceSide, value: e.value,
      duration: e.duration, zoneShape: e.zoneDescr?.shape, zoneSize: e.zoneDescr?.param1 };
    const r = renderEffect(raw, lookups);
    if (r?.text.startsWith('Effet non documenté')) undocumentedEffects++;
    return r ? [r] : [];
  }));
  const firstLevel = new Map<number, number>();
  for (const l of levels) if (l.grade === 1) firstLevel.set(l.spellId, l.minPlayerLevel);
  const spellRow = new Map(spellData.map((s) => [s.id as number, s]));
  const slots = new Map<number, Row[]>();
  for (const v of variants) {
    if (!slots.has(v.breedId)) slots.set(v.breedId, []);
    slots.get(v.breedId)!.push(v);
  }
  const spellRows: unknown[][] = [];
  for (const [breed, vs] of slots) {
    // slot order = unlock level of the slot's first variant, as in the in-game spell bar
    vs.sort((a, b) => (firstLevel.get(arr(a.spellIds)[0]) ?? 999) - (firstLevel.get(arr(b.spellIds)[0]) ?? 999) || a.id - b.id);
    vs.forEach((v, slot) => (arr(v.spellIds) as number[]).forEach((id, variant) => {
      const s = spellRow.get(id);
      if (s) spellRows.push([id, breed, slot, variant, t(s.nameId), t(s.descriptionId), s.iconId]);
    }));
  }
  insert('spell', ['id', 'breed_id', 'slot', 'variant', 'name', 'description', 'icon_id'], spellRows);

  // ---- items and sets (dofusdude), effects rendered with the game's templates
  const effectData = new Map(rows('effectsdata').map((e) => [e.id as number, e]));
  const charRows = rows('characteristicsdata');
  insert('characteristic', ['id', 'keyword', 'name'], charRows.map((c) => [c.id, c.keyword, t(c.nameId)]));
  insert('item_type', ['id', 'name', 'super_type_id'], rows('itemtypesdata').map((x) => [x.id, t(x.nameId), x.superTypeId]));
  const itemEffect = (e: Row) => {
    const d = effectData.get(e.actionId);
    const r = renderEffect({ actionId: e.actionId, diceNum: e.diceNum, diceSide: e.diceSide, value: e.value, duration: 0 }, lookups);
    return {
      actionId: e.actionId, min: e.diceNum, max: e.diceSide || e.diceNum, text: r?.text ?? null,
      characteristic: d && d.characteristic > 0 ? d.characteristic : null,
      sign: d?.characteristicOperator === '-' ? -1 : 1,
    };
  };
  const items = readUnity(`${doduDir}/items.json`);
  const itemRows = items.refs.filter((r) => r.type?.class === 'ItemData' || r.type?.class === 'WeaponData').map((r) => {
    const it = r.data as Row;
    const effects = (arr(it.possibleEffects) as Row[]).map((x) => items.byRid.get(x.rid)).filter(Boolean).map((e) => itemEffect(e!));
    return [it.id, t(it.nameId), it.typeId, it.level, it.itemSetId > 0 ? it.itemSetId : null, it.iconId, it.criterions ?? '', JSON.stringify(effects)];
  });
  insert('item', ['id', 'name', 'type_id', 'level', 'set_id', 'icon_id', 'criterion', 'effects'], itemRows);
  const sets = readUnity(`${doduDir}/item_sets.json`);
  const setRows = sets.refs.filter((r) => r.type?.class === 'ItemSetData').map((r) => {
    const s = r.data as Row;
    // bonuses[k] = effects granted when k pieces of the set are worn
    const bonuses = (arr(s.effects) as Row[]).map((b) => (arr(b.values) as Row[]).map((x) => sets.byRid.get(x.rid)).filter(Boolean).map((e) => itemEffect(e!)));
    return [s.id, t(s.nameId), JSON.stringify(arr(s.items)), JSON.stringify(bonuses)];
  });
  insert('item_set', ['id', 'name', 'item_ids', 'bonuses'], setRows);
  const now = new Date().toISOString();
  // ---- quest details: objectives, rewards, starting NPC and zone
  const npcName = new Map(rows('npcsdata').map((n) => [n.id as number, t(n.nameId)]));
  const subareas = rows('subareasdata');
  const subareaName = new Map(subareas.map((sa) => [sa.id as number, t(sa.nameId)]));
  const mapSubarea = new Map<number, string | null>();
  for (const sa of subareas) for (const m of arr(sa.mapIds) as number[]) mapSubarea.set(m, t(sa.nameId));
  const objTemplates = new Map(rows('questobjectivetypesdata').map((o) => [o.id as number, t(o.nameId) ?? undefined]));
  const itemName = new Map(itemRows.map((r) => [r[0] as number, r[1] as string | null]));
  const objLookups = {
    template: (id: number) => objTemplates.get(id),
    npc: (id: number) => npcName.get(id) ?? undefined,
    item: (id: number) => itemName.get(id) ?? undefined,
    monster: (id: number) => monsterName.get(id) ?? undefined,
    subarea: (id: number) => subareaName.get(id) ?? undefined,
    text: (id: number) => t(id) ?? undefined,
  };
  const objectiveById = new Map(rows('questobjectivesdata').map((o) => [o.id as number, o]));
  const rewardById = new Map(rows('queststeprewardsdata').map((r) => [r.id as number, r]));
  const pairs = (list: unknown) => (arr(list) as Row[]).map((x) => arr(x.values) as number[]).filter((v) => v.length >= 1);
  insert('quest_step', ['id', 'quest_id', 'ordinal', 'name', 'optimal_level', 'objective_ids', 'description', 'objectives', 'rewards'],
    steps.map((s) => {
      const objectives = (arr(s.objectiveIds) as number[]).map((id) => objectiveById.get(id)).filter(Boolean).map((o) => {
        const p = o!.parameters ?? {};
        return renderObjective(o!.typeId, [p.parameter0, p.parameter1, p.parameter2], objLookups);
      });
      const rewards = (arr(s.rewardsIds) as number[]).map((id) => rewardById.get(id)).filter(Boolean).map((r) => ({
        xp: r!.experienceRatio > 0, kamas: r!.kamasRatio > 0,
        items: pairs(r!.itemsReward).map(([id, qty]) => ({ id, name: itemName.get(id) ?? null, qty: qty ?? 1 })),
        spells: (arr(r!.spellsReward) as number[]).map((id) => spellName.get(id) ?? null).filter(Boolean),
        emotes: arr(r!.emotesReward).length, titles: arr(r!.titlesReward).length, jobs: arr(r!.jobsReward).length,
      }));
      return [s.id, s.questId, stepOrder.get(s.id) ?? null, t(s.nameId), s.optimalLevel, JSON.stringify(arr(s.objectiveIds)),
        t(s.descriptionId), JSON.stringify(objectives), JSON.stringify(rewards)];
    }));
  insert('quest_start', ['quest_id', 'npc_name', 'subarea_name'], quests.map((q) => {
    const pos = arr(q.startPosition)[0] as Row | undefined;
    return [q.id, pos ? npcName.get(pos.npcId) ?? null : null, pos ? mapSubarea.get(pos.mapId) ?? null : null];
  }));

  // ---- Dofus: items of type "Dofus" and the quests / achievements that reward them
  const dofusType = new Set(rows('itemtypesdata').filter((x) => t(x.nameId) === 'Dofus').map((x) => x.id as number));
  const dofusItems = itemRows.filter((r) => dofusType.has(r[2] as number));
  const questOfStep = new Map(steps.map((s) => [s.id as number, s.questId as number]));
  const rewardQuests = new Map<number, Set<number>>();
  for (const r of rewardById.values()) for (const [id] of pairs(r.itemsReward)) {
    const q = questOfStep.get(r.stepId);
    if (q != null) rewardQuests.set(id, (rewardQuests.get(id) ?? new Set()).add(q));
  }
  const achRewardItems = new Map<number, number[]>();
  const achRewardRows = new Map<number, Row>();
  for (const r of rows('achievementrewardsdata')) {
    const ids = (arr(r.itemsReward) as unknown[]).map((x) => (typeof x === 'number' ? x : (arr((x as Row).values)[0] as number))).filter(Number.isInteger);
    achRewardItems.set(r.id, ids);
    achRewardRows.set(r.id, r);
  }
  // achievement rewards, same shape as quest rewards (amounts of xp/kamas scale with level: only flagged)
  const setRewards = db.prepare('UPDATE achievement SET rewards = ? WHERE id = ?');
  for (const a of achievements) {
    const rs = (arr(a.rewardIds) as number[]).map((id) => achRewardRows.get(id)).filter((r): r is Row => !!r).map((r) => ({
      xp: r.experienceRatio > 0, kamas: r.kamasRatio > 0,
      items: (achRewardItems.get(r.id) ?? []).map((id, i) => ({ id, name: itemName.get(id) ?? null, qty: (arr(r.itemsQuantityReward)[i] as number) ?? 1 })),
      titles: arr(r.titlesReward).length, emotes: arr(r.emotesReward).length, ornaments: arr(r.ornamentsReward).length, spells: arr(r.spellsReward).length,
    }));
    if (rs.length) setRewards.run(JSON.stringify(rs), a.id);
  }
  const rewardAchievements = new Map<number, Set<number>>();
  for (const a of achievements) for (const rid of arr(a.rewardIds) as number[]) for (const id of achRewardItems.get(rid) ?? []) {
    rewardAchievements.set(id, (rewardAchievements.get(id) ?? new Set()).add(a.id));
  }
  insert('dofus', ['item_id', 'name', 'level', 'quest_ids', 'achievement_ids'], dofusItems.map((r) => {
    const id = r[0] as number;
    return [id, r[1], r[3], JSON.stringify([...(rewardQuests.get(id) ?? [])]), JSON.stringify([...(rewardAchievements.get(id) ?? [])])];
  }));

  // ---- Dofus Pour Les Noobs guides: exact title matches against its public sitemap (cached a week)
  const sitemapPath = 'data/raw/dpln-sitemap.xml';
  let guideCount = 0;
  try {
    const stale = !existsSync(sitemapPath) || Date.now() - statSync(sitemapPath).mtimeMs > 7 * 864e5;
    if (stale) writeFileSync(sitemapPath, await (await fetchOk(DPLN_SITEMAP)).text());
    const urls = [...readFileSync(sitemapPath, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
      .filter((u) => u.startsWith('https://www.dofuspourlesnoobs.com/'));
    const checked = statSync(sitemapPath).mtime.toISOString();
    const guides = matchGuides(quests.map((q) => ({ id: q.id as number, name: t(q.nameId) ?? '' })).filter((q) => q.name), urls);
    insert('external_guide', ['quest_id', 'site', 'url', 'language', 'status', 'checked_at'],
      guides.map((g) => [g.questId, 'Dofus Pour Les Noobs', g.url, 'fr', 'auto_title_match', checked]));
    guideCount = guides.length;
    const achGuides = matchGuides(achievements.map((a) => ({ id: a.id as number, name: t(a.nameId) ?? '' })).filter((a) => a.name), urls);
    insert('achievement_guide', ['achievement_id', 'site', 'url', 'language', 'status', 'checked_at'],
      achGuides.map((g) => [g.questId, 'Dofus Pour Les Noobs', g.url, 'fr', 'auto_title_match', checked]));
  } catch (e) {
    console.warn(`DPLN sitemap unavailable, no guide links this time: ${(e as Error).message}`);
  }

  insert('data_source', ['dataset', 'url', 'retrieved_at'], [
    ['game', rel.html_url, now],
    ['items, item_sets', `https://github.com/${DODU_REPO}/releases/tag/${version}`, now],
    ['external_guide (Dofus Pour Les Noobs)', DPLN_SITEMAP, now],
  ]);
  insert('spell_level', ['id', 'spell_id', 'grade', 'min_player_level', 'ap_cost', 'min_range', 'range', 'crit_chance',
    'max_cast_per_turn', 'max_cast_per_target', 'min_cast_interval', 'initial_cooldown', 'global_cooldown',
    'effects', 'critical_effects'],
    levels.map((l) => [l.id, l.spellId, l.grade, l.minPlayerLevel, l.apCost, l.minRange, l.range,
      l.criticalHitProbability, l.maxCastPerTurn, l.maxCastPerTarget, l.minCastInterval, l.initialCooldown,
      l.globalCooldown, render(l.effects), render(l.criticalEffect)]));

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
  console.log('professions', importProfessions(db, rawDir, rel.html_url));
  console.log('creatures', importCreatures(db, rawDir, rel.html_url));
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
    spells: { spells: spellRows.length, levels: levels.length, undocumented_effects: undocumentedEffects },
    items: { items: itemRows.length, sets: setRows.length },
    guides: { dpln_quests_linked: guideCount, of: quests.length },
    dofus: dofusItems.length,
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
  console.log(`items ${itemRows.length} · sets ${setRows.length} · dofus ${dofusItems.length} · DPLN guides ${guideCount}/${quests.length}`);
  console.log(`spells ${spellRows.length} · levels ${levels.length} · undocumented effects ${undocumentedEffects}`);
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
