import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyCompletion, decide, noteSeen, parseEvent } from '../src/companion-sync.ts';
import { sanitizeCharacter } from '../src/character.ts';

const char = (id: string, extra: Record<string, unknown> = {}) => sanitizeCharacter({ id, name: id, ...extra }, id)!;
const ev = (o: Record<string, unknown>) => parseEvent({ eventId: 'm0abc1234567890ff', at: '2026-11-25T18:00:00.000Z', ...o })!;
const done = (o: Record<string, unknown> = {}) => ev({ type: 'quest.completed', characterKey: 'Abc-Def', objectId: 'quest:1093', name: 'Offrande à Danizzal', certain: true, ...o });

test('companion events are validated: wrong ids, kinds or missing characters are refused', () => {
  assert.equal(parseEvent({ eventId: 'x', at: '2026-11-25T18:00:00Z', type: 'quest.completed' }), null);
  assert.equal(parseEvent({ eventId: 'm0abc1234567890ff', at: 'hier', type: 'character.seen', characterKey: 'A' }), null);
  assert.equal(parseEvent({ eventId: 'm0abc1234567890ff', at: '2026-11-25T18:00:00Z', type: 'quest.completed', characterKey: 'A', objectId: 'ach:5' }), null);
  assert.equal(parseEvent({ eventId: 'm0abc1234567890ff', at: '2026-11-25T18:00:00Z', type: 'quest.completed', objectId: 'quest:5' }), null);
  assert.equal(parseEvent({ eventId: 'm0abc1234567890ff', at: '2026-11-25T18:00:00Z', type: 'rm -rf', characterKey: 'A' }), null);
  assert.equal(done().objectId, 'quest:1093');
});

test('profiles match on the exact in-game name only: a close name is a different character', () => {
  const chars = [char('c1', { gameName: 'Abc-Def' }), char('c2', { gameName: 'Abc-Deff' })];
  assert.deepEqual(decide(ev({ type: 'character.seen', characterKey: 'Abc-Def' }), chars, 'assisted'), { kind: 'switch', characterId: 'c1' });
  assert.deepEqual(decide(ev({ type: 'character.seen', characterKey: 'abc-def' }), chars, 'assisted'), { kind: 'pending', reason: 'unknown-character' });
  assert.deepEqual(decide(done({ characterKey: 'Abc-Deff' }), chars, 'automatic'), { kind: 'apply', characterId: 'c2' });
});

test('modes: observation writes nothing, assisted asks, automatic applies only what is certain', () => {
  const chars = [char('c1', { gameName: 'Abc-Def' })];
  assert.deepEqual(decide(done(), chars, 'observation'), { kind: 'ignore', reason: 'observation' });
  assert.deepEqual(decide(done(), chars, 'assisted'), { kind: 'pending', reason: 'confirm', characterId: 'c1' });
  assert.deepEqual(decide(done(), chars, 'automatic'), { kind: 'apply', characterId: 'c1' });
  assert.deepEqual(decide(done({ certain: false }), chars, 'automatic'), { kind: 'pending', reason: 'confirm', characterId: 'c1' });
  assert.deepEqual(decide(done(), [], 'automatic'), { kind: 'pending', reason: 'unknown-character' });
});

test('applying is idempotent and goes to the matched character only', () => {
  const c = char('c1', { gameName: 'Abc-Def' });
  const once = applyCompletion(c, done(), '2026-11-25T18:01:00.000Z');
  assert.deepEqual(once.done, ['quest:1093']);
  assert.equal(once.history.at(-1)?.eventId, 'm0abc1234567890ff');
  assert.equal(once.history.at(-1)?.source, 'companion');
  assert.equal(applyCompletion(once, done()), once);                                  // same event again
  assert.equal(applyCompletion(once, done({ eventId: 'm0zzz1234567890ff' })), once);   // same quest, another event
  assert.deepEqual(decide(done(), [once], 'automatic'), { kind: 'ignore', reason: 'already-applied' });
  // the history entry with its event id survives the account's sanitising (server round trip)
  assert.equal(sanitizeCharacter(JSON.parse(JSON.stringify(once)), 'x')!.history.at(-1)?.eventId, 'm0abc1234567890ff');
});

test('a sighting fills the class only when the profile has none, and is dated with the event', () => {
  const seen = ev({ type: 'character.seen', characterKey: 'Abc-Def', breedId: 17 });
  assert.equal(noteSeen(char('c1'), seen).profile.breed, 17);
  assert.equal(noteSeen(char('c1', { profile: { breed: 8 } }), seen).profile.breed, 8);
  assert.equal(noteSeen(char('c1'), seen).lastSeenAt, '2026-11-25T18:00:00.000Z');
});
