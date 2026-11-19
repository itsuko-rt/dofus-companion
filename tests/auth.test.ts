import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { migrate } from '../src/server/appdb.ts';
import {
  register, login, logout, me, forgot, reset, listCharacters, saveCharacter, deleteCharacter,
  hashPassword, verifyPassword, SESSION_COOKIE, deleteAccount,
} from '../src/server/auth.ts';

const ORIGIN = 'http://localhost:3000';
const fresh = () => { const db = new DatabaseSync(':memory:'); db.exec('PRAGMA foreign_keys = ON'); migrate(db); return db; };
const req = (path: string, method = 'GET', body?: unknown, cookie?: string, origin: string | null = ORIGIN) => {
  const headers: Record<string, string> = { host: 'localhost:3000', 'content-type': 'application/json' };
  if (origin) headers.origin = origin;
  if (cookie) headers.cookie = cookie;
  return new Request(`${ORIGIN}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
};
const sessionOf = (res: Response) => {
  const c = res.headers.get('set-cookie') ?? '';
  const m = new RegExp(`${SESSION_COOKIE}=([^;]*)`).exec(c);
  return m ? `${SESSION_COOKIE}=${m[1]}` : '';
};
const char = (id: string, extra: object = {}) => ({ id, name: 'Arkhane', level: 42, profile: { breed: 9 }, done: ['quest:1642'], active: [], builds: [], notes: '', updatedAt: new Date().toISOString(), ...extra });

test('passwords are hashed with scrypt and verified in constant time', async () => {
  const h = await hashPassword('correct horse battery');
  assert.match(h, /^scrypt\$16384\$8\$1\$/);
  assert.ok(!h.includes('correct horse'));
  assert.ok(await verifyPassword('correct horse battery', h));
  assert.ok(!(await verifyPassword('wrong password!!', h)));
});

test('register → session cookie → me → logout', async () => {
  const db = fresh();
  const r = await register(db, req('/api/auth/register', 'POST', { email: 'ana@example.com', password: 'motdepasse-solide' }));
  assert.equal(r.status, 201);
  const set = r.headers.get('set-cookie')!;
  assert.match(set, /HttpOnly/); assert.match(set, /SameSite=Lax/);
  const cookie = sessionOf(r);
  assert.equal((await me(db, req('/api/auth/me', 'GET', undefined, cookie)).json()).user.email, 'ana@example.com');
  const stored = db.prepare('SELECT password_hash FROM users').get() as { password_hash: string };
  assert.ok(!stored.password_hash.includes('motdepasse'));
  // tokens are stored hashed, never as sent in the cookie
  const tok = cookie.split('=')[1];
  assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions WHERE token_hash = ?').get(tok)!.n, 0);
  await logout(db, req('/api/auth/logout', 'POST', {}, cookie));
  assert.equal((await me(db, req('/api/auth/me', 'GET', undefined, cookie)).json()).user, null);
});

test('validation, duplicates, wrong password, throttling', async () => {
  const db = fresh();
  assert.equal((await register(db, req('/x', 'POST', { email: 'pas-un-email', password: 'motdepasse-solide' }))).status, 400);
  assert.equal((await register(db, req('/x', 'POST', { email: 'b@example.com', password: 'court' }))).status, 400);
  assert.equal((await register(db, req('/x', 'POST', { email: 'b@example.com', password: 'motdepasse-solide' }))).status, 201);
  assert.equal((await register(db, req('/x', 'POST', { email: 'B@EXAMPLE.com', password: 'motdepasse-solide' }))).status, 409);
  assert.equal((await login(db, req('/x', 'POST', { email: 'b@example.com', password: 'mauvais-mot-de-passe' }))).status, 401);
  assert.equal((await login(db, req('/x', 'POST', { email: 'inconnu@example.com', password: 'motdepasse-solide' }))).status, 401);
  for (let i = 0; i < 8; i++) await login(db, req('/x', 'POST', { email: 'b@example.com', password: 'mauvais-mot-de-passe' }));
  assert.equal((await login(db, req('/x', 'POST', { email: 'b@example.com', password: 'motdepasse-solide' }))).status, 429);
});

test('cross-origin requests are refused', async () => {
  const db = fresh();
  assert.equal((await register(db, req('/x', 'POST', { email: 'c@example.com', password: 'motdepasse-solide' }, undefined, 'https://evil.example'))).status, 403);
  assert.equal((await register(db, req('/x', 'POST', { email: 'c@example.com', password: 'motdepasse-solide' }, undefined, null))).status, 403);
});

test('characters: saved per user, never visible to another user', async () => {
  const db = fresh();
  const a = sessionOf(await register(db, req('/x', 'POST', { email: 'a@example.com', password: 'motdepasse-solide' })));
  const b = sessionOf(await register(db, req('/x', 'POST', { email: 'b@example.com', password: 'motdepasse-solide' })));
  assert.equal((await saveCharacter(db, req('/api/characters/cabc', 'PUT', char('cabc')), 'cabc')).status, 401); // no session
  assert.equal((await saveCharacter(db, req('/api/characters/cabc', 'PUT', char('cabc'), a), 'cabc')).status, 200);
  const listA = await (listCharacters(db, req('/api/characters', 'GET', undefined, a))).json();
  assert.equal(listA.characters.length, 1);
  assert.deepEqual(listA.characters[0].done, ['quest:1642']);
  assert.equal((await (listCharacters(db, req('/api/characters', 'GET', undefined, b))).json()).characters.length, 0);
  // B writing the same id creates B's own row, A's data is untouched; B deleting it does not touch A
  await saveCharacter(db, req('/api/characters/cabc', 'PUT', char('cabc', { name: 'Pirate' }), b), 'cabc');
  deleteCharacter(db, req('/api/characters/cabc', 'DELETE', undefined, b), 'cabc');
  const again = await (listCharacters(db, req('/api/characters', 'GET', undefined, a))).json();
  assert.equal(again.characters[0].name, 'Arkhane');
  // invalid payload rejected, older update refused (409)
  assert.equal((await saveCharacter(db, req('/x', 'PUT', { id: 'cabc', done: 'nope' }, a), 'other')).status, 400);
  assert.equal((await saveCharacter(db, req('/x', 'PUT', char('cabc', { updatedAt: '2000-01-01T00:00:00.000Z' }), a), 'cabc')).status, 409);
});

test('password reset: one-time link, logs out everywhere', async () => {
  const db = fresh();
  const old = sessionOf(await register(db, req('/x', 'POST', { email: 'd@example.com', password: 'ancien-mot-de-passe' })));
  let link = '';
  const r1 = await forgot(db, req('/x', 'POST', { email: 'd@example.com' }), (_e, l) => { link = l; });
  const r2 = await forgot(db, req('/x', 'POST', { email: 'personne@example.com' }), () => assert.fail('no link for unknown accounts'));
  assert.deepEqual(await r1.json(), await r2.json()); // same answer: no account enumeration
  const tokenValue = new URL(link).searchParams.get('token')!;
  assert.equal((await reset(db, req('/x', 'POST', { token: tokenValue, password: 'nouveau-mot-de-passe' }))).status, 200);
  assert.equal((await reset(db, req('/x', 'POST', { token: tokenValue, password: 'encore-un-autre-mdp' }))).status, 400); // single use
  assert.equal((await me(db, req('/x', 'GET', undefined, old)).json()).user, null);
  assert.equal((await login(db, req('/x', 'POST', { email: 'd@example.com', password: 'nouveau-mot-de-passe' }))).status, 200);
});

test('migrations are idempotent', () => {
  const db = fresh();
  const count = migrate(db); // second run: nothing applied twice
  assert.equal((db.prepare('SELECT COUNT(*) n FROM schema_migrations').get() as { n: number }).n, count);
  // migration 2: accounts default to the free plan
  db.prepare("INSERT INTO users(email, password_hash, created_at) VALUES ('p@example.com', 'x', 'now')").run();
  assert.equal((db.prepare("SELECT plan FROM users WHERE email = 'p@example.com'").get() as { plan: string }).plan, 'free');
});

// ---------- audit 2026-11-19 (docs/AUDIT_SECURITE.md)
const withHeaders = (path: string, method: string, body: unknown, extra: Record<string, string>) =>
  new Request(`${ORIGIN}${path}`, { method, headers: { host: 'localhost:3000', origin: ORIGIN, 'content-type': 'application/json', ...extra }, body: JSON.stringify(body) });

test('a forged X-Forwarded-For does not reset the login throttle', async () => {
  const db = fresh();
  await register(db, req('/x', 'POST', { email: 'e@example.com', password: 'motdepasse-solide' }));
  const codes: number[] = [];
  for (let i = 0; i < 10; i++) codes.push((await login(db, withHeaders('/x', 'POST', { email: 'e@example.com', password: 'mauvais-mot-de-passe' }, { 'x-forwarded-for': `10.0.0.${i}` }))).status);
  assert.deepEqual(codes.slice(8), [429, 429]);
  // the throttle table holds hashes only, never the e-mail or an address
  const keys = (db.prepare('SELECT key FROM login_failures').all() as { key: string }[]).map((r) => r.key).join(' ');
  assert.ok(!keys.includes('e@example.com') && !keys.includes('10.0.0'));
});

test('oversized bodies are refused with 413 before parsing', async () => {
  const db = fresh();
  const a = sessionOf(await register(db, req('/x', 'POST', { email: 'f@example.com', password: 'motdepasse-solide' })));
  assert.equal((await login(db, req('/x', 'POST', { email: 'f@example.com', password: 'x'.repeat(20_000) }))).status, 413);
  assert.equal((await saveCharacter(db, req('/x', 'PUT', char('cbig', { notes: 'x'.repeat(2_200_000) }), a), 'cbig')).status, 413);
  assert.equal((await saveCharacter(db, req('/x', 'PUT', char('cok'), a), 'cok')).status, 200);
  assert.equal((await register(db, req('/x', 'POST', ['array', 'body']))).status, 400);
});

test('reset links use the public address, not the Host header, and one reset voids the others', async () => {
  const db = fresh();
  await register(db, req('/x', 'POST', { email: 'g@example.com', password: 'ancien-mot-de-passe' }));
  const links: string[] = [];
  // a script (not a browser) can forge Host and Origin together: the link must still point to SITE_URL
  await forgot(db, withHeaders('/x', 'POST', { email: 'g@example.com' }, { host: 'evil.example', origin: 'http://evil.example' }), (_e, l) => links.push(l));
  await forgot(db, req('/x', 'POST', { email: 'g@example.com' }), (_e, l) => links.push(l));
  assert.equal(links.length, 2);
  for (const l of links) assert.equal(new URL(l).origin, 'http://localhost:3000'); // SITE_URL default
  const [t1, t2] = links.map((l) => new URL(l).searchParams.get('token')!);
  assert.equal((await reset(db, req('/x', 'POST', { token: t1, password: 'nouveau-mot-de-passe' }))).status, 200);
  assert.equal((await reset(db, req('/x', 'POST', { token: t2, password: 'autre-nouveau-mdp' }))).status, 400);
  // third request in the hour gets a link, the fourth the same answer and none
  await forgot(db, req('/x', 'POST', { email: 'g@example.com' }), () => {});
  const r = await forgot(db, req('/x', 'POST', { email: 'g@example.com' }), () => assert.fail('throttled: 3 links per hour'));
  assert.equal(r.status, 200);
});

test('account deletion: password required, removes sessions and characters, leaves other users intact', async () => {
  const db = fresh();
  const a = sessionOf(await register(db, req('/x', 'POST', { email: 'h@example.com', password: 'motdepasse-solide' })));
  const b = sessionOf(await register(db, req('/x', 'POST', { email: 'i@example.com', password: 'motdepasse-solide' })));
  await saveCharacter(db, req('/x', 'PUT', char('cone'), a), 'cone');
  await saveCharacter(db, req('/x', 'PUT', char('cone'), b), 'cone');
  assert.equal((await deleteAccount(db, req('/x', 'POST', { password: 'motdepasse-solide' }))).status, 401); // no session
  assert.equal((await deleteAccount(db, req('/x', 'POST', { password: 'motdepasse-solide' }, a, 'https://evil.example'))).status, 403);
  assert.equal((await deleteAccount(db, req('/x', 'POST', { password: 'pas-le-bon-mdp' }, a))).status, 401);
  const r = await deleteAccount(db, req('/x', 'POST', { password: 'motdepasse-solide' }, a));
  assert.equal(r.status, 200);
  assert.match(r.headers.get('set-cookie')!, /Max-Age=0/);
  const n = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  assert.equal(n("SELECT COUNT(*) n FROM users WHERE email = 'h@example.com'"), 0);
  assert.equal(n('SELECT COUNT(*) n FROM sessions'), 1); // B's only
  assert.equal(n('SELECT COUNT(*) n FROM characters'), 1); // B's only
  assert.equal((await me(db, req('/x', 'GET', undefined, a)).json()).user, null);
  assert.equal((await (listCharacters(db, req('/x', 'GET', undefined, b))).json()).characters.length, 1);
});

test('register is throttled site-wide when the client address is unknown', async () => {
  const db = fresh();
  assert.equal((await register(db, req('/x', 'POST', { email: 'j0@example.com', password: 'motdepasse-solide' }))).status, 201);
  // fill the counter up to the limit directly (100 scrypt hashes would make the test slow)
  const key = (db.prepare('SELECT key FROM login_failures LIMIT 1').get() as { key: string }).key;
  for (let i = 0; i < 99; i++) db.prepare('INSERT INTO login_failures(key, at) VALUES (?, ?)').run(key, new Date().toISOString());
  assert.equal((await register(db, req('/x', 'POST', { email: 'j1@example.com', password: 'motdepasse-solide' }))).status, 429);
});
