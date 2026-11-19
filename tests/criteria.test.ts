import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, evaluate, blockers, type Progress } from '../src/criteria.ts';

const prog = (level: number, done: string[] = [], active: string[] = []): Progress => ({
  level, done: new Set(done), active: new Set(active),
});

test('parses a simple prerequisite', () => {
  assert.deepEqual(parse('Qf=209'), { type: 'atom', code: 'Qf', op: '=', value: '209' });
  assert.deepEqual(parse(''), { type: 'and', children: [] });
});

test('AND + OR from real data (alignment quest)', () => {
  const c = parse('Ps=2&Pa=55&PL>129&(Qf=272|Qf=273|Qf=274)');
  assert.equal(c.type, 'and');
  // Ps/Pa are not interpreted: never "available", but not "locked" either once known parts pass
  assert.equal(evaluate(c, prog(130, ['quest:273'])), 'unknown');
  assert.equal(evaluate(c, prog(129, ['quest:273'])), false); // PL>129 is strict
  assert.equal(evaluate(c, prog(130)), false); // none of the OR branch done
});

test('exclusive group from real data', () => {
  const c = parse('PL>19&PL<51&Qa!496&Qa!497&Qa!498&Qa!500&Qa!882&(Qa=890|Qc=890)');
  assert.equal(evaluate(c, prog(30, [], ['quest:890'])), true);
  assert.equal(evaluate(c, prog(30, [], ['quest:890', 'quest:497'])), false);
  assert.equal(evaluate(c, prog(60, [], ['quest:890'])), false);
  assert.equal(evaluate(c, prog(30)), 'unknown'); // Qc not interpreted
});

test('nested OR of ANDs and comma values', () => {
  const c = parse('PL>8&((Pm=69207040&(Qc=715|Qo=4594))|(Pm=1&(Qc=1|Qo=2)))');
  assert.equal(c.type, 'and');
  assert.equal(evaluate(parse('QF>1423,0'), prog(1)), false);
  assert.equal(evaluate(parse('QF>1423,0'), prog(1, ['quest:1423'])), true);
  assert.equal(evaluate(parse('QF>1423,2'), prog(1, ['quest:1423'])), 'unknown'); // repeat count not tracked
});

test('profile codes need the character sheet, never guessed', () => {
  const c = parse('Ps=1&Pa>20&PG=9');
  assert.equal(evaluate(c, prog(50)), 'unknown');
  const sheet = (profile: Progress['profile']): Progress => ({ ...prog(50), profile });
  assert.equal(evaluate(c, sheet({ alignmentSide: 1, alignmentLevel: 21, breed: 9 })), true);
  assert.equal(evaluate(c, sheet({ alignmentSide: 2, alignmentLevel: 21, breed: 9 })), false);
  assert.equal(evaluate(c, sheet({ alignmentSide: 1, alignmentLevel: 21, breed: 12 })), false);
  assert.equal(evaluate(parse('Pj>26,99'), sheet({ jobs: { 26: 100 } })), true);
  assert.equal(evaluate(parse('Pj>26,99'), sheet({ jobs: {} })), false);
  assert.equal(evaluate(parse('PZ=1'), sheet({ subscribed: false })), false);
  assert.equal(evaluate(parse('SC!5'), sheet({ serverType: 1 })), true);
});

test('achievements, counts, server-only and equipped items', () => {
  assert.equal(evaluate(parse('OA=586'), prog(1, ['ach:586'])), true);
  assert.equal(evaluate(parse('OA=586'), prog(1)), false);
  assert.equal(evaluate(parse('QQ>1'), prog(1, ['quest:1', 'quest:2', 'ach:3'])), true);
  assert.equal(evaluate(parse('Oa>10'), { ...prog(1), achievementPoints: 11 }), true);
  assert.equal(evaluate(parse('Oa>10'), prog(1)), 'unknown');
  assert.equal(evaluate(parse('PL>49&Sc=993'), prog(50)), true);
  // the two "parse errors" of 3.7.14.18 were the E operator (item equipped)
  assert.deepEqual(parse('POE11563'), { type: 'atom', code: 'PO', op: 'E', value: '11563' });
  assert.equal(evaluate(parse('PL>162&POE11563'), prog(170)), 'unknown');
});

test('blockers lists what is missing', () => {
  const c = parse('PL>49&Qf=10');
  assert.deepEqual(blockers(c, prog(50)).map((a) => a.code + a.op + a.value), ['Qf=10']);
  assert.deepEqual(blockers(c, prog(50, ['quest:10'])), []);
});

test('rejects malformed input', () => {
  assert.throws(() => parse('Qf=1&Qf=2|Qf=3'), /mixed/);
  assert.throws(() => parse('(Qf=1'), /missing \)/);
  assert.throws(() => parse('Q=1'), /bad atom/);
});

test('BT is an inferred always-true code (chain-start quests)', () => {
  assert.equal(evaluate(parse('BT=1'), prog(1)), true);
  assert.equal(evaluate(parse('BT=1&Qf=724'), prog(1)), false);
});
