import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { migrate } from '../src/server/appdb.ts';
import {
  register, login, logout, me, forgot, reset, listCharacters, saveCharacter, deleteCharacter,
  hashPassword, verifyPassword, SESSION_COOKIE,
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
  migrate(db);
  assert.equal((db.prepare('SELECT COUNT(*) n FROM schema_migrations').get() as { n: number }).n, 1);
});
