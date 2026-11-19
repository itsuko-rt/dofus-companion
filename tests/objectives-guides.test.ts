import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderObjective, type ObjectiveLookups } from '../src/objectives.ts';
import { matchGuides, nameKey, slugKey } from '../src/guides.ts';

const T: Record<number, string> = {
  1: 'Aller voir #1', 3: 'Ramener à #1 : x#3 #2', 14: 'Vaincre x#2 #1', 12: 'Rapporter #3 âme de #2 à #1.', 16: 'Vaincre x#2 #1 sur la carte #3 en un seul combat',
};
const L: ObjectiveLookups = {
  template: (t) => T[t],
  npc: (id) => ({ 2894: 'Caporale Mynerve' } as Record<number, string>)[id],
  item: (id) => ({ 1746: 'Plume de Tofu' } as Record<number, string>)[id],
  monster: (id) => ({ 68: 'Bouftou' } as Record<number, string>)[id],
  subarea: () => undefined, text: () => undefined,
};

test('objectives read like the game', () => {
  assert.equal(renderObjective(1, [2894], L), 'Aller voir Caporale Mynerve');
  assert.equal(renderObjective(3, [2894, 1746, 5], L), 'Ramener à Caporale Mynerve: x5 Plume de Tofu');
  assert.equal(renderObjective(14, [68, 5], L), 'Vaincre x5 Bouftou');
  assert.equal(renderObjective(12, [999, 68, 1], L), 'Rapporter 1 âme de Bouftou à PNJ n°999.');
  assert.equal(renderObjective(16, [68, 1, 149165056], L), 'Vaincre x1 Bouftou sur la carte une carte précise en un seul combat');
  assert.equal(renderObjective(99, [], L), 'Objectif (type 99)');
});

test('DPLN slugs and quest names share a key', () => {
  assert.equal(slugKey('au-delagrave-du-mur.html'), 'au dela du mur');
  assert.equal(nameKey('Au-delà du mur'), 'au dela du mur');
  assert.equal(nameKey("Traître ou pas traître, telle est la question..."), 'traitre ou pas traitre telle est la question');
  assert.equal(slugKey('traicirctre-ou-pas-traicirctre-telle-est-la-question.html'), 'traitre ou pas traitre telle est la question');
});

test('only exact, unambiguous matches get a link', () => {
  const base = 'https://www.dofuspourlesnoobs.com/';
  const m = matchGuides(
    [{ id: 1, name: 'Au-delà du mur' }, { id: 2, name: 'Les chasseurs' }, { id: 3, name: 'Inconnue' }, { id: 4, name: 'Doublon' }],
    [`${base}au-delagrave-du-mur.html`, `${base}les-chasseurs.html`, `${base}doublon.html`, `${base}doublon-.html`],
  );
  assert.deepEqual(m, [{ questId: 1, url: `${base}au-delagrave-du-mur.html` }, { questId: 2, url: `${base}les-chasseurs.html` }]);
});
