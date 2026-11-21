import { expect, test } from '@playwright/test';
import { collectErrors, expectNoErrors, seedLocal } from './helpers';

const noOverflow = (page: import('@playwright/test').Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test('encyclopaedia: search → monster → its drop → back to the monster, sheets linked both ways', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/encyclopedie');
  await page.getByRole('combobox', { name: 'Rechercher dans l’encyclopédie' }).fill('bouftou');
  await page.getByRole('group', { name: 'Type de fiche' }).getByRole('button', { name: 'Monstres' }).click();
  const first = page.getByRole('option').first();
  await expect(first).toContainText('Bouftou');
  await expect(first).toContainText('Bouftous'); // the regular monster before summons of the same name
  await first.click();
  await expect(page.getByRole('heading', { level: 1, name: 'Bouftou' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Coin des Bouftous/ })).toBeVisible();
  await page.getByRole('link', { name: /Laine de Bouftou/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Laine de Bouftou' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lâché par' })).toBeVisible();
  await page.getByRole('link', { name: /^Bouftou/ }).first().click();
  await expect(page).toHaveURL(/\/encyclopedie\/monstre\/\d+-bouftou/);
  // drop odds: exact maths, invalid input refused
  const rate = page.getByLabel('Taux par combat (%)');
  await rate.fill('1');
  await page.getByLabel('Combats').fill('100');
  await expect(page.getByText('63,4 %')).toBeVisible();
  await rate.fill('abc');
  await expect(page.getByText(/^Un taux entre 0 et 100/)).toBeVisible();
  expect(await noOverflow(page)).toBe(true);
  expectNoErrors(errors);
});

test('encyclopaedia: unknown sheets are 404, dungeon sheet links its key, bosses and achievements', async ({ page }) => {
  expect((await page.goto('/encyclopedie/monstre/999999999-rien'))?.status()).toBe(404);
  expect((await page.goto('/encyclopedie/objet/abc'))?.status()).toBe(404);
  await page.goto('/encyclopedie/donjon/1-cour-du-bouftou-royal');
  await expect(page.getByRole('link', { name: /Clef de la Cour du Bouftou Royal/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Bouftou Royal/ }).first()).toBeVisible();
  const ach = page.getByRole('heading', { name: 'Succès du donjon' }).locator('xpath=ancestor::section').getByRole('link').first();
  await expect(ach).toHaveAttribute('href', /\/progression\/succes\?c=\d+.*&a=\d+/);
});

test('atelier: an item sheet adds to the list, totals follow "J’ai" and done crafts', async ({ page }) => {
  await seedLocal(page);
  const errors = collectErrors(page);
  await page.goto('/encyclopedie/objet/8463-abracaska-ancestral');
  await page.getByRole('button', { name: /Ajouter « Abracaska Ancestral » à l’atelier/ }).click();
  await page.getByRole('link', { name: 'voir l’atelier' }).click();
  await expect(page.getByRole('link', { name: 'Abracaska Ancestral' })).toBeVisible();
  await expect(page.getByText('Tailleur niv. 114')).toBeVisible();
  const missing = page.getByText(/manquantes/);
  await expect(missing).toBeVisible();
  const before = Number((await missing.innerText()).replace(/\D/g, ''));
  // "J'ai" on the first resource lowers what is missing
  const have = page.getByLabel(/déjà possédée/).first();
  await have.fill('1');
  await expect.poll(async () => Number((await missing.innerText()).replace(/\D/g, ''))).toBe(before - 1);
  // the list survives a reload (per character, this browser)
  await page.reload();
  await expect(page.getByRole('link', { name: 'Abracaska Ancestral' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Abracaska Ancestral : fait' }).check();
  await expect(page.getByText('Tous les crafts sont faits.')).toBeVisible();
  expect(await noOverflow(page)).toBe(true);
  expectNoErrors(errors);
});

test('companion: a Dofus guide step by step, position kept, quest marked in the tracker', async ({ page }) => {
  await seedLocal(page);
  const errors = collectErrors(page);
  await page.goto('/guides/dofus/argente');
  await page.getByRole('link', { name: /Suivre pas à pas dans le compagnon/ }).click();
  await expect(page.getByText(/^Étape 1 \/ \d+/)).toBeVisible({ timeout: 20_000 });
  const first = await page.locator('article h2').innerText();
  await page.getByRole('button', { name: 'Quête terminée' }).click();
  await expect(page.getByText(/^Étape 2 \/ \d+/)).toBeVisible();
  await page.keyboard.press('ArrowLeft'); // keyboard navigation
  await expect(page.getByText(/^Étape 1 \/ \d+/)).toBeVisible();
  await expect(page.getByText('Faite', { exact: true })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await page.reload();
  await expect(page.getByText(/^Étape 2 \/ \d+/)).toBeVisible({ timeout: 20_000 }); // position saved per character
  const store = await page.evaluate(() => JSON.parse(localStorage.getItem('dofus-companion:characters:v2')!).characters[0].done as string[]);
  expect(store.some((d) => d.startsWith('quest:'))).toBe(true);
  expect(first.length).toBeGreaterThan(0);
  // "Ouvrir au premier plan": an always-on-top window, else a popup, else a visible message: never a silent failure
  await page.getByRole('button', { name: 'Ouvrir au premier plan' }).click();
  await expect(page.getByText(/ouvert dans sa fenêtre|fenêtre normale|a refusé d’ouvrir/).first()).toBeVisible();
  expectNoErrors(errors);
});

test('achievement link from another page opens it; its dungeon row leads to the dungeon sheet', async ({ page, isMobile }) => {
  await seedLocal(page);
  await page.goto('/progression/succes?c=3&s=11&a=33');
  const details = page.getByRole('region', { name: 'Détails : Crypte de Kardorim' });
  await expect(details).toBeVisible({ timeout: 20_000 });
  await details.getByRole('link', { name: /Donjon : Crypte de Kardorim/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Crypte de Kardorim' })).toBeVisible();
  if (isMobile) expect(await noOverflow(page)).toBe(true);
});
