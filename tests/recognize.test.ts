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
