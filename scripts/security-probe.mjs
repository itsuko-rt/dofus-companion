// Live security probe (OWASP-style checks) against a LOCAL or staging server you own: node scripts/security-probe.mjs http://127.0.0.1:3100
// Creates two throwaway accounts; never point it at a site you are not authorised to test.
const B = process.argv[2] ?? 'http://localhost:3000';
const H = { 'content-type': 'application/json', origin: B };
const out = [];
const log = (k, v) => { out.push(`${k}: ${v}`); };
const pw = 'probe-' + Math.random().toString(36).slice(2) + '-x';
const call = (p, init = {}) => fetch(B + p, { redirect: 'manual', ...init, headers: { ...H, ...(init.headers ?? {}) } });
const cookieOf = (r) => (r.headers.get('set-cookie') ?? '').split(';')[0];
const tag = Date.now();
const ea = `probe-a-${tag}@example.com`, eb = `probe-b-${tag}@example.com`;

const ra = await call('/api/auth/register', { method: 'POST', body: JSON.stringify({ email: ea, password: pw }) });
const rb = await call('/api/auth/register', { method: 'POST', body: JSON.stringify({ email: eb, password: pw }) });
const A = cookieOf(ra), Bc = cookieOf(rb);
log('register A/B', `${ra.status}/${rb.status}; cookie flags: ${(ra.headers.get('set-cookie') ?? '').split(';').slice(1).join(';')}`);
log('duplicate register', (await call('/api/auth/register', { method: 'POST', body: JSON.stringify({ email: ea.toUpperCase(), password: pw }) })).status);

// IDOR: A saves a character, B tries to read / overwrite / delete it
const ch = { id: 'cprobe', name: '<img src=x onerror=alert(1)>', level: 50, profile: {}, done: ['quest:1', "quest:1' OR 1=1--"], active: [], builds: [{ url: 'javascript:alert(1)', id: 'x' }], notes: "'; DROP TABLE users;--", updatedAt: new Date().toISOString() };
log('A save', (await call('/api/characters/cprobe', { method: 'PUT', headers: { cookie: A }, body: JSON.stringify(ch) })).status);
const listB = await (await call('/api/characters', { headers: { cookie: Bc } })).json();
log('B list sees A chars', listB.characters.length);
log('B delete A char', (await call('/api/characters/cprobe', { method: 'DELETE', headers: { cookie: Bc } })).status);
const listA = await (await call('/api/characters', { headers: { cookie: A } })).json();
log('A still has char after B delete', listA.characters.length);
log('stored name (React escapes on render)', JSON.stringify(listA.characters[0]?.name));
log('injected quest id kept', JSON.stringify(listA.characters[0]?.done));
log('javascript: build url kept', listA.characters[0]?.builds.length);
log('no session list', (await call('/api/characters')).status);
log('forged cookie list', (await call('/api/characters', { headers: { cookie: 'adz_session=AAAA' } })).status);

// CSRF / CORS
log('PUT from evil origin', (await call('/api/characters/cprobe', { method: 'PUT', headers: { cookie: A, origin: 'https://evil.example' }, body: JSON.stringify(ch) })).status);
const pre = await call('/api/characters/cprobe', { method: 'OPTIONS', headers: { origin: 'https://evil.example', 'access-control-request-method': 'PUT' } });
log('CORS preflight', `${pre.status} acao=${pre.headers.get('access-control-allow-origin')} acac=${pre.headers.get('access-control-allow-credentials')}`);

// brute force: same e-mail, rotating X-Forwarded-For
let codes = [];
for (let i = 0; i < 12; i++) codes.push((await call('/api/auth/login', { method: 'POST', headers: { 'x-forwarded-for': `10.0.0.${i}` }, body: JSON.stringify({ email: ea, password: 'wrong-password-123' }) })).status);
log('12 wrong logins rotating XFF', codes.join(','));
codes = [];
for (let i = 0; i < 10; i++) codes.push((await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: eb, password: 'wrong-password-123' }) })).status);
log('10 wrong logins same IP', codes.join(','));

// enumeration
const t0 = Date.now(); await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: `nobody-${tag}@example.com`, password: 'x'.repeat(12) }) }); const tNo = Date.now() - t0;
log('login unknown user ms', tNo);

// host header poisoning on reset (dev server logs the link: check the log for the host)
log('forgot with forged x-forwarded-host', (await call('/api/auth/forgot', { method: 'POST', headers: { 'x-forwarded-host': 'evil.example', origin: 'http://evil.example', host: 'evil.example' }, body: JSON.stringify({ email: ea }) })).status);
log('forgot with forged x-forwarded-host (same origin)', (await call('/api/auth/forgot', { method: 'POST', headers: { 'x-forwarded-host': 'evil.example', origin: 'http://evil.example' }, body: JSON.stringify({ email: ea }) })).status);

// body size
const big = JSON.stringify({ ...ch, notes: 'x'.repeat(3_000_000), history: Array.from({ length: 200 }, () => ({ at: 'x', source: 'manual', added: Array.from({ length: 2000 }, (_, i) => `quest:${i}`), removed: [], label: 'x' })) });
const rs = await call('/api/characters/cprobe', { method: 'PUT', headers: { cookie: A }, body: big });
log(`PUT ${(big.length / 1e6).toFixed(1)} MB body`, rs.status);

// injection on public endpoints
for (const q of ["' OR 1=1--", '%', '<script>alert(1)</script>', '../../etc/passwd']) {
  const r = await call(`/api/items/search?q=${encodeURIComponent(q)}`);
  log(`items q=${q}`, `${r.status} ${(await r.text()).slice(0, 60)}`);
}
for (const p of ['/api/quests/1%20OR%201=1', '/api/quests/..%2F..%2Fpackage.json', '/api/achievements?categories=1,2,' + Array.from({ length: 5000 }, (_, i) => i).join(','), '/api/builds?breed=../../', '/api/auth/../../package.json', '/api/auth/nope', '/.env', '/data/app.sqlite', '/.git/config', '/package.json', '/next.config.ts', '/_next/../package.json']) {
  const r = await call(p);
  log(`GET ${p.slice(0, 60)}`, `${r.status} ${(await r.text()).slice(0, 80).replace(/\s+/g, ' ')}`);
}
// methods
log('DELETE /api/characters (collection)', (await call('/api/characters', { method: 'DELETE', headers: { cookie: A } })).status);
log('GET /api/auth/login', (await call('/api/auth/login')).status);
log('malformed JSON register', (await call('/api/auth/register', { method: 'POST', body: '{not json' })).status);

// headers
const home = await fetch(B + '/');
for (const h of ['content-security-policy', 'strict-transport-security', 'x-content-type-options', 'referrer-policy', 'x-frame-options', 'permissions-policy', 'x-powered-by']) log(`header ${h}`, home.headers.get(h));

console.log(out.join('\n'));
