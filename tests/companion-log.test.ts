import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLog } from '../companion/log.mjs';

const NOW = Date.parse('2026-11-25T12:00:00.000Z');
const day = (n: number) => new Date(NOW - n * 86_400_000).toISOString();
const line = (o: object) => JSON.stringify(o);
const quest = (eventId: string, at: string, objectId = 'quest:1093', characterKey = 'Abc-Def') => line({ eventId, at, type: 'quest.completed', characterKey, objectId, status: 'new' });

test('companion log after a restart: the site\'s answers are restored and completions are never logged twice', () => {
  const text = [
    quest('m0aaaaaaaaaa01', day(1)),
    line({ ack: 'm0aaaaaaaaaa01', status: 'pending', at: day(1) }),
    line({ ack: 'm0aaaaaaaaaa01', status: 'applied', at: day(0) }), // the last answer wins
    line({ eventId: 'm0aaaaaaaaaa02', at: day(0), type: 'character.seen', characterKey: 'Abc-Def', status: 'new' }),
  ].join('\n');
  const { events, sent, lines } = readLog(text, NOW);
  assert.deepEqual(events.map((e: { eventId: string; status: string }) => [e.eventId, e.status]), [['m0aaaaaaaaaa01', 'applied'], ['m0aaaaaaaaaa02', 'new']]);
  assert.ok(sent.has('Abc-Def|quest.completed|quest:1093'));
  assert.equal(sent.size, 1); // a sighting is not a completion
  assert.equal(lines.length, 4);
});

test('companion log: old events and their answers go, a line cut short by a crash is dropped, a repeated id is kept once', () => {
  const text = [
    quest('m0aaaaaaaaaa01', day(31)),
    line({ ack: 'm0aaaaaaaaaa01', status: 'applied', at: day(2) }), // answer to an event no longer kept
    quest('m0aaaaaaaaaa03', day(2), 'quest:18'),
    quest('m0aaaaaaaaaa03', day(2), 'quest:18'),
    '{"eventId":"m0aaaaaaaaaa04","at":"' + day(0) + '","type":"quest.compl', // power cut in the middle of a write
    'pas du JSON', '', 'null', line({ at: day(0) }),
  ].join('\n');
  const { events, sent, lines } = readLog(text, NOW);
  assert.deepEqual(events.map((e: { eventId: string }) => e.eventId), ['m0aaaaaaaaaa03']);
  assert.deepEqual([...sent], ['Abc-Def|quest.completed|quest:18']);
  assert.equal(lines.length, 1);
});

test('companion log: the same quest for two characters is two completions', () => {
  const { sent } = readLog([quest('m0aaaaaaaaaa05', day(0), 'quest:18', 'Alpha'), quest('m0aaaaaaaaaa06', day(0), 'quest:18', 'Beta')].join('\n'), NOW);
  assert.equal(sent.size, 2);
});
