import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selfSufficient, type RecipeInfo } from '../src/professions-shared.ts';

const recipe = (ingredients: RecipeInfo['ingredients']): RecipeInfo => ({ resultId: 1, name: 'r', iconId: null, level: 10, ingredients });
const g = (jobId: number, levelMin: number) => ({ id: jobId * 100 + levelMin, name: 'g', iconId: null, qty: 1, source: { kind: 'gathered' as const, jobId, jobName: 'J', levelMin } });

test('a recipe is self-sufficient only if every ingredient is harvestable or craftable at the character’s levels', () => {
  const r = recipe([g(28, 1), g(28, 20)]);
  assert.equal(selfSufficient(r, { 28: 20 }), true);
  assert.equal(selfSufficient(r, { 28: 19 }), false);
  assert.equal(selfSufficient(r, {}), false);
  const crafted = recipe([{ id: 5, name: 'c', iconId: null, qty: 1, source: { kind: 'crafted', jobId: 11, jobName: 'K', level: 30 } }]);
  assert.equal(selfSufficient(crafted, { 11: 30 }), true);
  const loot = recipe([g(28, 1), { id: 6, name: 'l', iconId: null, qty: 1, source: { kind: 'other', drops: [] } }]);
  assert.equal(selfSufficient(loot, { 28: 200 }), false);
});
