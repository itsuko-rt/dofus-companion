// Accounts on this site (not Ankama accounts). Route handlers are plain Request → Response
// functions so they can be tested without a running server.
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { asPlan, type Plan } from '../plans.ts';
import { promisify } from 'node:util';
import type { DatabaseSync } from 'node:sqlite';
import { sanitizeCharacter, type Character } from '../character.ts';
import { SITE_URL } from '../site.ts';

const scryptRaw = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
// Each hash takes ~16 MB and tens of ms of CPU. Logins with ever-new addresses are not throttled per account,
// so concurrent hashes are capped: a few run, a bounded queue waits, the rest get "busy" (no memory blow-up).
const HASH_CONCURRENCY = 4, HASH_QUEUE = 32;
let hashing = 0;
const waiting: (() => void)[] = [];
export class Busy extends Error {}
async function scrypt(pw: string, salt: Buffer, len: number, opts: object): Promise<Buffer> {
  if (hashing >= HASH_CONCURRENCY) {
    if (waiting.length >= HASH_QUEUE) throw new Busy('busy');
    await new Promise<void>((r) => waiting.push(r)); // the finishing hash hands its slot over (hashing unchanged)
  } else hashing++;
  try { return await scryptRaw(pw, salt, len, opts); } finally { const next = waiting.shift(); if (next) next(); else hashing--; }
}
/** Response for a request refused because the hashing queue is full. */
export const busyResponse = () => json({ error: 'Serveur occupé, réessayez dans un instant.' }, 503, { 'retry-after': '5' });
/** Test hook: hashes running and waiting. */
export const hashLoad = () => ({ running: hashing, waiting: waiting.length });
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export const SESSION_COOKIE = 'adz_session';
const SESSION_DAYS = 30;
const RESET_MINUTES = 60;
const MAX_FAILURES = 8;        // per e-mail + IP, per 15 minutes
const MAX_EMAIL_FAILURES = 30; // per e-mail from any address (spread-out guessing), per 15 minutes
const MAX_CHARACTERS = 20;
const AUTH_BODY = 16 * 1024;            // e-mail + password
const CHARACTER_BODY = 2 * 1024 * 1024; // a full character with history is ~100 KB
// Client address, only from the header the reverse proxy sets (cf-connecting-ip behind Cloudflare).
// Any other header is chosen by the client and would let it reset its own throttle on every request.
const IP_HEADER = process.env.TRUSTED_IP_HEADER?.toLowerCase();

// ---------- primitives
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, N, r, p, salt, hash] = stored.split('$');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const got = await scrypt(password, Buffer.from(salt, 'base64'), expected.length, { N: Number(N), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem });
  return got.length === expected.length && timingSafeEqual(got, expected);
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const token = () => randomBytes(32).toString('base64url');
const now = () => new Date();
const iso = (d: Date) => d.toISOString();

export function validEmail(email: unknown): email is string {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}
export function passwordProblem(pw: unknown): string | null {
  if (typeof pw !== 'string') return 'Mot de passe manquant.';
  if (pw.length < 10) return 'Le mot de passe doit faire au moins 10 caractères.';
  if (pw.length > 200) return 'Le mot de passe est trop long.';
  return null;
}

// ---------- HTTP helpers
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });

function cookie(value: string, maxAge: number, secure: boolean) {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}
// Behind a TLS-terminating proxy the request reaches Node over http: production always sets Secure.
const isSecure = (req: Request) => process.env.NODE_ENV === 'production' || new URL(req.url).protocol === 'https:';

function readCookie(req: Request, name: string): string | null {
  for (const part of (req.headers.get('cookie') ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

/** Same-origin check for state-changing requests (CSRF), on top of SameSite=Lax cookies. */
function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return req.headers.get('sec-fetch-site') === 'same-origin';
  try {
    const o = new URL(origin).host;
    return o === (req.headers.get('host') ?? new URL(req.url).host) || o === new URL(SITE_URL).host;
  } catch { return false; }
}

const TOO_LARGE = Symbol('too large');
/** JSON object body, read up to `max` bytes (a bigger body is refused before it is buffered). */
async function body(req: Request, max = AUTH_BODY): Promise<Record<string, unknown> | null | typeof TOO_LARGE> {
  if (Number(req.headers.get('content-length') ?? 0) > max) return TOO_LARGE;
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (req.body) {
    const reader = req.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) { await reader.cancel(); return TOO_LARGE; }
      chunks.push(value);
    }
  }
  try {
    const b = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    return b && typeof b === 'object' && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
  } catch { return null; }
}
const tooLarge = () => json({ error: 'Requête trop volumineuse.' }, 413);

const clientIp = (req: Request) => (IP_HEADER && req.headers.get(IP_HEADER)?.split(',')[0].trim()) || 'unknown';

// ---------- throttling: one row per event, keyed by a hash (no raw e-mail or IP stored)
const throttleKey = (...parts: string[]) => sha256(parts.join('|').toLowerCase());
function count(db: DatabaseSync, key: string, minutes: number): number {
  return (db.prepare('SELECT COUNT(*) n FROM login_failures WHERE key = ? AND at > ?').get(key, iso(new Date(Date.now() - minutes * 60_000))) as { n: number }).n;
}
const hit = (db: DatabaseSync, key: string) => db.prepare('INSERT INTO login_failures(key, at) VALUES (?, ?)').run(key, iso(now()));
/** Events older than the longest window (1 hour) no longer matter: deleted (privacy policy). */
const purgeEvents = (db: DatabaseSync) => db.prepare('DELETE FROM login_failures WHERE at <= ?').run(iso(new Date(Date.now() - 60 * 60_000)));

// ---------- sessions
export function userFromRequest(db: DatabaseSync, req: Request): { id: number; email: string; plan: Plan } | null {
  const t = readCookie(req, SESSION_COOKIE);
  if (!t) return null;
  const row = db.prepare(`SELECT u.id, u.email, u.plan FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?`).get(sha256(t), iso(now())) as { id: number; email: string; plan: string } | undefined;
  return row ? { id: row.id, email: row.email, plan: asPlan(row.plan) } : null;
}

function startSession(db: DatabaseSync, userId: number, req: Request) {
  const t = token();
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  db.prepare('INSERT INTO sessions(token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(sha256(t), userId, iso(now()), iso(expires));
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(iso(now()));
  return cookie(t, SESSION_DAYS * 86400, isSecure(req));
}

// ---------- handlers
export async function register(db: DatabaseSync, req: Request): Promise<Response> {
  if (!sameOrigin(req)) return json({ error: 'Origine refusée.' }, 403);
  const b = await body(req);
  if (b === TOO_LARGE) return tooLarge();
  if (!b || !validEmail(b.email)) return json({ error: 'Adresse e-mail invalide.' }, 400);
  // account creation costs a scrypt hash: 10 per address per hour, or 100 per hour site-wide when the
  // proxy does not tell us the address
  const ip = clientIp(req);
  const regKey = throttleKey('register', ip);
  purgeEvents(db);
  if (count(db, regKey, 60) >= (ip === 'unknown' ? 100 : 10)) return json({ error: 'Trop de comptes créés. Réessayez dans une heure.' }, 429);
  const problem = passwordProblem(b.password);
  if (problem) return json({ error: problem }, 400);
  const email = b.email.trim();
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) return json({ error: 'Un compte existe déjà avec cette adresse.' }, 409);
  const hash = await hashPassword(b.password as string);
  hit(db, regKey);
  const res = db.prepare('INSERT INTO users(email, password_hash, created_at) VALUES (?, ?, ?)').run(email, hash, iso(now()));
  const id = Number(res.lastInsertRowid);
  return json({ user: { id, email, plan: 'free' } }, 201, { 'set-cookie': startSession(db, id, req) });
}

export async function login(db: DatabaseSync, req: Request): Promise<Response> {
  if (!sameOrigin(req)) return json({ error: 'Origine refusée.' }, 403);
  const b = await body(req);
  if (b === TOO_LARGE) return tooLarge();
  if (!b || !validEmail(b.email) || typeof b.password !== 'string') return json({ error: 'E-mail ou mot de passe incorrect.' }, 400);
  const key = throttleKey('login', b.email.trim(), clientIp(req));
  const emailKey = throttleKey('login-any', b.email.trim());
  purgeEvents(db);
  if (count(db, key, 15) >= MAX_FAILURES || count(db, emailKey, 15) >= MAX_EMAIL_FAILURES) return json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' }, 429);
  const user = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(b.email.trim()) as
    { id: number; email: string; password_hash: string } | undefined;
  // verify against a dummy hash when the user does not exist, so timing does not reveal accounts
  const ok = await verifyPassword(b.password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) {
    hit(db, key); hit(db, emailKey);
    return json({ error: 'E-mail ou mot de passe incorrect.' }, 401);
  }
  db.prepare('DELETE FROM login_failures WHERE key = ?').run(key);
  return json({ user: { id: user.id, email: user.email, plan: asPlan((db.prepare('SELECT plan FROM users WHERE id = ?').get(user.id) as { plan: string }).plan) } }, 200, { 'set-cookie': startSession(db, user.id, req) });
}
const DUMMY_HASH = 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + Buffer.alloc(64).toString('base64');

export function logout(db: DatabaseSync, req: Request): Response {
  if (!sameOrigin(req)) return json({ error: 'Origine refusée.' }, 403);
  const t = readCookie(req, SESSION_COOKIE);
  if (t) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(t));
  return json({ ok: true }, 200, { 'set-cookie': cookie('', 0, isSecure(req)) });
}

export function me(db: DatabaseSync, req: Request): Response {
  return json({ user: userFromRequest(db, req) });
}

/**
 * Always answers the same way (no account enumeration). The reset link is handed to `deliver`;
 * until an e-mail provider is configured, the app route prints it in the server log.
 */
export async function forgot(db: DatabaseSync, req: Request, deliver: (email: string, link: string) => void): Promise<Response> {
  if (!sameOrigin(req)) return json({ error: 'Origine refusée.' }, 403);
  const b = await body(req);
  if (b === TOO_LARGE) return tooLarge();
  db.prepare('DELETE FROM password_resets WHERE expires_at <= ? OR used_at IS NOT NULL').run(iso(now()));
  purgeEvents(db);
  // at most 3 links per address per hour (mail bombing); the answer stays the same either way
  const key = b && validEmail(b.email) ? throttleKey('forgot', b.email.trim()) : null;
  if (b && key && count(db, key, 60) < 3) {
    hit(db, key);
    const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get((b.email as string).trim()) as { id: number; email: string } | undefined;
    if (user) {
      const t = token();
      db.prepare('INSERT INTO password_resets(token_hash, user_id, expires_at) VALUES (?, ?, ?)')
        .run(sha256(t), user.id, iso(new Date(Date.now() + RESET_MINUTES * 60_000)));
      // the public address, never the request's Host header (a forged Host would send the token elsewhere)
      deliver(user.email, `${SITE_URL}/compte/reinitialiser?token=${t}`);
    }
  }
  return json({ ok: true, message: 'Si un compte existe pour cette adresse, un lien de réinitialisation a été envoyé.' });
}

export async function reset(db: DatabaseSync, req: Request): Promise<Response> {
  if (!sameOrigin(req)) return json({ error: 'Origine refusée.' }, 403);
  const b = await body(req);
  if (b === TOO_LARGE) return tooLarge();
  if (!b || typeof b.token !== 'string') return json({ error: 'Lien invalide.' }, 400);
  const problem = passwordProblem(b.password);
  if (problem) return json({ error: problem }, 400);
  const row = db.prepare('SELECT user_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?')
    .get(sha256(b.token), iso(now())) as { user_id: number } | undefined;
  if (!row) return json({ error: 'Ce lien a expiré ou a déjà servi.' }, 400);
  const hash = await hashPassword(b.password as string);
  db.exec('BEGIN');
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, row.user_id);
  db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(row.user_id); // this link and any other one still pending
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id); // log out everywhere
  db.exec('COMMIT');
  return json({ ok: true });
}

/**
 * Deletes the account and everything attached to it (sessions, reset links, characters: ON DELETE CASCADE).
 * Asks for the password again, so a forgotten open session is not enough.
 */
export async function deleteAccount(db: DatabaseSync, req: Request): Promise<Response> {
  if (!sameOrigin(req)) return json({ error: 'Origine refusée.' }, 403);
  const user = userFromRequest(db, req);
  if (!user) return json({ error: 'Connexion requise.' }, 401);
  const b = await body(req);
  if (b === TOO_LARGE) return tooLarge();
  const key = throttleKey('login', user.email, clientIp(req));
  purgeEvents(db);
  if (count(db, key, 15) >= MAX_FAILURES) return json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' }, 429);
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id) as { password_hash: string };
  if (!b || typeof b.password !== 'string' || !(await verifyPassword(b.password, row.password_hash))) {
    hit(db, key);
    return json({ error: 'Mot de passe incorrect.' }, 401);
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  return json({ ok: true }, 200, { 'set-cookie': cookie('', 0, isSecure(req)) });
}

// ---------- characters (owner-scoped: every query filters on the session's user id)
export function listCharacters(db: DatabaseSync, req: Request): Response {
  const user = userFromRequest(db, req);
  if (!user) return json({ error: 'Connexion requise.' }, 401);
  const rows = db.prepare('SELECT id, data FROM characters WHERE user_id = ? ORDER BY updated_at').all(user.id) as { id: string; data: string }[];
  return json({ characters: rows.map((r) => sanitizeCharacter(JSON.parse(r.data), r.id)).filter(Boolean) });
}

export async function saveCharacter(db: DatabaseSync, req: Request, id: string): Promise<Response> {
  if (!sameOrigin(req)) return json({ error: 'Origine refusée.' }, 403);
  const user = userFromRequest(db, req);
  if (!user) return json({ error: 'Connexion requise.' }, 401);
  const b = await body(req, CHARACTER_BODY);
  if (b === TOO_LARGE) return tooLarge();
  const c: Character | null = sanitizeCharacter(b, id);
  if (!c || c.id !== id) return json({ error: 'Personnage invalide.' }, 400);
  const exists = db.prepare('SELECT updated_at FROM characters WHERE user_id = ? AND id = ?').get(user.id, id) as { updated_at: string } | undefined;
  if (!exists) {
    const n = (db.prepare('SELECT COUNT(*) n FROM characters WHERE user_id = ?').get(user.id) as { n: number }).n;
    if (n >= MAX_CHARACTERS) return json({ error: `Limite de ${MAX_CHARACTERS} personnages atteinte.` }, 400);
  } else if (exists.updated_at > c.updatedAt) {
    // a newer version was saved from another device: keep it and tell the client
    return json({ error: 'Une version plus récente existe.', conflict: true }, 409);
  }
  db.prepare(`INSERT INTO characters(id, user_id, name, data, updated_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, id) DO UPDATE SET name = excluded.name, data = excluded.data, updated_at = excluded.updated_at`)
    .run(id, user.id, c.name, JSON.stringify(c), c.updatedAt);
  return json({ character: c });
}

export function deleteCharacter(db: DatabaseSync, req: Request, id: string): Response {
  if (!sameOrigin(req)) return json({ error: 'Origine refusée.' }, 403);
  const user = userFromRequest(db, req);
  if (!user) return json({ error: 'Connexion requise.' }, 401);
  db.prepare('DELETE FROM characters WHERE user_id = ? AND id = ?').run(user.id, id);
  return json({ ok: true });
}
