import { expect, test } from '@playwright/test';
import { api, character, formAlert, localStore, PASSWORD, uniqueEmail } from './helpers';

test('register, wrong password, duplicate, logout through the account page', async ({ page }) => {
  const email = uniqueEmail('ui');
  await page.goto('/compte');
  await page.getByRole('tab', { name: 'Créer un compte' }).click();
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel(/Mot de passe/).fill('court');
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page.getByRole('heading', { name: 'Connexion au site' })).toBeVisible(); // browser refuses < 10 chars
  await page.getByLabel(/Mot de passe/).fill(PASSWORD);
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page.getByRole('button', { name: 'Se déconnecter' })).toBeVisible();
  // session survives a reload (cookie)
  await page.reload();
  await expect(page.getByRole('button', { name: 'Se déconnecter' })).toBeVisible();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();

  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel(/Mot de passe/).fill('mauvais-mot-de-passe');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(formAlert(page)).toHaveText('E-mail ou mot de passe incorrect.');

  await page.getByRole('tab', { name: 'Créer un compte' }).click();
  await page.getByLabel('Adresse e-mail').fill(email.toUpperCase());
  await page.getByLabel(/Mot de passe/).fill(PASSWORD);
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(formAlert(page)).toHaveText('Un compte existe déjà avec cette adresse.');
});

test('shared computer: characters of account A are never merged into account B', async ({ page }) => {
  const a = uniqueEmail('a'), b = uniqueEmail('b');
  await page.goto('/compte');
  expect((await api(page, '/api/auth/register', 'POST', { email: a, password: PASSWORD })).status).toBe(201);
  expect((await api(page, '/api/characters/caperso', 'PUT', character('caperso', 'Perso de A'))).status).toBe(200);
  await page.reload();
  await expect.poll(async () => (await localStore(page)).characters.map((c) => c.name)).toContain('Perso de A');

  // A's session ends without an explicit logout (expiry): the local copy is still there
  await api(page, '/api/auth/logout', 'POST', {});
  expect((await api(page, '/api/auth/register', 'POST', { email: b, password: PASSWORD })).status).toBe(201);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Se déconnecter' })).toBeVisible();
  await page.waitForTimeout(2000); // let any sync run
  const listB = (await api(page, '/api/characters', 'GET')).data;
  expect(listB.characters.map((c: { name: string }) => c.name)).not.toContain('Perso de A');
  expect((await localStore(page)).characters.map((c) => c.name)).not.toContain('Perso de A');

  // A's server copy is intact
  await api(page, '/api/auth/logout', 'POST', {});
  await api(page, '/api/auth/login', 'POST', { email: a, password: PASSWORD });
  const listA = (await api(page, '/api/characters', 'GET')).data;
  expect(listA.characters.map((c: { name: string }) => c.name)).toEqual(['Perso de A']);

  // explicit logout from the UI removes A's characters from this browser
  await page.reload();
  await expect.poll(async () => (await localStore(page)).characters.map((c) => c.name)).toContain('Perso de A');
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
  await expect.poll(async () => (await localStore(page)).characters.length).toBe(0);
});

test('account deletion from the UI removes the account and its characters', async ({ page }) => {
  const email = uniqueEmail('del');
  await page.goto('/compte');
  await api(page, '/api/auth/register', 'POST', { email, password: PASSWORD });
  await api(page, '/api/characters/cdel', 'PUT', character('cdel', 'À supprimer'));
  await page.reload();
  await page.getByRole('button', { name: 'Supprimer mon compte…' }).click();
  await page.getByLabel('Mot de passe').fill('pas-le-bon-mdp');
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click();
  await expect(formAlert(page)).toHaveText('Mot de passe incorrect.');
  await page.getByLabel('Mot de passe').fill(PASSWORD);
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click();
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
  expect((await api(page, '/api/auth/me', 'GET')).data.user).toBeNull();
  expect((await api(page, '/api/auth/login', 'POST', { email, password: PASSWORD })).status).toBe(401);
  expect((await localStore(page)).characters.length).toBe(0);
});

test('authorization: another user cannot read, change or delete my characters', async ({ browser }) => {
  const ctxA = await browser.newContext(), ctxB = await browser.newContext();
  const pa = await ctxA.newPage(), pb = await ctxB.newPage();
  await pa.goto('/compte'); await pb.goto('/compte');
  await api(pa, '/api/auth/register', 'POST', { email: uniqueEmail('ia'), password: PASSWORD });
  await api(pb, '/api/auth/register', 'POST', { email: uniqueEmail('ib'), password: PASSWORD });
  await api(pa, '/api/characters/cidor', 'PUT', character('cidor', 'Secret'));
  expect((await api(pb, '/api/characters', 'GET')).data.characters).toEqual([]);
  await api(pb, '/api/characters/cidor', 'DELETE');
  await api(pb, '/api/characters/cidor', 'PUT', character('cidor', 'Écrasé'));
  const mine = (await api(pa, '/api/characters', 'GET')).data;
  expect(mine.characters.map((c: { name: string }) => c.name)).toEqual(['Secret']);
  // no cookie at all
  const anon = await browser.newContext(); const pn = await anon.newPage(); await pn.goto('/compte');
  expect((await api(pn, '/api/characters', 'GET')).status).toBe(401);
  await anon.close();
  await ctxA.close(); await ctxB.close();
});
