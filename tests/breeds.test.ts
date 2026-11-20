import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORTED_BREEDS } from '../components/breeds.ts';

test('all 19 playable classes, with unique slugs, game titles and a Fashionista name', () => {
  assert.equal(SUPPORTED_BREEDS.length, 19);
  assert.equal(new Set(SUPPORTED_BREEDS.map((b) => b.slug)).size, 19);
  for (const b of SUPPORTED_BREEDS) {
    assert.match(b.slug, /^[a-z0-9-]+$/, b.name);
    assert.ok(b.title && b.roles.length === 3 && b.fashionista, b.name);
  }
  // Crâ and Pandawa keep their URLs
  assert.ok(SUPPORTED_BREEDS.some((b) => b.id === 9 && b.slug === 'cra'));
  assert.ok(SUPPORTED_BREEDS.some((b) => b.id === 12 && b.slug === 'pandawa'));
});
