import { expect, test } from '@playwright/test';
import { character, collectErrors, expectNoErrors, localStore, seedLocal, STORE } from './helpers';

// The sitemap (180 pages) is checked in 6 equal batches so each test stays far from its timeout when workers run in
// parallel; the batch size follows the sitemap, so a growing sitemap never leaves pages unchecked.
const SITEMAP_BATCHES = 6;
for (let b = 0; b < SITEMAP_BATCHES; b++) {
  test(`every sitemap page loads with one h1, no script error and no CSP violation (batch ${b + 1}/${SITEMAP_BATCHES})`, async ({ page, request }) => {
    test.setTimeout(120_000);
    const xml = await (await request.get('/sitemap.xml')).text();
    const all = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
    expect(all.length).toBeGreaterThan(100);
    const size = Math.ceil(all.length / SITEMAP_BATCHES);
    const paths = all.slice(b * size, (b + 1) * size);
    await seedLocal(page);
    const errors = collectErrors(page);
    const bad: string[] = [];
    for (const p of paths) {
      const r = await page.goto(p, { waitUntil: 'domcontentloaded' });
      if (r?.status() !== 200) bad.push(`${p}: ${r?.status()}`);
      const h1 = await page.locator('h1').count();
      if (h1 !== 1 && !/^\/(progression\/quetes|progression\/scan)/.test(p)) bad.push(`${p}: ${h1} h1`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
    expectNoErrors(errors);
  });
}

test('navigation bar reaches every section; skip link works from the keyboard', async ({ page, isMobile }) => {
  await seedLocal(page);
  const errors = collectErrors(page);
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Aller au contenu' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await skip.evaluate((el) => (el as HTMLElement).blur()); // a focused skip link sits over the logo
  const nav = page.getByRole('navigation', { name: 'Navigation principale' });
  for (const [label, url] of [['Progression', /\/progression\/quetes/], ['Builds', /\/builds/], ['Équipement', /\/equipement/], ['Personnages', /\/personnage/], ['Mon compte', /\/compte/], ['Accueil', /\/$/]] as const) {
    await nav.getByRole('link', { name: label }).click();
    await expect(page).toHaveURL(url);
    await expect(page.locator('main#contenu')).toBeVisible();
  }
  // the bar fits the phone width (no horizontal page scroll)
  if (isMobile) expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expectNoErrors(errors);
});

test('quest tracker: search, right-click to complete, undo, persistence', async ({ page }) => {
  await seedLocal(page);
  const errors = collectErrors(page);
  await page.goto('/progression/quetes/tutoriel-guide');
  const node = page.locator('.react-flow__node-quest', { hasText: 'Bien débuter' }).first();
  await expect(node).toBeVisible({ timeout: 20_000 });
  await node.click({ button: 'right' });
  await expect.poll(async () => (await localStore(page)).characters[0].done.length).toBeGreaterThan(0);
  const doneIds = (await localStore(page)).characters[0].done;
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(async () => (await localStore(page)).characters[0].done.length).toBe(0);
  await node.click({ button: 'right' });
  await expect.poll(async () => (await localStore(page)).characters[0].done).toEqual(doneIds);
  await page.reload();
  await expect.poll(async () => (await localStore(page)).characters[0].done).toEqual(doneIds);
  // search suggests matching quests
  await page.getByPlaceholder('Rechercher une quête…').fill('Premiers pas');
  await expect(page.locator('ul.absolute li', { hasText: 'Premiers pas' }).first()).toBeVisible();
  await page.getByPlaceholder('Rechercher une quête…').fill('');
  // status filter (behind the « Filtres » button on phones)
  const filters = page.getByRole('button', { name: 'Filtres' });
  if (await filters.isVisible()) await filters.click();
  await page.locator('select', { has: page.locator('option', { hasText: 'Tous les statuts' }) }).selectOption('available');
  expectNoErrors(errors);
});

test('achievements: "Pour vous", search, grouped categories, details, completion, filters, back button', async ({ page, isMobile }) => {
  await seedLocal(page); // a level-50 Crâ
  const errors = collectErrors(page);
  await page.goto('/progression/succes');
  // a first visit lands on "Pour vous": where to start, and suggestions at the character's level with their reason
  await expect(page.getByRole('heading', { name: 'Par où commencer ?' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'À votre niveau' })).toBeVisible();
  await expect(page.getByText(/proche du vôtre \(50\)/).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pour votre classe · Crâ' })).toBeVisible();

  // one search covers names and objectives (a monster named only in objectives), without accents
  const search = page.getByRole('searchbox', { name: /Rechercher un succès/ });
  await search.fill('kardorim');
  await expect(page.getByRole('heading', { name: /résultats? pour « kardorim »/ })).toBeVisible();
  await expect(page.locator('ul.parchment li', { hasText: 'Crypte de Kardorim' }).first()).toBeVisible();
  await search.fill('scoliopode');
  await expect(page.getByText(/Trouvé dans : objectif/).first()).toBeVisible();
  await search.press('Escape');
  await expect(search).toHaveValue('');

  // categories are grouped; on mobile they open from one "Parcourir" button
  const openCategory = async (name: string) => {
    if (isMobile) await page.getByRole('button', { name: /Parcourir/ }).click();
    await page.getByRole('navigation', { name: 'Catégories de succès' }).locator('visible=true').getByRole('button', { name: new RegExp(`^${name}`) }).click();
  };
  await openCategory('Donjons');
  await expect(page.getByRole('heading', { name: 'Donjons' })).toBeVisible();
  await expect(page.getByText('Vaincre les donjons, rangés par tranche de niveaux.')).toBeVisible();
  await page.getByRole('group', { name: 'Sous-catégories' }).getByRole('button', { name: /^Niveaux 1 à 50/ }).click();
  expect(page.url()).toContain('?c=3&s=11');

  const row = page.locator('ul.parchment li', { hasText: 'Crypte de Kardorim' }).first();
  await row.getByRole('button').first().click();
  await expect(row).toContainText('Objectifs');
  await expect(row).toContainText('Donjon : Crypte de Kardorim'); // related content from the game's dungeon data
  await row.getByRole('button', { name: 'Je l’ai obtenu' }).click();
  await expect(row.getByRole('button').first()).toContainText('Obtenu');
  await page.getByRole('button', { name: 'Obtenus', exact: true }).click();
  await expect(page.locator('ul.parchment li').first()).toContainText('Kardorim');
  expect((await localStore(page)).characters[0].done.some((d) => d.startsWith('ach:'))).toBe(true);

  // the browser's back button returns to the whole category, then to "Pour vous"
  await page.goBack();
  await expect(page.getByRole('group', { name: 'Sous-catégories' }).getByRole('button', { name: 'Toutes' })).toHaveAttribute('aria-pressed', 'true');
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'À votre niveau' })).toBeVisible();
  // nothing wider than the screen (sub-category chips scroll inside their own row on phones)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expectNoErrors(errors);
});

test('characters: create, switch, independent progression, delete', async ({ page }) => {
  await seedLocal(page, 'Premier');
  const errors = collectErrors(page);
  await page.addInitScript(() => { window.confirm = () => true; });
  await page.goto('/personnage');
  await page.getByRole('button', { name: 'Nouveau personnage' }).click();
  await page.locator('main#contenu button[aria-pressed]').first().click(); // class
  await page.getByPlaceholder('ex. Arkhane').fill('Second');
  for (let i = 0; i < 6; i++) {
    const create = page.getByRole('button', { name: 'Créer mon personnage' });
    if (await create.isVisible()) { await create.click(); break; }
    const next = page.getByRole('button', { name: 'Continuer' });
    if (await next.isDisabled()) await page.locator('main#contenu button[aria-pressed="false"]').first().click(); // e.g. play style
    await next.click();
  }
  await expect.poll(async () => (await localStore(page)).characters.map((c) => c.name)).toEqual(['Premier', 'Second']);
  const store = await localStore(page);
  expect(store.characters[1].done).toEqual([]); // the new one starts empty, the first one keeps its own
  await page.getByRole('button', { name: /Supprimer ce personnage/ }).click();
  await expect.poll(async () => (await localStore(page)).characters.map((c) => c.name)).toEqual(['Premier']);
  expectNoErrors(errors);
});

test('scanner refuses invalid files with a readable message', async ({ page }) => {
  await seedLocal(page);
  const errors = collectErrors(page);
  await page.goto('/progression/scan');
  await page.locator('input[type=file]').setInputFiles([
    { name: 'virus.exe.png', mimeType: 'image/png', buffer: Buffer.from([0x4d, 0x5a, 0x90, 0]) },
    { name: '<img src=x onerror=alert(1)>.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') },
  ]);
  await expect(page.getByText('Image illisible : utilisez une capture PNG, JPEG ou WebP.')).toHaveCount(2);
  await expect(page.getByText('<img src=x onerror=alert(1)>.txt')).toBeVisible(); // shown as text, not markup
  expectNoErrors(errors);
});

test('builds page shows community builds or an explicit error, never a blank page', async ({ page }) => {
  await seedLocal(page);
  await page.goto('/builds');
  await expect(page.getByText(/Voir l’équipement|Fashionista ne répond pas|Aucun build/i).first()).toBeVisible({ timeout: 45_000 });
});

test('first visit without a saved character: pages opened directly render their content', async ({ page }) => {
  // no seedLocal: a brand-new visitor (these pages stayed blank until 2026-11-20)
  const errors = collectErrors(page);
  await page.goto('/personnage');
  await expect(page.getByText('Quelle est votre classe')).toBeVisible();
  await page.goto('/builds');
  await expect(page.getByText(/Des équipements complets partagés sur Dofus Fashionista/)).toBeVisible();
  expectNoErrors(errors);
});

test('class-aware progression: an Iop sees its class quests and achievements, not the Crâ class quest', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the region list is a drawer on mobile; the logic is the same');
  const errors = collectErrors(page);
  await page.addInitScript(([key, c]) => localStorage.setItem(key, JSON.stringify({ activeId: c.id, characters: [c] })),
    [STORE, character('ciop', 'Iopette', { level: 30, profile: { breed: 8 } })] as const);
  await page.goto('/progression/quetes/astrub');
  const panel = page.getByRole('region', { name: 'Quêtes de classe Iop' });
  await expect(panel).toBeVisible();
  await expect(panel.getByText('Iop et hop')).toBeVisible(); // the Iop's Astrub class quest (PG=8)
  await expect(page.locator('.react-flow__node', { hasText: "C'est pour ta pomme" })).toHaveCount(0); // Crâ only (PG=9)
  await page.goto('/progression/succes');
  await expect(page.getByRole('heading', { name: 'Pour votre classe · Iop' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Dopeul Iop/ })).toBeVisible();
  await expect(page.getByText('Porte le nom de votre classe (Iop) ; ouvert à tous.').first()).toBeVisible(); // the reason is shown
  await expect(page.getByRole('button', { name: /Dopeul Crâ/ })).toHaveCount(0);
  expectNoErrors(errors);
});

test('level page: the game suggestions, zones and dungeons follow the chosen level', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/progression/niveau');
  await page.getByLabel('Niveau', { exact: true }).fill('50');
  await expect(page.getByText('Donjon des Forgerons', { exact: true }).first()).toBeVisible(); // suggested by the game at 50
  await expect(page.getByRole('heading', { name: 'Zones et monstres de votre niveau' })).toBeVisible();
  await page.getByLabel('Niveau', { exact: true }).fill('200');
  await expect(page.getByText('Donjon des Forgerons', { exact: true })).toHaveCount(0); // ("Expédition - Donjon des Forgerons" is a 190–200 dungeon)
  expectNoErrors(errors);
});

test('quest drawer shows where objective monsters live and where items come from', async ({ page }) => {
  await seedLocal(page);
  const errors = collectErrors(page);
  await page.goto('/progression/quetes/9#quest:64'); // Alignement Bonta
  await expect(page.getByRole('heading', { name: 'Où trouver' })).toBeVisible();
  await expect(page.getByText(/vit en Champs de Cania/)).toBeVisible();
  await expect(page.getByText(/butin : Sanglier agressif/)).toBeVisible();
  expectNoErrors(errors);
});

test('equipment cards say how to obtain the item (recipe or drops)', async ({ page }) => {
  await seedLocal(page); // level 50: the level-20 item passes the « portable à mon niveau » filter
  await page.goto('/equipement');
  await page.getByPlaceholder('Nom d’un objet…').fill('Coiffe du Bouftou');
  const card = page.locator('li', { has: page.getByRole('heading', { name: 'Coiffe du Bouftou', exact: true }) });
  await expect(card.getByText(/fabriqué par/)).toBeVisible();
  await expect(card.getByRole('link', { name: /Tailleur niv\. 20/ })).toBeVisible();
});

test('class page: official description, class quests with links, linked achievements', async ({ page }) => {
  await page.goto('/personnage/sorts/huppermage');
  const overview = page.getByRole('region', { name: 'La classe Huppermage' });
  await expect(overview.getByText(/vénèrent la Balance Krosmique/)).toBeVisible(); // official description
  await expect(overview.getByRole('link', { name: "Les paroles s'envolent, les aigris restent" })).toHaveAttribute('href', /#quest:1677$/);
  await expect(overview.getByText(/Dopeul Huppermage/)).toBeVisible();
});

test('home page shows the Almanax of the day from the game calendar', async ({ page }) => {
  await seedLocal(page);
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByText('Almanax du jour')).toBeVisible();
  await expect(page.getByText(/Offrande : \d+ × /)).toBeVisible();
  await expect(page.getByText('Prochains jours')).toBeVisible();
  expectNoErrors(errors);
});
