// Scanner, end to end with the real in-browser OCR: images drawn like the game's quest and achievement lists
// (dark panel, beige text, tabs, a region header, level column, icons), uploaded as the player would.
// They are synthetic: accuracy on real DOFUS screenshots is checked separately (docs/RAPPORT_SUCCES_SCAN.md).
import { expect, test, type Page } from '@playwright/test';
import { collectErrors, expectNoErrors, localStore, seedLocal } from './helpers';

const QUESTS: [string, string][] = [
  ['quest:18', "Wogew l'hewmite"], ['quest:434', 'Apprentissage : Disciple de Jiva'], ['quest:849', 'Glugubrr est un vilain grincheux'],
  ['quest:1093', 'Offrande à Danizzal'], ['quest:1556', 'La chapelle noire'], ['quest:1807', 'Le monde entier est un cactus'], ['quest:2073', "Question d'évolution"],
];
const ACHIEVEMENTS: [string, string][] = [
  ['ach:20', 'Antichambre du Glourséleste'], ['ach:486', 'Mine de Sakaï'], ['ach:900', 'Harebourg et Frizz'], ['ach:1428', "Pierres de l'élévation"], ['ach:5811', 'Belladone (Mains Propres)'],
];

/** Draws a game-like list window and returns it as a file buffer. */
async function gameList(page: Page, o: { tabs: string[]; header: string; rows: string[]; px: number; type: 'image/png' | 'image/jpeg' }) {
  const url = await page.evaluate((o) => {
    const c = document.createElement('canvas');
    c.width = 1280; c.height = 760;
    const g = c.getContext('2d')!;
    const bg = g.createLinearGradient(0, 0, 0, 760); bg.addColorStop(0, '#2b2219'); bg.addColorStop(1, '#17120d');
    g.fillStyle = bg; g.fillRect(0, 0, 1280, 760);
    g.fillStyle = '#3a2e22'; g.fillRect(200, 60, 880, 640);          // window panel
    g.strokeStyle = '#6b5638'; g.lineWidth = 2; g.strokeRect(200, 60, 880, 640);
    g.font = `bold ${o.px + 2}px "Segoe UI", Arial, sans-serif`;
    o.tabs.forEach((t, i) => { g.fillStyle = i === o.tabs.length - 1 ? '#e8c77a' : '#9c8a6c'; g.fillText(t, 230 + i * 170, 100); });
    g.fillStyle = '#d6a64a'; g.font = `bold ${o.px + 1}px "Segoe UI", Arial, sans-serif`; g.fillText(o.header, 230, 150);
    o.rows.forEach((r, i) => {
      const y = 195 + i * (o.px * 2.6);
      g.fillStyle = i % 2 ? '#33291f' : '#3d3125'; g.fillRect(222, y - o.px * 1.4, 836, o.px * 2.2);
      g.fillStyle = ['#7aa34a', '#c9873a', '#5d8fb8'][i % 3]; g.fillRect(232, y - o.px, o.px, o.px); // icon
      g.fillStyle = '#eadfc8'; g.font = `${o.px}px "Segoe UI", Arial, sans-serif`; g.fillText(r, 232 + o.px * 1.8, y);
      g.fillStyle = '#9c8a6c'; g.fillText(`niv. ${10 + i * 17}`, 980, y);
    });
    return c.toDataURL(o.type, 0.82);
  }, o);
  return Buffer.from(url.split(',')[1], 'base64');
}

test.describe('scanner', () => {
  test.setTimeout(120_000); // first use downloads the OCR model (≈ 2 MB)

  test('a screenshot of the finished quests saves the names read with certainty, at once', async ({ page }) => {
    await seedLocal(page);
    const errors = collectErrors(page);
    await page.goto('/progression/scan');
    await expect(page.getByRole('radio', { name: /Quêtes terminées/ })).toHaveAttribute('aria-checked', 'true');
    const png = await gameList(page, { tabs: ['En cours', 'Terminées'], header: 'Astrub', rows: QUESTS.map((q) => q[1]), px: 14, type: 'image/png' });
    await page.locator('input[type=file]').setInputFiles({ name: 'quetes-terminees.png', mimeType: 'image/png', buffer: png });
    await expect(page.getByText(/enregistré\(e\)s automatiquement pour/)).toBeVisible({ timeout: 90_000 });
    const done = new Set((await localStore(page)).characters[0].done);
    const auto = QUESTS.filter(([id]) => done.has(id)).map((q) => q[1]);
    expect(auto.length, `saved at once: ${auto.join(', ')}`).toBeGreaterThanOrEqual(5);
    // a region header or a tab label is never taken for a quest
    expect([...done].filter((d) => !QUESTS.some(([id]) => id === d))).toEqual([]);
    // the names read with a small doubt are proposed, pre-ticked: one click saves them
    for (const [id, name] of QUESTS) if (!done.has(id)) await expect(page.getByRole('checkbox', { name })).toBeChecked();
    if (auto.length < QUESTS.length) await page.getByRole('button', { name: 'Enregistrer la sélection' }).click();
    await expect.poll(async () => {
      const all = new Set((await localStore(page)).characters[0].done);
      return QUESTS.filter(([id]) => !all.has(id)).map((q) => q[1]);
    }).toEqual([]);
    // every change is in the history and can be undone
    await expect(page.getByText(/enregistré\(e\)s automatiquement/).first()).toBeVisible();
    expectNoErrors(errors);
  });

  test('a compressed screenshot of obtained achievements is recognised too', async ({ page }) => {
    await seedLocal(page);
    await page.goto('/progression/scan');
    await page.getByRole('radio', { name: /Succès obtenus/ }).click();
    const jpg = await gameList(page, { tabs: ['Tous', 'Obtenus'], header: 'Donjons', rows: ACHIEVEMENTS.map((a) => a[1]), px: 13, type: 'image/jpeg' });
    await page.locator('input[type=file]').setInputFiles({ name: 'succes.jpg', mimeType: 'image/jpeg', buffer: jpg });
    await expect(page.getByText(/enregistré\(e\)s automatiquement pour/)).toBeVisible({ timeout: 90_000 });
    const done = new Set((await localStore(page)).characters[0].done);
    const found = ACHIEVEMENTS.filter(([id]) => done.has(id)).map((a) => a[1]);
    // every name must at least be proposed; the ones not saved at once wait, pre-ticked, for one click
    const proposed = await page.locator('tbody tr').allInnerTexts();
    for (const [, name] of ACHIEVEMENTS) expect(found.includes(name) || proposed.some((r) => r.includes(name)), name).toBe(true);
    expect(found.length).toBeGreaterThanOrEqual(3);
  });

  test('with automatic saving off, nothing is written before the player confirms', async ({ page }) => {
    await seedLocal(page);
    await page.goto('/progression/scan');
    await page.getByRole('checkbox', { name: /Enregistrer tout de suite/ }).uncheck();
    const png = await gameList(page, { tabs: ['En cours', 'Terminées'], header: 'Incarnam', rows: QUESTS.slice(0, 3).map((q) => q[1]), px: 14, type: 'image/png' });
    await page.locator('input[type=file]').setInputFiles({ name: 'q.png', mimeType: 'image/png', buffer: png });
    await expect(page.getByRole('heading', { name: /Vérifiez avant d’enregistrer/ })).toBeVisible({ timeout: 90_000 });
    await expect(page.getByRole('checkbox', { name: QUESTS[0][1] })).toBeChecked(); // pre-ticked
    expect((await localStore(page)).characters[0].done).toEqual([]);
    await page.getByRole('button', { name: 'Enregistrer la sélection' }).click();
    await expect.poll(async () => (await localStore(page)).characters[0].done.filter((d) => d.startsWith('quest:')).length).toBeGreaterThanOrEqual(3);
  });
});

test('sharing the game window: frame the list, read it, then read as it scrolls; the moving scene is ignored', async ({ page }) => {
  test.setTimeout(150_000);
  await seedLocal(page);
  // the browser's window picker cannot be driven by a test: the shared "window" is a canvas drawn like the game, a
  // moving scene and chat text around the quest panel; `scrollTo(n)` redraws the list with the next names
  await page.addInitScript((pages: string[][]) => {
    const c = document.createElement('canvas'); c.width = 1280; c.height = 760;
    let rows = pages[0], t = 0;
    const draw = () => {
      const g = c.getContext('2d')!;
      t++;
      for (let i = 0; i < 12; i++) { g.fillStyle = `hsl(${(i * 40 + t * 7) % 360} 45% ${30 + (i % 3) * 12}%)`; g.fillRect(((i * 113 + t * 9) % 1280), (i * 61) % 760, 160, 120); } // scene
      g.fillStyle = '#dfe6ee'; g.font = '13px "Segoe UI", Arial'; g.fillText(`[Général] Joueur${t % 50} : quelqu'un pour Kardorim ?`, 20, 740);
      g.fillStyle = '#211a13'; g.fillRect(400, 60, 560, 520); g.fillStyle = '#3a2e22'; g.fillRect(410, 70, 540, 500); // quest window
      g.fillStyle = '#e8c77a'; g.font = 'bold 16px "Segoe UI", Arial'; g.fillText('Terminées', 430, 105);
      rows.forEach((r, i) => { const y = 160 + i * 36; g.fillStyle = i % 2 ? '#33291f' : '#3d3125'; g.fillRect(420, y - 20, 520, 31); g.fillStyle = '#eadfc8'; g.font = '14px "Segoe UI", Arial'; g.fillText(r, 440, y); });
    };
    draw();
    setInterval(draw, 120); // the scene keeps moving, like the game
    (window as unknown as { scrollTo: (n: number) => void }).scrollTo = (n: number) => { rows = pages[n]; };
    Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', { value: async () => c.captureStream(10) });
  }, [QUESTS.slice(0, 4).map((q) => q[1]), QUESTS.slice(4).map((q) => q[1])]);
  await page.goto('/progression/scan');
  await page.getByRole('button', { name: 'Partager la fenêtre Dofus' }).click();
  await expect(page.getByText('Fenêtre partagée', { exact: true })).toBeVisible();
  // frame the quest window on the preview: x 400–960 / 1280, y 60–580 / 760
  const view = page.getByRole('img', { name: /faites glisser pour encadrer/ });
  const b = (await view.boundingBox())!;
  await page.mouse.move(b.x + b.width * (405 / 1280), b.y + b.height * (65 / 760));
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * (955 / 1280), b.y + b.height * (575 / 760), { steps: 5 });
  await page.mouse.up();
  await expect(page.getByText('Seule la zone encadrée est lue.')).toBeVisible();
  await page.getByRole('button', { name: 'Lire maintenant' }).click();
  await expect(page.getByRole('status').filter({ hasText: /Vue lue : \d+ noms? reconnus?/ })).toBeVisible({ timeout: 90_000 });
  const saved = async (ids: string[]) => { const d = new Set((await localStore(page)).characters[0].done); return ids.filter((id) => d.has(id)).length; };
  await expect.poll(() => saved(QUESTS.slice(0, 4).map((q) => q[0])), { timeout: 30_000 }).toBeGreaterThanOrEqual(3);
  // automatic reading: the scene moves all the time but the framed list does not: one read, then quiet
  await page.getByRole('button', { name: 'Lire en faisant défiler' }).click();
  await page.waitForTimeout(6000);
  const reads = async () => Number((await page.getByText(/chaque nouvelle vue est lue/).innerText()).match(/\((\d+) lue/)?.[1] ?? 0);
  expect(await reads()).toBeLessThanOrEqual(2);
  // the "player" scrolls: the new names are read without another click
  await page.evaluate(() => (window as unknown as { scrollTo: (n: number) => void }).scrollTo(1));
  await expect.poll(() => saved(QUESTS.slice(4).map((q) => q[0])), { timeout: 90_000 }).toBeGreaterThanOrEqual(2);
  // the frame is remembered for the next session
  expect(await page.evaluate(() => localStorage.getItem('atlas:scan:region'))).toContain('"w"');
  await page.getByRole('button', { name: 'Arrêter le partage' }).click();
  await expect(page.getByRole('button', { name: 'Partager la fenêtre Dofus' })).toBeVisible();
});
