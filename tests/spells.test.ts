import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spellElements, gradeAt, classStates } from '../src/spells.ts';
import { latestDb, loadClass, type SpellInfo, type SpellLevel } from '../src/load.ts';

const lvl = (grade: number, minLevel: number, texts: string[]): SpellLevel => ({
  grade, minLevel, ap: 3, minRange: 1, range: 6, crit: 10, perTurn: 2, perTarget: 1, interval: 0, initialCooldown: 0,
  effects: texts.map((text) => ({ text })), criticalEffects: [],
});
const spell = (name: string, levels: SpellLevel[]): SpellInfo => ({ id: 1, slot: 0, variant: 0, name, description: null, levels });

test('elements, grade at level, states', () => {
  const s = spell('Test', [lvl(1, 1, ['10 à 12 dommages Air', 'État Saoul']), lvl(2, 50, ['5 vol Feu', "Enlève l'état Sobre"])]);
  assert.deepEqual(spellElements(s), ['Feu', 'Air']);
  assert.equal(gradeAt(s, 49)?.grade, 1);
  assert.equal(gradeAt(s, 200)?.grade, 2);
  assert.equal(gradeAt(spell('Late', [lvl(1, 100, [])]), 99), null);
  assert.deepEqual(classStates([s]), [
    { state: 'Saoul', applies: ['Test'], removes: [] },
    { state: 'Sobre', applies: [], removes: ['Test'] },
  ]);
});

const db = latestDb();
test('real data: Crâ and Pandawa have 22 slots of 2 variants', { skip: db ? false : 'run `npm run import` first' }, () => {
  for (const breed of [9, 12]) {
    const c = loadClass(db!, breed)!;
    assert.equal(c.spells.length, 44);
    assert.equal(new Set(c.spells.map((s) => s.slot)).size, 22);
    assert.ok(c.spells.every((s) => s.levels.length > 0));
  }
  const panda = loadClass(db!, 12)!;
  assert.ok(classStates(panda.spells).some((s) => s.state === 'Saoul'));
});
