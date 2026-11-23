import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalog, matchLines, normalize } from '../src/recognize.ts';

const catalog = buildCatalog([
  { id: 'quest:1', name: 'Le village dans les nuages' },
  { id: 'quest:2', name: "L'anneau de tous les dangers" },
  { id: 'quest:3', name: 'Mise à l’épreuve' },
  { id: 'ach:9', name: 'Mise à l’épreuve' },
  { id: 'quest:4', name: 'Les principes d’Archie m’aident' },
]);
const L = (text: string, confidence = 90) => ({ text, confidence });

test('normalisation ignores accents, apostrophes and punctuation', () => {
  assert.equal(normalize('Mise à l’épreuve !'), 'mise a l epreuve');
});

test('exact and noisy OCR lines match the right names', () => {
  const m = matchLines([L('Le village dans les nuages'), L("L'anneau de tous les dangcrs", 80), L('Niveau 12'), L('Quêtes terminées')], catalog);
  assert.deepEqual(m.map((x) => x.id).sort(), ['quest:1', 'quest:2']);
  assert.equal(m.find((x) => x.id === 'quest:1')!.confidence, 0.9);
  assert.ok(m.find((x) => x.id === 'quest:2')!.confidence < 0.8); // OCR error lowers confidence
});

test('a name wrapped on two lines is found', () => {
  const m = matchLines([L('Les principes d’Archie'), L('m’aident')], catalog);
  assert.deepEqual(m.map((x) => x.id), ['quest:4']);
});

test('shared names are flagged ambiguous; duplicates across screenshots count once', () => {
  const m = matchLines([L('Mise à l’épreuve', 70), L('Mise a l epreuve', 95)], catalog);
  assert.deepEqual(m.map((x) => x.id).sort(), ['ach:9', 'quest:3']);
  assert.ok(m.every((x) => x.ambiguous && x.confidence === 0.95));
});

test('unrelated text and short garbage give no match', () => {
  assert.deepEqual(matchLines([L('Le village des nuages bleus du sud'), L('xx'), L('Fermer')], catalog), []);
});

test('other columns on the same line (level, counters, icons) do not hide the name', () => {
  const m = matchLines([L('Le village dans les nuages niv. 3'), L('© L’anneau de tous les dangers 12'), L('Mise à l’épreuve 2/4')], catalog);
  assert.deepEqual(m.map((x) => x.id).sort(), ['ach:9', 'quest:1', 'quest:2', 'quest:3']);
});

test('a short name inside an unrelated longer sentence is not taken', () => {
  const c = buildCatalog([{ id: 'quest:5', name: 'Le village' }]);
  assert.deepEqual(matchLines([L('Retournez voir le maire dans le village de pêcheurs')], c), []);
});

test('saved without asking only when the whole line is exactly one unshared, long-enough name read clearly', async () => {
  const { isCertain, isLikely } = await import('../src/recognize.ts');
  const cat = buildCatalog([
    { id: 'quest:1', name: 'Le village dans les nuages' },
    { id: 'quest:5', name: 'Astrub' },          // a region name: also a window header
    { id: 'quest:3', name: 'Mise à l’épreuve' }, { id: 'ach:9', name: 'Mise à l’épreuve' },
  ]);
  const by = (lines: { text: string; confidence: number }[]) => new Map(matchLines(lines, cat).map((m) => [m.id, m]));
  const m = by([L('Le village dans les nuages', 72), L('Astrub', 95), L('Mise à l’épreuve', 95)]);
  assert.equal(isCertain(m.get('quest:1')!), true);   // exact, modest OCR confidence is enough
  assert.equal(isCertain(m.get('quest:5')!), false);  // one short word: could be a label
  assert.equal(isCertain(m.get('quest:3')!), false);  // shared with an achievement
  assert.equal(isLikely(m.get('quest:3')!), false);
  const noisy = by([L('Le vilage dans les nuages', 90)]).get('quest:1')!;
  assert.equal(noisy.exact, false);
  assert.equal(isCertain(noisy), false);              // one letter wrong: asked, but pre-ticked
  assert.equal(isLikely(noisy), true);
  assert.equal(isCertain(by([L('Le village dans les nuages', 40)]).get('quest:1')!), false); // read badly
  const inside = by([L('Le village dans les nuages niv. 12 1/3 terminé', 90)]).get('quest:1');
  assert.equal(inside?.exact ?? false, false);         // found inside a longer line: never saved without asking
});

test('an icon read as one or two letters before the name keeps it exact; a long name with two letters misread is pre-ticked', async () => {
  const { isCertain, isLikely } = await import('../src/recognize.ts');
  const cat = buildCatalog([{ id: 'quest:18', name: "Wogew l'hewmite" }, { id: 'quest:849', name: 'Glugubrr est un vilain grincheux' }, { id: 'quest:1', name: 'La chapelle noire' }]);
  const m = new Map(matchLines([L("HE Wogew l'hewmite niv. 10", 64), L('N GlugubIT est un vilain grincheux niv. 44', 76), L('La chapelle noire', 77)], cat).map((x) => [x.id, x]));
  assert.equal(m.get('quest:18')!.exact, true);
  assert.equal(isCertain(m.get('quest:18')!), true);
  assert.equal(m.get('quest:1')!.exact, true); // "La" is part of the name, not a stray token
  const g = m.get('quest:849')!;
  assert.equal(isCertain(g), false);
  assert.equal(isLikely(g), true);
});
