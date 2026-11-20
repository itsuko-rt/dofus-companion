import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, almanaxFor, parisDay, type AlmanaxEntry } from '../src/almanax-shared.ts';

const e = (id: number, dates: string[]): AlmanaxEntry => ({ id, dates, name: `n${id}`, description: null, item: `i${id}`, qty: 1, source: { kind: 'other', drops: [] } });

test('a day picks its exact entry; wider patterns are the period bonuses; an exact year wins', () => {
  const entries = [e(1, ['20/11/*']), e(2, ['*/11/*']), e(3, ['20/11/2026']), e(4, ['21/11/*'])];
  assert.equal(almanaxFor(entries, { day: 20, month: 11, year: 2026 }).offering?.id, 3);
  assert.equal(almanaxFor(entries, { day: 20, month: 11, year: 2027 }).offering?.id, 1);
  assert.deepEqual(almanaxFor(entries, { day: 20, month: 11, year: 2027 }).period.map((x) => x.id), [2]);
  assert.equal(almanaxFor(entries, { day: 22, month: 11, year: 2027 }).offering, null);
});

test('a season listing its days explicitly does not replace the day’s own offering; it is shown as a period bonus', () => {
  const entries = [e(130, ['28/02/*', '01/03/*', '02/03/*']), e(193, ['01/03/*'])];
  const r = almanaxFor(entries, { day: 1, month: 3, year: 2026 });
  assert.equal(r.offering?.id, 193);
  assert.deepEqual(r.period.map((x) => x.id), [130]);
});

test('days roll over months and years; Paris time decides the day', () => {
  assert.deepEqual(addDays({ day: 31, month: 12, year: 2026 }, 1), { day: 1, month: 1, year: 2027 });
  assert.deepEqual(addDays({ day: 28, month: 2, year: 2028 }, 1), { day: 29, month: 2, year: 2028 });
  // 23:30 UTC on 20 Nov is already 21 Nov in Paris (UTC+1)
  assert.deepEqual(parisDay(new Date('2026-11-20T23:30:00Z')), { day: 21, month: 11, year: 2026 });
});
