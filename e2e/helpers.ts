import { expect, type Page } from '@playwright/test';

export const STORE = 'dofus-companion:characters:v2';
export const uniqueEmail = (tag: string) => `e2e-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
export const PASSWORD = `e2e-${Math.random().toString(36).slice(2)}-pw`;

/** JSON call made by the page itself (its cookies, its Origin), like the app's own requests. */
export async function api(page: Page, path: string, method: string, body?: unknown): Promise<{ status: number; data: any }> {
  return page.evaluate(async ([path, method, body]) => {
    const r = await fetch(path, { method, headers: { 'content-type': 'application/json' }, body: body === null ? undefined : JSON.stringify(body), credentials: 'same-origin' });
    return { status: r.status, data: await r.json().catch(() => null) };
  }, [path, method, body ?? null] as const);
}

/** The visible error message of a form (Next.js also has an empty role=alert route announcer). */
export const formAlert = (page: Page) => page.locator('p[role=alert]');

export const character = (id: string, name: string, extra: object = {}) => ({
  id, name, level: 50, profile: { breed: 9 }, done: [], active: [], builds: [], notes: '', history: [], updatedAt: new Date().toISOString(), ...extra,
});

/** Starts with one local character so pages skip the onboarding. */
export async function seedLocal(page: Page, name = 'Testeur') {
  await page.addInitScript(([key, c]) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ activeId: c.id, characters: [c] }));
  }, [STORE, character('cseed', name)] as const);
}

export async function localStore(page: Page): Promise<{ owner?: number | null; characters: { name: string; done: string[] }[] }> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{"characters":[]}'), STORE);
}

/** Page errors and console errors, minus noise that is not ours. */
export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|ERR_INTERNET_DISCONNECTED/.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
  return errors;
}

export const expectNoErrors = (errors: string[]) => expect(errors, errors.join('\n')).toEqual([]);
