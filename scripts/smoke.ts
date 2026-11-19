// End-to-end smoke test against a running server: node scripts/smoke.ts [baseUrl]
// Checks pages, redirects, security headers, game APIs and the account flow.
import assert from 'node:assert/strict';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const results: [string, boolean, string][] = [];
async function check(name: string, fn: () => Promise<void>) {
  try { await fn(); results.push([name, true, '']); } catch (e) { results.push([name, false, (e as Error).message]); }
}
const get = (path: string, init?: RequestInit) => fetch(`${BASE}${path}`, { redirect: 'manual', ...init });

const PAGES = ['/', '/progression/quetes', '/progression/quetes/incarnam', '/guides', '/guides/quetes', '/guides/quetes/incarnam', '/guides/dofus', '/guides/dofus/emeraude', '/a-propos', '/confidentialite', '/mentions-legales', '/progression/succes', '/progression/dofus',
  '/progression/scan', '/builds', '/equipement', '/personnage', '/personnage/sorts', '/personnage/sorts/cra', '/personnage/sorts/pandawa', '/compte'];
for (const p of PAGES) await check(`page ${p}`, async () => assert.equal((await get(p)).status, 200));

await check('redirects keep old URLs', async () => {
  for (const [from, to] of [['/quetes', '/progression/quetes'], ['/classes/9', '/personnage/sorts/9'], ['/personnage/sorts/9', '/personnage/sorts/cra'], ['/progression/quetes/19', '/progression/quetes/incarnam'], ['/personnage/builds', '/builds']]) {
    const r = await get(from);
    assert.ok([301, 307, 308].includes(r.status), `${from} → ${r.status}`);
    assert.equal(new URL(r.headers.get('location')!, BASE).pathname, to);
  }
});
await check('security headers', async () => {
  const r = await get('/');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
});
await check('graph API', async () => {
  const d = await (await get('/api/graph')).json();
  assert.ok(d.nodes.length > 4000 && d.dofusQuests.length > 0);
});
await check('quest details API with DPLN guide', async () => {
  const d = await (await get('/api/quests/1639')).json();
  assert.ok(d.steps[0].objectives.length > 0);
  assert.match(d.guides[0].url, /^https:\/\/www\.dofuspourlesnoobs\.com\//);
});
await check('items search API', async () => {
  const d = await (await get('/api/items/search?q=coiffe&max=60')).json();
  assert.ok(d.items.length > 0 && d.items.every((i: { level: number }) => i.level <= 60));
});
await check('achievements API with objectives, rewards and guides', async () => {
  const d = await (await get('/api/achievements?categories=59')).json();
  assert.ok(d.achievements.length > 0 && d.achievements.some((a: { guide: unknown }) => a.guide));
  assert.ok(d.achievements[0].objectives.every((o: { id: number }) => Number.isInteger(o.id)));
  const idx = await (await get('/api/achievements/objectives')).json();
  assert.ok(Object.keys(idx).length > 2000);
});

// account flow
const email = `smoke${Date.now()}@example.com`;
const json = { 'content-type': 'application/json', origin: BASE };
let cookie = '';
await check('register sets an HttpOnly session cookie', async () => {
  const r = await get('/api/auth/register', { method: 'POST', headers: json, body: JSON.stringify({ email, password: 'smoke-test-password' }) });
  assert.equal(r.status, 201);
  const set = r.headers.get('set-cookie') ?? '';
  assert.match(set, /HttpOnly/);
  cookie = set.split(';')[0];
});
await check('character saved and read back', async () => {
  const c = { id: 'csmoke1', name: 'Smoke', level: 30, profile: { breed: 12 }, done: ['quest:1642'], active: [], builds: [], notes: '', updatedAt: new Date().toISOString() };
  assert.equal((await get('/api/characters/csmoke1', { method: 'PUT', headers: { ...json, cookie }, body: JSON.stringify(c) })).status, 200);
  const list = await (await get('/api/characters', { headers: { cookie } })).json();
  assert.deepEqual(list.characters.map((x: { id: string }) => x.id), ['csmoke1']);
});
await check('anonymous and cross-origin requests refused', async () => {
  assert.equal((await get('/api/characters')).status, 401);
  assert.equal((await get('/api/characters/csmoke1', { method: 'PUT', headers: { 'content-type': 'application/json', origin: 'https://evil.example', cookie }, body: '{}' })).status, 403);
});
await check('logout ends the session', async () => {
  await get('/api/auth/logout', { method: 'POST', headers: { ...json, cookie }, body: '{}' });
  assert.equal((await (await get('/api/auth/me', { headers: { cookie } })).json()).user, null);
});

for (const [name, ok, msg] of results) console.log(`${ok ? '✔' : '✖'} ${name}${msg ? ` — ${msg}` : ''}`);
const failed = results.filter((r) => !r[1]).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
