import { expect, test, type Page } from '@playwright/test';
import { collectErrors, expectNoErrors, localStore, seedLocal } from './helpers';

const zoneCount = (page: Page) => page.getByText(/\d+ zone\(s\) en surbrillance/);

test('world map: renders zones, toggles layers, searches, selects a zone', async ({ page }) => {
  await seedLocal(page);
  const errors = collectErrors(page);
  await page.goto('/carte');
  const map = page.getByTestId('world-map');
  await expect(map.locator('path[data-zone]').first()).toBeAttached({ timeout: 20_000 });
  expect(await map.locator('path[data-zone]').count()).toBeGreaterThan(100);
  // layers: dungeons on by default, workshops off; toggling adds markers
  const before = await map.locator('g[aria-label]').count();
  await page.getByRole('checkbox', { name: 'Ateliers' }).check();
  await expect.poll(() => map.locator('g[aria-label]').count()).toBeGreaterThan(before);
  await page.getByRole('checkbox', { name: 'Ateliers' }).uncheck();
  await expect.poll(() => map.locator('g[aria-label]').count()).toBe(before);
  // search a zone and open its details
  await page.getByLabel('Rechercher sur la carte').fill('Champs d');
  await page.getByRole('option', { name: /Champs d’Astrub|Champs d'Astrub/ }).first().click();
  const details = page.getByRole('region', { name: 'Détails' }).or(page.locator('section[aria-label="Détails"]'));
  await expect(details).toContainText('Astrub');
  await expect(details).toContainText('Ressources récoltables');
  // a resource of the zone highlights every zone where it grows
  await details.getByRole('button', { name: /^Blé/ }).click();
  await expect(zoneCount(page)).toBeVisible();
  expectNoErrors(errors);
});

test('profession → map → saved route, per character', async ({ page }) => {
  await seedLocal(page, 'Récolteur');
  const errors = collectErrors(page);
  await page.goto('/metiers/bucheron');
  // set the level on the character, then the next tier is offered
  await expect(page.getByText('Enregistré sur Récolteur')).toBeVisible(); // the character is loaded
  await page.getByLabel('Niveau de Bûcheron (nombre)').fill('45');
  await expect(page.getByText('À récolter maintenant')).toBeVisible();
  await expect(page.locator('text=Bois de Noyer').first()).toBeVisible();
  await expect.poll(async () => (await localStore(page)).characters[0] as unknown as { jobs: Record<string, number> }).toMatchObject({ jobs: { 2: 45 } });
  await page.getByRole('link', { name: 'Voir sur la carte' }).click();
  await expect(page).toHaveURL(/\/carte\?metier=2&niveau=45/);
  await expect(page.getByLabel('Métier de récolte')).toHaveValue('2', { timeout: 20_000 });
  await expect(page.getByLabel('Niveau du métier')).toHaveValue('45');
  await expect(zoneCount(page)).toBeVisible();
  // all highlighted zones into a route, ordered, saved on the character
  await page.getByRole('button', { name: 'Ajouter ces zones à l’itinéraire' }).click();
  const order = page.getByRole('list', { name: 'Ordre de visite' });
  await expect(order.locator('li').first()).toBeVisible();
  await expect(page.getByText(/Total estimé : ≈ \d+ cartes/)).toBeVisible();
  await page.getByLabel('Nom de l’itinéraire').fill('Noyer 45');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect.poll(async () => ((await localStore(page)).characters[0] as unknown as { routes: { name: string }[] }).routes.map((r) => r.name)).toEqual(['Noyer 45']);
  // the route is listed on the character profile and reopens on the map
  await page.goto('/personnage');
  await page.getByRole('link', { name: /Noyer 45/ }).click();
  await expect(page).toHaveURL(/itineraire=r/);
  await expect(page.getByRole('list', { name: 'Ordre de visite' }).locator('li').first()).toBeVisible({ timeout: 20_000 });
  expectNoErrors(errors);
});

test('profession levels are independent per character', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('dofus-companion:characters:v2')) return;
    const c = (id: string, name: string, jobs: object) => ({ id, name, level: 50, profile: { breed: 9 }, done: [], active: [], builds: [], notes: '', history: [], jobs, routes: [], updatedAt: new Date().toISOString() });
    localStorage.setItem('dofus-companion:characters:v2', JSON.stringify({ activeId: 'cone', characters: [c('cone', 'Un', { 24: 30 }), c('ctwo', 'Deux', { 24: 120 })] }));
  });
  await page.goto('/metiers/mineur');
  await expect(page.getByLabel('Niveau de Mineur (nombre)')).toHaveValue('30');
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('dofus-companion:characters:v2')!);
    localStorage.setItem('dofus-companion:characters:v2', JSON.stringify({ ...s, activeId: 'ctwo' }));
  });
  await page.reload();
  await expect(page.getByLabel('Niveau de Mineur (nombre)')).toHaveValue('120');
});

test('professions index lists the game professions with recipes', async ({ page }) => {
  await page.goto('/metiers');
  for (const name of ['Bûcheron', 'Mineur', 'Paysan', 'Alchimiste', 'Pêcheur', 'Bijoutier', 'Cordonnier', 'Tailleur']) {
    await expect(page.getByRole('link', { name: new RegExp(name) }).first()).toBeVisible();
  }
  await page.getByRole('link', { name: /Tailleur/ }).first().click();
  await expect(page.getByRole('heading', { name: /Recettes \(\d+\)/ })).toBeVisible();
  await expect(page.getByText('butin ou achat').first()).toBeVisible();
});
