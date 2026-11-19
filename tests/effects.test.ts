import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderEffect, type Lookups, type RawEffect } from '../src/effects.ts';

// Templates copied from EffectData (3.7.14.18) for the action ids used below.
const T: Record<number, string> = {
  98: '#1{{~1~2 à }}#2 dommages Air',
  5: 'Repousse de #1 case{{~ps}}',
  1079: '-#1{{~1~2 à -}}#2 PA',
  281: '#1 : +#3 Portée maximale',
  950: 'État #3',
  181: 'Invoque : #1',
  406: 'Enlève les effets du sort #2',
  1016: '#1{{~1~2 à }}#2 dommages Terre (% <sprite name="PM">PM restants)',
  1160: '#1',
  3793: '',
};
const L: Lookups = {
  template: (a) => T[a],
  spell: (id) => ({ 12787: 'Flèche Magique' } as Record<number, string>)[id],
  state: (id) => ({ 498: 'Saoul' } as Record<number, string>)[id],
  monster: (id) => ({ 5843: 'Tonneau' } as Record<number, string>)[id],
};
const fx = (actionId: number, diceNum = 0, diceSide = 0, value = 0, duration = 0, more: Partial<RawEffect> = {}): RawEffect =>
  ({ actionId, diceNum, diceSide, value, duration, ...more });

test('damage range and single values', () => {
  assert.deepEqual(renderEffect(fx(98, 15, 17), L), { text: '15 à 17 dommages Air' });
  assert.equal(renderEffect(fx(98, 7, 0), L)?.text, '7 dommages Air');
  assert.equal(renderEffect(fx(1079, 2, 0, 0, 1), L)?.text, '-2 PA');
  assert.equal(renderEffect(fx(1079, 2, 0, 0, 1), L)?.duration, '1 tour');
});

test('plural, sprites and durations', () => {
  assert.equal(renderEffect(fx(5, 2), L)?.text, 'Repousse de 2 cases');
  assert.equal(renderEffect(fx(5, 1), L)?.text, 'Repousse de 1 case');
  assert.equal(renderEffect(fx(1016, 36, 40), L)?.text, '36 à 40 dommages Terre (% PM restants)');
  assert.equal(renderEffect(fx(950, 0, 0, 498, -1), L)?.duration, 'infini');
});

test('entity references resolve to names, with a readable fallback', () => {
  assert.equal(renderEffect(fx(281, 12787, 0, 3), L)?.text, 'Flèche Magique : +3 Portée maximale');
  assert.equal(renderEffect(fx(950, 0, 0, 498, 2), L)?.text, 'État Saoul');
  assert.equal(renderEffect(fx(181, 5843, 1), L)?.text, 'Invoque : Tonneau');
  assert.equal(renderEffect(fx(950, 0, 0, 1), L)?.text, 'État #1');
});

test('internal script effects are hidden; unknown actions are flagged', () => {
  assert.equal(renderEffect(fx(1160, 25606, 1), L), null);
  assert.equal(renderEffect(fx(3793, 0, 0, 21324), L), null);
  assert.equal(renderEffect(fx(4242), L)?.text, 'Effet non documenté (action 4242)');
});

test('zones: single cell omitted, known shapes named', () => {
  assert.equal(renderEffect(fx(98, 1, 2, 0, 0, { zoneShape: 80, zoneSize: 1 }), L)?.zone, undefined);
  assert.equal(renderEffect(fx(98, 1, 2, 0, 0, { zoneShape: 67, zoneSize: 2 }), L)?.zone, 'cercle de 2');
  assert.equal(renderEffect(fx(98, 1, 2, 0, 0, { zoneShape: 81, zoneSize: 1 }), L)?.zone, 'zone Q de 1');
});
