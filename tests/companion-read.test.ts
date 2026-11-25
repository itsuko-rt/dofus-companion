import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completions } from '../src/companion-read.ts';
import { buildCatalog } from '../src/recognize.ts';

const catalogs = {
  quest: buildCatalog([{ id: 'quest:1093', name: 'Offrande à Danizzal' }, { id: 'quest:1556', name: 'La chapelle noire' }, { id: 'quest:7', name: 'Le Dofus Ébène' }, { id: 'quest:8', name: 'Le Dofus Ébène' }]),
  achievement: buildCatalog([{ id: 'ach:486', name: 'Mine de Sakaï' }, { id: 'ach:9', name: 'Le Dofus Ébène' }]),
};
const lines = (...t: [string, number][]) => t.map(([text, confidence]) => ({ text, confidence }));

test('companion evidence: an exact, unshared, well-read name in a declared list is certain', () => {
  const r = completions(lines(['Terminées', 90], ['Offrande à Danizzal', 88]), catalogs, 'quests-done');
  assert.equal(r.signSeen, true);
  assert.deepEqual(r.readings.map((x) => [x.type, x.objectId, x.certain]), [['quest.completed', 'quest:1093', true]]);
});

test('companion evidence: a name read with one wrong letter waits for a confirmation; a name two quests share gives nothing', () => {
  const r = completions(lines(['La chapelle nojre', 80], ['Le Dofus Ébène', 92]), catalogs, 'quests-done');
  const by = Object.fromEntries(r.readings.map((x) => [x.objectId, x.certain]));
  assert.equal(by['quest:1556'], false);
  // two ids for one name: the companion never picks one, so nothing is proposed
  assert.ok(!('quest:7' in by) && !('quest:8' in by));
  // on a declared quest list, a name that is also an achievement means the quest
  assert.equal(completions(lines(['Mine de Sakaï', 90]), { ...catalogs, quest: buildCatalog([{ id: 'quest:3', name: 'Mine de Sakaï' }]) }, 'quests-done').readings[0].certain, true);
  assert.equal(r.signSeen, false);
});

test('companion evidence: nothing is read without a declared list, from a poorly read line, or from the wrong kind', () => {
  assert.deepEqual(completions(lines(['Offrande à Danizzal', 90]), catalogs, 'none').readings, []);
  assert.deepEqual(completions(lines(['Offrande à Danizzal', 20]), catalogs, 'quests-done').readings, []);
  assert.deepEqual(completions(lines(['Offrande à Danizzal', 90]), catalogs, 'achievements-done').readings, []);
  assert.deepEqual(completions(lines(['Mine de Sakaï', 90]), catalogs, 'achievements-done').readings.map((x) => x.objectId), ['ach:486']);
});
