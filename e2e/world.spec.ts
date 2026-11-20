import { expect, test, type Page } from '@playwright/test';
import { collectErrors, expectNoErrors, localStore, seedLocal } from './helpers';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

/** On a phone the filter panel starts folded. */
async function openFilters(page: Page) {
  const btn = page.getByRole('button', { name: 'Afficher les filtres' });
  if (await btn.isVisible()) await btn.click();
}

test('world map: artwork, zones, layers, coordinate search, map details, /travel copy', async ({ page, isMobile }) => {
  await seedLocal(page);
  const errors = collectErrors(page);
  await page.goto('/carte');
  const map = page.getByTestId('world-map');
  await expect(map.locator('path[data-zone]').first()).toBeAttached({ timeout: 30_000 });
  expect(await map.locator('path[data-zone]').count()).toBeGreaterThan(100);
  // official artwork tiles when installed (npm run assets); the map works without
  const tiles = await map.locator('image[href^="/ankama/worldmap/"]').count();
  test.info().annotations.push({ type: 'artwork tiles', description: String(tiles) });

  // layers: workshops off by default, on adds markers
  await openFilters(page);
  await page.getByRole('tab', { name: /Repères/ }).click();
  const before = await map.locator('g[data-marker]').count();
  await page.getByRole('checkbox', { name: 'Ateliers' }).check();
  await expect.poll(() => map.locator('g[data-marker]').count()).toBeGreaterThan(before);

  // search palette with coordinates → map details
  if (!isMobile) await page.keyboard.press('Control+k');
  else await page.getByRole('button', { name: /Rechercher : coordonnées/ }).click();
  const input = page.getByRole('combobox', { name: 'Rechercher sur la carte' });
  await input.fill('5,-18');
  await input.press('Enter');
  const details = page.getByRole('region', { name: 'Détails de la carte' });
  await expect(details).toContainText('[5, -18]');
  await expect(details).toContainText("Cité d'Astrub");
  await expect(details.getByRole('button', { name: 'Copier /travel 5,-18' })).toBeVisible();
  await expect(map.getByTestId('selected-map')).toBeAttached();
  if (!isMobile) {
    await page.keyboard.press('c');
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('/travel 5,-18');
    await page.keyboard.press('Escape');
    await expect(details).toBeHidden();
    // "/" also opens the search; a zone by name
    await page.keyboard.press('/');
    await page.getByRole('combobox', { name: 'Rechercher sur la carte' }).fill('Champs d');
    await page.getByRole('option', { name: /Champs d.Astrub/ }).first().click();
    await expect(page.getByRole('region', { name: 'Détails de la carte' })).toContainText('Récolte dans la zone');
  }
  expectNoErrors(errors);
});

test('resource filters: profession level, select all reachable, markers, clear', async ({ page }) => {
  await seedLocal(page);
  const errors = collectErrors(page);
  await page.goto('/carte');
  await expect(page.getByTestId('world-map').locator('path[data-zone]').first()).toBeAttached({ timeout: 30_000 });
  await openFilters(page);
  const miner = page.getByRole('region', { name: 'Mineur' });
  await miner.getByRole('button', { name: /Mineur/ }).click();
  await miner.getByLabel('Niveau de Mineur').fill('60');
  await miner.getByRole('button', { name: /Tout afficher/ }).click();
  await expect(miner.getByRole('checkbox', { name: /^Fer, niveau 1$/ })).toBeChecked();
  await expect(miner.getByRole('checkbox', { name: /^Kobalte, niveau 60$/ })).toBeChecked();
  await expect(miner.getByRole('checkbox', { name: /^Or, niveau/ })).not.toBeChecked(); // above level 60
  await expect.poll(() => page.locator('g[data-marker^="res:"]').count()).toBeGreaterThan(0);
  await page.getByRole('button', { name: /Tout effacer/ }).click();
  await expect.poll(() => page.locator('g[data-marker^="res:"]').count()).toBe(0);
  expectNoErrors(errors);
});

test('profession → map → saved route, per character', async ({ page }) => {
  await seedLocal(page, 'Récolteur');
  const errors = collectErrors(page);
  await page.goto('/metiers/bucheron');
  await expect(page.getByText('Enregistré sur Récolteur')).toBeVisible();
  await page.getByLabel('Niveau de Bûcheron (nombre)').fill('45');
  await expect(page.locator('text=Bois de Noyer').first()).toBeVisible();
  await expect.poll(async () => (await localStore(page)).characters[0] as unknown as { jobs: Record<string, number> }).toMatchObject({ jobs: { 2: 45 } });
  await page.getByRole('link', { name: 'Voir sur la carte' }).click();
  await expect(page).toHaveURL(/\/carte\?metier=2&niveau=45/);
  await page.getByTestId('world-map').locator('path[data-zone]').first().waitFor({ state: 'attached', timeout: 30_000 });
  await openFilters(page);
  const lj = page.getByRole('region', { name: 'Bûcheron' });
  await expect(lj.getByLabel('Niveau de Bûcheron')).toHaveValue('45', { timeout: 30_000 });
  await expect(lj.getByRole('checkbox', { name: /^Bois de Noyer, niveau 40$/ })).toBeChecked();
  await page.getByRole('tab', { name: /Itinéraire/ }).click();
  await page.getByRole('button', { name: /Ajouter les \d+ zones en surbrillance/ }).click();
  await expect(page.getByRole('list', { name: 'Ordre de visite' }).locator('li').first()).toBeVisible();
  await expect(page.getByText(/Total estimé : ≈ \d+ cartes/)).toBeVisible();
  await page.getByLabel('Nom de l’itinéraire').fill('Noyer 45');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect.poll(async () => ((await localStore(page)).characters[0] as unknown as { routes: { name: string }[] }).routes.map((r) => r.name)).toEqual(['Noyer 45']);
  await page.goto('/personnage');
  await page.getByRole('link', { name: /Noyer 45/ }).click();
  await expect(page).toHaveURL(/itineraire=r/);
  await page.getByTestId('world-map').locator('path[data-zone]').first().waitFor({ state: 'attached', timeout: 30_000 });
  await openFilters(page);
  await expect(page.getByRole('list', { name: 'Ordre de visite' }).locator('li').first()).toBeVisible({ timeout: 30_000 });
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
