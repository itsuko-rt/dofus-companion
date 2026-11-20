import { test } from 'node:test';
import assert from 'node:assert/strict';
import { objectiveTargets } from '../src/objective-targets.ts';

test('monsters and items are read only from the game objective templates', () => {
  assert.deepEqual(objectiveTargets('Vaincre x3 Renégat bontarien en un seul combat'), { monster: 'Renégat bontarien' });
  assert.deepEqual(objectiveTargets('Vaincre x1 Bouftou sur la carte 12345 en un seul combat'), { monster: 'Bouftou' });
  assert.deepEqual(objectiveTargets('Vaincre x2 Tofu'), { monster: 'Tofu' });
  assert.deepEqual(objectiveTargets('Monstre à vaincre : Kardorim'), { monster: 'Kardorim' });
  assert.deepEqual(objectiveTargets('Eliminer Bworkette.'), { monster: 'Bworkette' });
  assert.deepEqual(objectiveTargets('Ramener à Ebru of El: x1 Badge du chef des renégats'), { item: 'Badge du chef des renégats' });
  assert.deepEqual(objectiveTargets('Ramener à Terra Cogita: x1 Potion de Souvenir: Mémoire'), { item: 'Potion de Souvenir: Mémoire' });
  assert.deepEqual(objectiveTargets('Fabriquer 1 Pain d\'Incarnam et fermer l\'interface'), { item: "Pain d'Incarnam" });
  // free text is never parsed
  assert.deepEqual(objectiveTargets('Trouver le chef des renégats caché au sud du Territoire des bandits'), {});
  assert.deepEqual(objectiveTargets('Aller voir Guerrier Bishom Pot'), {});
});
