// The site and the Windows companion, end to end: a stand-in companion (the companion's own API module, on its real
// port) serves events; the real site, in a browser, pairs with it and writes progress. Characters are fictional.
// The real companion must not be running during this test (same port).
import { expect, test, type Page } from '@playwright/test';
import type { Server } from 'node:http';
import { createApi, PORT } from '../companion/api.mjs';
import { collectErrors, localStore, seedLocal, STORE } from './helpers';

const TOKEN = 'c0ffee'.repeat(10) + 'abcd';
let n = 0;
const id = () => `${Date.now().toString(36).padStart(10, '0')}${(++n).toString(16).padStart(16, '0')}`;
const at = () => new Date().toISOString();

/** A stand-in companion: mode, events, and what the site answered. */
function fakeCompanion(origin: string) {
  const c = {
    mode: 'assisted', stopped: false, events: [] as Record<string, unknown>[], acks: new Map<string, string>(), replayAll: false,
    server: null as Server | null,
    seen(characterKey: string, className = 'Iop', breedId = 8) { const e = { eventId: id(), at: at(), type: 'character.seen', characterKey, className, breedId }; c.events.push(e); return e; },
    quest(characterKey: string, objectId: string, name: string, certain = true) {
      const e = { eventId: id(), at: at(), type: 'quest.completed', characterKey, objectId, name, certain, confidence: certain ? 0.9 : 0.6, evidence: { source: 'ocr', screen: 'quests-done', text: name } };
      c.events.push(e); return e;
    },
    async start() {
      c.server = createApi({
        token: () => TOKEN, origins: () => [origin],
        status: () => ({ mode: c.mode, stopped: c.stopped, dofus: true, list: 'quests-done', active: null }),
        // replayAll: a companion that lost track and sends everything again (restart): the site must not apply twice
        events: (after: string | null) => c.events.filter((e) => c.replayAll || !after || (e.eventId as string) > after),
        ack: (list: { eventId: string; status: string }[]) => { for (const a of list) c.acks.set(a.eventId, a.status); },
        control: (x: { mode?: string; stop?: boolean }) => { if (x.mode) c.mode = x.mode; if (typeof x.stop === 'boolean') c.stopped = x.stop; },
      });
      await new Promise<void>((r) => c.server!.listen(PORT, '127.0.0.1', r));
    },
    stop: () => new Promise<void>((r) => { c.server?.closeAllConnections(); c.server?.close(() => r()); }),
  };
  return c;
}

const chars = async (page: Page) => (await localStore(page)).characters as unknown as { id: string; name: string; gameName?: string; account?: string; server?: string; done: string[]; history: { eventId?: string; source: string }[]; profile: { breed?: number } }[];
const activeId = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).activeId as string, STORE);

test.describe.configure({ mode: 'serial' });

test('pairing, profiles by exact name, assisted and automatic modes, duplicates, restarts and disconnection', async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  const origin = new URL(baseURL!).origin;
  const fake = fakeCompanion(origin);
  await fake.start();
  try {
    await seedLocal(page, 'Mon premier');
    const errors = collectErrors(page);
    await page.goto('/compagnon');

    // a wrong code is refused, the right one pairs
    await page.getByLabel('Code d’appairage').fill('b'.repeat(64));
    await page.getByRole('button', { name: 'Relier' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Code d’appairage refusé' })).toBeVisible();
    await page.getByLabel('Code d’appairage').fill(TOKEN);
    await page.getByRole('button', { name: 'Relier' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Relié' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Compagnon Windows relié/ })).toBeVisible(); // nav badge

    // a new character: nothing is created without a click
    const seen = fake.seen('Abc-Def', 'Iop', 8);
    await expect(page.getByText('Nouveau personnage vu dans DOFUS : Abc-Def')).toBeVisible();
    expect((await chars(page)).map((c) => c.name)).toEqual(['Mon premier']);
    await expect.poll(() => fake.acks.get(seen.eventId)).toBe('pending');
    await page.getByRole('button', { name: 'Créer son profil' }).click();
    await expect.poll(async () => (await chars(page)).find((c) => c.gameName === 'Abc-Def')?.profile.breed).toBe(8);
    const abc = (await chars(page)).find((c) => c.gameName === 'Abc-Def')!;
    expect(await activeId(page)).toBe(abc.id);
    await expect.poll(() => fake.acks.get(seen.eventId)).toBe('applied');

    // assisted: a certain reading still waits for the player
    const q1 = fake.quest('Abc-Def', 'quest:1093', 'Offrande à Danizzal');
    await expect(page.getByRole('button', { name: 'Confirmer : Quête terminée : Offrande à Danizzal' })).toBeVisible();
    expect((await chars(page)).find((c) => c.id === abc.id)!.done).toEqual([]);
    await page.getByRole('button', { name: 'Confirmer : Quête terminée : Offrande à Danizzal' }).click();
    await expect.poll(async () => (await chars(page)).find((c) => c.id === abc.id)!.done).toEqual(['quest:1093']);
    expect((await chars(page)).find((c) => c.id === abc.id)!.history.at(-1)).toMatchObject({ source: 'companion', eventId: q1.eventId });
    await expect.poll(() => fake.acks.get(q1.eventId)).toBe('applied');

    // automatic: certain readings are written at once; an uncertain one waits; the other character is untouched
    await page.getByRole('radio', { name: 'Automatique' }).click(); // checked once the companion answers
    await expect.poll(() => fake.mode).toBe('automatic');
    fake.quest('Abc-Def', 'quest:1556', 'La chapelle noire');
    const unsure = fake.quest('Abc-Def', 'quest:2073', 'Question d’évolution', false);
    await expect.poll(async () => (await chars(page)).find((c) => c.id === abc.id)!.done).toEqual(['quest:1093', 'quest:1556']);
    await expect(page.getByRole('button', { name: 'Confirmer : Quête terminée : Question d’évolution' })).toBeVisible();
    await expect.poll(() => fake.acks.get(unsure.eventId)).toBe('pending');
    expect((await chars(page)).find((c) => c.name === 'Mon premier')!.done).toEqual([]);

    // a close name is another character: a new card, never merged
    fake.seen('Abc-Deff');
    await expect(page.getByText('Nouveau personnage vu dans DOFUS : Abc-Deff')).toBeVisible();
    const p2 = fake.quest('Abc-Deff', 'quest:18', 'Wogew l’hewmite');
    await expect.poll(() => fake.acks.get(p2.eventId)).toBe('pending');
    expect((await chars(page)).find((c) => c.id === abc.id)!.done).not.toContain('quest:18');
    // linking it to the existing profile applies its waiting certain reading there (automatic mode)
    await page.getByLabel('Profil existant pour Abc-Deff').selectOption({ label: 'Mon premier' });
    await page.getByRole('button', { name: 'Associer' }).click();
    await expect.poll(async () => (await chars(page)).find((c) => c.name === 'Mon premier')!.done).toEqual(['quest:18']);

    // a restart of the page, then a companion that sends everything again: nothing is applied twice
    await page.reload();
    fake.replayAll = true;
    await expect(page.getByRole('status').filter({ hasText: 'Relié' })).toBeVisible();
    await page.waitForTimeout(3000);
    const after = await chars(page);
    expect(after.find((c) => c.id === abc.id)!.done).toEqual(['quest:1093', 'quest:1556']);
    expect(after.find((c) => c.id === abc.id)!.history.filter((h) => h.source === 'companion')).toHaveLength(2);
    expect(after.filter((c) => c.gameName === 'Abc-Def')).toHaveLength(1);
    fake.replayAll = false;
    // the waiting reading survived the reload
    await expect(page.getByRole('button', { name: 'Confirmer : Quête terminée : Question d’évolution' })).toBeVisible();

    // the emergency stop from the site reaches the companion
    await page.getByRole('button', { name: 'Arrêt d’urgence' }).click();
    await expect.poll(() => fake.stopped).toBe(true);
    await page.getByRole('button', { name: 'Reprendre' }).click();
    await expect.poll(() => fake.stopped).toBe(false);

    // the companion goes away, then comes back: the site says so, then carries on
    await fake.stop();
    await expect(page.getByRole('status').filter({ hasText: 'Déconnecté' })).toBeVisible({ timeout: 15_000 });
    await fake.start();
    const back = fake.quest('Abc-Def', 'quest:434', 'Apprentissage : Disciple de Jiva');
    await expect.poll(async () => (await chars(page)).find((c) => c.id === abc.id)!.done, { timeout: 20_000 }).toContain('quest:434');
    await expect.poll(() => fake.acks.get(back.eventId)).toBe('applied');

    // expected in the console: the deliberate wrong code (401) and the stopped companion
    expect(errors.filter((e) => !/ERR_CONNECTION_REFUSED|Failed to fetch|net::ERR|status of 401/.test(e))).toEqual([]);
  } finally {
    await fake.stop();
  }
});

test('two characters on two accounts: the active profile follows the game, readings never cross, unlinking', async ({ page, baseURL }) => {
  test.setTimeout(90_000);
  const fake = fakeCompanion(new URL(baseURL!).origin);
  fake.mode = 'automatic';
  await fake.start();
  try {
    await seedLocal(page, 'Sans lien');
    await page.goto('/compagnon');
    await page.getByLabel('Code d’appairage').fill(TOKEN);
    await page.getByRole('button', { name: 'Relier' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Relié' })).toBeVisible();

    // two characters, one per account (two DOFUS windows): both get a profile on the player's click
    fake.seen('Alpha-Un', 'Crâ', 9);
    await page.getByText('Nouveau personnage vu dans DOFUS : Alpha-Un').waitFor();
    await page.getByRole('button', { name: 'Créer son profil' }).click();
    fake.seen('Beta-Deux', 'Sadida', 10);
    await page.getByText('Nouveau personnage vu dans DOFUS : Beta-Deux').waitFor();
    await page.getByRole('button', { name: 'Créer son profil' }).click();
    await expect.poll(async () => (await chars(page)).filter((c) => c.gameName).map((c) => c.gameName).sort()).toEqual(['Alpha-Un', 'Beta-Deux']);
    const byName = async (n: string) => (await chars(page)).find((c) => c.gameName === n)!;
    const alpha = await byName('Alpha-Un'), beta = await byName('Beta-Deux');
    expect(await activeId(page)).toBe(beta.id);

    // the player goes back to the first window: the site follows
    fake.seen('Alpha-Un', 'Crâ', 9);
    await expect.poll(() => activeId(page)).toBe(alpha.id);
    // a reading of the other window, while Alpha is active, goes to Beta only
    fake.quest('Beta-Deux', 'quest:1556', 'La chapelle noire');
    fake.quest('Alpha-Un', 'quest:1093', 'Offrande à Danizzal');
    await expect.poll(async () => [(await byName('Alpha-Un')).done, (await byName('Beta-Deux')).done]).toEqual([['quest:1093'], ['quest:1556']]);
    expect(await activeId(page)).toBe(alpha.id);
    expect((await chars(page)).find((c) => c.name === 'Sans lien')!.done).toEqual([]);

    // account and server labels, kept with the profile
    await page.getByLabel('Compte de Beta-Deux').fill('Compte secondaire');
    await page.getByLabel('Serveur de Beta-Deux').fill('Draconiros');
    await page.getByLabel('Serveur de Beta-Deux').blur();
    await expect.poll(async () => { const b = await byName('Beta-Deux'); return [b.account, b.server]; }).toEqual(['Compte secondaire', 'Draconiros']);
    await expect(page.getByText('Compte secondaire', { exact: true })).toBeVisible(); // a second account group appears

    // unlinking: the profile keeps its progress, and the name is a stranger again
    await page.getByRole('button', { name: 'Délier Beta-Deux du jeu' }).click();
    await expect.poll(async () => (await chars(page)).find((c) => c.id === beta.id)!.gameName).toBeUndefined();
    expect((await chars(page)).find((c) => c.id === beta.id)!.done).toEqual(['quest:1556']);
    fake.quest('Beta-Deux', 'quest:18', 'Wogew l’hewmite');
    fake.seen('Beta-Deux', 'Sadida', 10);
    await expect(page.getByText('Nouveau personnage vu dans DOFUS : Beta-Deux')).toBeVisible();
    expect((await chars(page)).find((c) => c.id === beta.id)!.done).toEqual(['quest:1556']);
  } finally {
    await fake.stop();
  }
});

test('without pairing, nothing calls the companion and the site works as before', async ({ page }) => {
  await seedLocal(page);
  const calls: string[] = [];
  page.on('request', (r) => { if (r.url().includes(`:${PORT}`)) calls.push(r.url()); });
  await page.goto('/compagnon');
  await expect(page.getByRole('heading', { name: 'Compagnon Windows' })).toBeVisible();
  await page.goto('/progression/quetes');
  await page.waitForTimeout(1500);
  expect(calls).toEqual([]);
  await expect(page.getByRole('link', { name: /Compagnon Windows/ })).toHaveCount(0);
});
