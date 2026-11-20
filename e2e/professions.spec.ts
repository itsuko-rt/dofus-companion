import { expect, test } from '@playwright/test';
import { collectErrors, expectNoErrors, localStore, seedLocal } from './helpers';

test('profession level is saved on the character; the guide links to the external maps page', async ({ page }) => {
  await seedLocal(page, 'Récolteur');
  const errors = collectErrors(page);
  await page.goto('/metiers/bucheron');
  await expect(page.getByText('Enregistré sur Récolteur')).toBeVisible();
  await page.getByLabel('Niveau de Bûcheron (nombre)').fill('45');
  await expect(page.locator('text=Bois de Noyer').first()).toBeVisible();
  await expect.poll(async () => (await localStore(page)).characters[0] as unknown as { jobs: Record<string, number> }).toMatchObject({ jobs: { 2: 45 } });
  await page.getByRole('link', { name: 'Cartes interactives' }).click();
  await expect(page).toHaveURL(/\/carte$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expectNoErrors(errors);
});

test('profession levels are independent per character', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('dofus-companion:characters:v2')) return;
    const c = (id: string, name: string, jobs: object) => ({ id, name, level: 50, profile: { breed: 9 }, done: [], active: [], builds: [], notes: '', history: [], jobs, updatedAt: new Date().toISOString() });
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

test('maps page: two external tools, new tab with safe rel, no iframe; old map API gone', async ({ page, request }) => {
  const errors = collectErrors(page);
  await page.goto('/carte');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const dofusdb = page.getByRole('link', { name: /DofusDB/ });
  const maps = page.getByRole('link', { name: /Dofus Maps/ });
  await expect(dofusdb).toHaveAttribute('href', 'https://dofusdb.fr/fr/tools/map');
  await expect(maps).toHaveAttribute('href', 'https://dofus-maps.com/');
  for (const l of [dofusdb, maps]) {
    await expect(l).toHaveAttribute('target', '_blank');
    await expect(l).toHaveAttribute('rel', /noopener/);
    await expect(l).toHaveAttribute('rel', /noreferrer/);
  }
  await expect(page.locator('iframe')).toHaveCount(0);
  // old deep links still land on the directory, without errors
  await page.goto('/carte?x=4&y=-18');
  await expect(page.getByRole('link', { name: /DofusDB/ })).toBeVisible();
  expect((await request.get('/api/world/1')).status()).toBe(404);
  expectNoErrors(errors);
});

test('profession XP calculator: XP shown in game → crafts and resources, and invalid numbers are refused', async ({ page }) => {
  await page.goto('/metiers/paysan');
  await page.getByLabel('Niveau de Paysan (nombre)').fill('10');
  await page.getByLabel('XP actuelle').fill('1200');
  await page.getByLabel('XP du niveau suivant').fill('2000');
  await page.getByLabel('XP par fabrication').fill('30');
  await expect(page.getByText(/Il reste 800 XP/)).toBeVisible();
  await expect(page.getByText(/27\s+actions/)).toBeVisible();
  const recipe = page.getByLabel(/Recette \(facultatif/);
  await recipe.selectOption({ index: 1 });
  await expect(page.getByRole('heading', { name: 'Ressources à réunir' })).toBeVisible();
  await page.getByLabel('XP actuelle').fill('3000');
  await expect(page.getByRole('alert').filter({ hasText: 'dépasse' })).toBeVisible();
});

test('recipes « Avec vos métiers » keep only recipes whose ingredients the character can harvest or craft', async ({ page }) => {
  await page.addInitScript(([key]) => localStorage.setItem(key, JSON.stringify({ activeId: 'cj', characters: [{ id: 'cj', name: 'Paysanne', level: 60, profile: { breed: 9 }, done: [], active: [], builds: [], notes: '', history: [], jobs: { 28: 60 }, updatedAt: new Date().toISOString() }] })),
    ['dofus-companion:characters:v2'] as const);
  await page.goto('/metiers/paysan');
  const list = page.locator('section', { has: page.getByRole('heading', { name: /^Recettes/ }) }).locator('ul.parchment');
  const before = await list.locator(':scope > li').count();
  await page.getByLabel('Avec vos métiers').check();
  await expect.poll(async () => list.locator(':scope > li').count()).toBeLessThan(before);
  expect(await list.locator(':scope > li').count()).toBeGreaterThan(0);
  await expect(list.getByText('butin', { exact: false })).toHaveCount(0);
});
