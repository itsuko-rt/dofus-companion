import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeCharacter } from '../src/character.ts';

test('history and objective ids survive validation; bad entries are dropped', () => {
  const c = sanitizeCharacter({
    id: 'cabc', done: ['quest:1', 'obj:7446', 'gate:x', 'evil'],
    history: [
      { at: '2026-11-19T10:00:00Z', source: 'scan', added: ['quest:1', '<script>'], removed: [], label: 'Capture' },
      { at: 'x', source: 'hacked', added: [], removed: [], label: '' },
      'nope',
    ],
  }, 'c0')!;
  assert.deepEqual(c.done, ['quest:1', 'obj:7446']);
  assert.equal(c.history.length, 1);
  assert.deepEqual(c.history[0].added, ['quest:1']);
  assert.equal(sanitizeCharacter({ history: Array.from({ length: 500 }, () => ({ source: 'manual', added: [], removed: [] })) }, 'c0')!.history.length, 200);
});
