// Regression tests for fixes of the pre-launch security audit (docs/SECURITY_FIXES.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jsonLdText } from '../src/jsonld.ts';

test('JSON-LD: a </script> in the data cannot close the script element, and the value is unchanged', () => {
  const data = { name: '</script><script>alert(1)</script>', list: ['<b>'] };
  const text = jsonLdText(data);
  assert.ok(!text.includes('<'), 'no raw < left');
  assert.ok(text.includes('\\u003c/script>'));
  assert.deepEqual(JSON.parse(text), data);
});

import { Busy, hashLoad, hashPassword } from '../src/server/auth.ts';

test('password hashing: at most 4 run at once, 32 wait, the rest are refused as busy (no memory blow-up)', async () => {
  let peak = 0;
  const watch = setInterval(() => { peak = Math.max(peak, hashLoad().running); }, 1);
  const results = await Promise.allSettled(Array.from({ length: 50 }, () => hashPassword('a-long-password')));
  clearInterval(watch);
  const busy = results.filter((r) => r.status === 'rejected' && r.reason instanceof Busy).length;
  assert.equal(busy, 50 - 4 - 32);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 36);
  assert.ok(peak <= 4, `peak concurrency ${peak}`);
  assert.deepEqual(hashLoad(), { running: 0, waiting: 0 });
});
