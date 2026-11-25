// Local API of the companion: the Atlas site, open in the player's browser, reads events from here and says what it
// did with each one. Plain Node (no Electron), so it is tested on its own (tests/companion-api.test.ts).
// Security: 127.0.0.1 only; a Host check (DNS rebinding); an allow-list of site origins (CORS); a bearer token shown
// in the companion window (pairing); small, validated bodies.
import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';

export const PORT = 47120;
const ACKS = ['applied', 'pending', 'rejected', 'ignored'];
const MAX_BODY = 64 * 1024;

/**
 * @param {{ token: () => string, origins: () => string[],
 *   status: () => object, events: (after: string | null) => object[],
 *   ack: (acks: { eventId: string, status: string }[]) => void, control: (c: { mode?: string, stop?: boolean }) => void }} o
 */
export function createApi(o) {
  return createServer(async (req, res) => {
    const port = req.socket.localPort;
    const origin = req.headers.origin;
    const allowed = origin && o.origins().includes(origin);
    const send = (code, body) => {
      const h = { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
      if (allowed) Object.assign(h, {
        'access-control-allow-origin': origin, vary: 'Origin',
        'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST',
        // Chrome's local-network access: a site may call this loopback address only if it says so
        'access-control-allow-private-network': 'true',
      });
      res.writeHead(code, h).end(body === undefined ? '' : JSON.stringify(body));
    };
    if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host ?? '')) return send(421, { error: 'host' });
    if (origin && !allowed) return send(403, { error: 'origin' });
    if (req.method === 'OPTIONS') return send(204);
    if (!authorised(req.headers.authorization, o.token())) return send(401, { error: 'token' });

    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    try {
      if (req.method === 'GET' && url.pathname === '/v1/status') return send(200, o.status());
      if (req.method === 'GET' && url.pathname === '/v1/events') {
        const after = url.searchParams.get('after');
        if (after && !/^[a-z0-9]{10,40}$/.test(after)) return send(400, { error: 'after' });
        return send(200, { events: o.events(after) });
      }
      if (req.method === 'POST' && (url.pathname === '/v1/ack' || url.pathname === '/v1/control')) {
        if (!(req.headers['content-type'] ?? '').startsWith('application/json')) return send(415, { error: 'type' });
        const body = await readBody(req);
        if (url.pathname === '/v1/ack') {
          const acks = Array.isArray(body?.acks) ? body.acks : null;
          if (!acks || acks.length > 500 || !acks.every((a) => typeof a?.eventId === 'string' && /^[a-z0-9]{10,40}$/.test(a.eventId) && ACKS.includes(a.status))) return send(400, { error: 'acks' });
          o.ack(acks.map((a) => ({ eventId: a.eventId, status: a.status })));
          return send(200, { ok: true });
        }
        const c = {};
        if (['observation', 'assisted', 'automatic'].includes(body?.mode)) c.mode = body.mode;
        if (typeof body?.stop === 'boolean') c.stop = body.stop;
        if (!Object.keys(c).length) return send(400, { error: 'control' });
        o.control(c);
        return send(200, o.status());
      }
      return send(404, { error: 'not found' });
    } catch (e) {
      return send(e?.code === 'BODY' ? 413 : 400, { error: e?.code === 'BODY' ? 'too large' : 'bad request' });
    }
  });
}

function authorised(header, token) {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(header ?? '');
  if (!m || !token) return false;
  const a = Buffer.from(m[1]), b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      // over the limit: answer 413 at once, then drain the rest without keeping it
      if (size > MAX_BODY) { req.removeAllListeners('data'); req.resume(); reject(Object.assign(new Error('body'), { code: 'BODY' })); } else chunks.push(c);
    });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
