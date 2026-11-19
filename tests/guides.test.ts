// Reference pages: built from the imported game DB (skipped without it).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from '../src/site.ts';
import { latestDb } from '../src/load.ts';

test('slugs: accents, apostrophes, ligatures', () => {
  assert.equal(slugify('Île de Frigost'), 'ile-de-frigost');
  assert.equal(slugify("Royaume d'Amakna"), 'royaume-d-amakna');
  assert.equal(slugify('Dofus Cœur'), 'dofus-coeur');
});

const skip = latestDb() ? false : 'run `npm run import` first';
test('real data: unique region and Dofus slugs, playable quest order, Dofus chains', { skip }, async () => {
  const { guideContext, regions, regionQuests, dofusSlugs, dofusChain } = await import('../src/guides-data.ts');
  const c = guideContext()!;
  const rs = regions(c);
  assert.equal(new Set(rs.map((r) => r.slug)).size, rs.length);
  assert.ok(rs.some((r) => r.slug === 'incarnam'));
  const slugs = [...dofusSlugs(c.dofus).values()];
  assert.equal(new Set(slugs).size, slugs.length, `duplicate Dofus slugs: ${slugs.join(',')}`);
  // in Incarnam every quest comes after its prerequisites from the same region
  const qs = regionQuests(c, 19);
  const pos = new Map(qs.map((q, i) => [`quest:${q.id}`, i]));
  for (const [i, q] of qs.entries()) for (const r of q.requires) if (pos.has(r.id)) assert.ok(pos.get(r.id)! < i, `${r.name} after ${q.name}`);
  const emeraude = c.dofus.find((d) => /meraude/.test(d.name))!;
  assert.ok(dofusChain(c, emeraude)[0].steps.length > 1);
});
