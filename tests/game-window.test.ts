import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDofusTitle } from '../src/game-window.ts';
import breeds from '../src/breed-data.json' with { type: 'json' };

test('game window title: character, class, version; hyphenated names kept whole', () => {
  assert.deepEqual(parseDofusTitle('Abc-Defgh - Huppermage - 3.7.14.18 - Release'), {
    version: '3.7.14.18', channel: 'Release', character: { name: 'Abc-Defgh', className: 'Huppermage', breedId: 17 },
  });
  // accents and case do not matter for the class; an unknown class keeps its name, without an id
  assert.equal(parseDofusTitle('Zed - CRA - 3.7.14.18 - Beta')?.character?.breedId, 9);
  assert.equal(parseDofusTitle('Zed - Nouvelleclasse - 3.8.0.1 - Release')?.character?.breedId, null);
});

test('game window title: every class of the game data is recognised', () => {
  for (const b of breeds as { id: number; name: string }[]) {
    assert.equal(parseDofusTitle(`Perso - ${b.name} - 3.7.14.18 - Release`)?.character?.breedId, b.id, b.name);
  }
});

test('game window title: login screens have no character; other windows are not DOFUS', () => {
  assert.deepEqual(parseDofusTitle('Dofus'), { version: '', channel: '', character: null });
  assert.equal(parseDofusTitle('Dofus - 3.7.14.18 - Release')?.character, null);
  for (const t of ['Dofus - Wikipédia - Google Chrome', 'Ankama Launcher', 'Atlas des Douze — Succès', 'a - b - c - d', '']) {
    assert.equal(parseDofusTitle(t), null, t);
  }
});
