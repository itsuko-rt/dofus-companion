import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApi } from '../companion/api.mjs';

const TOKEN = 'a'.repeat(64);
const ORIGIN = 'http://127.0.0.1:3101';

async function withApi(fn: (call: (path: string, init?: RequestInit & { host?: string }) => Promise<Response>, log: { acks: unknown[]; control: unknown[] }) => Promise<void>) {
  const log = { acks: [] as unknown[], control: [] as unknown[] };
  const events = [{ eventId: 'm0aaaaaaaaaa01', type: 'character.seen' }, { eventId: 'm0aaaaaaaaaa02', type: 'quest.completed' }];
  const server = createApi({
    token: () => TOKEN, origins: () => [ORIGIN],
    status: () => ({ mode: 'assisted' }),
    events: (after: string | null) => events.filter((e) => !after || e.eventId > after),
    ack: (a: unknown[]) => log.acks.push(...a), control: (c: unknown) => log.control.push(c),
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as AddressInfo).port;
  const call = (path: string, init: RequestInit & { host?: string } = {}) => {
    const headers = new Headers(init.headers);
    // fetch cannot set Host: a raw request is used for the rebinding check below
    return fetch(`http://127.0.0.1:${port}${path}`, { ...init, headers });
  };
  try { await fn(call, log); } finally { server.close(); }
}
const auth = { authorization: `Bearer ${TOKEN}`, origin: ORIGIN };

test('companion API: no token, a wrong token or another site gets nothing', async () => {
  await withApi(async (call) => {
    assert.equal((await call('/v1/events')).status, 401);
    assert.equal((await call('/v1/events', { headers: { authorization: `Bearer ${'b'.repeat(64)}` } })).status, 401);
    const evil = await call('/v1/events', { headers: { ...auth, origin: 'https://evil.example' } });
    assert.equal(evil.status, 403);
    assert.equal(evil.headers.get('access-control-allow-origin'), null);
    const ok = await call('/v1/events', { headers: auth });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('access-control-allow-origin'), ORIGIN);
  });
});

test('companion API: a request for another host name (DNS rebinding) is refused', async () => {
  await withApi(async (call) => {
    const { request } = await import('node:http');
    const port = Number(new URL((await call('/v1/status', { headers: auth })).url).port);
    const status = await new Promise<number>((resolve) => {
      request({ host: '127.0.0.1', port, path: '/v1/status', headers: { ...auth, host: `attacker.example:${port}` } }, (r) => resolve(r.statusCode!)).end();
    });
    assert.equal(status, 421);
  });
});

test('companion API: events after an id, validated acknowledgements and controls', async () => {
  await withApi(async (call, log) => {
    const after = await (await call('/v1/events?after=m0aaaaaaaaaa01', { headers: auth })).json();
    assert.deepEqual(after.events.map((e: { eventId: string }) => e.eventId), ['m0aaaaaaaaaa02']);
    assert.equal((await call('/v1/events?after=../../x', { headers: auth })).status, 400);
    const post = (path: string, body: unknown) => call(path, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await post('/v1/ack', { acks: [{ eventId: 'm0aaaaaaaaaa02', status: 'applied' }] })).status, 200);
    assert.equal((await post('/v1/ack', { acks: [{ eventId: 'm0aaaaaaaaaa02', status: 'deleted' }] })).status, 400);
    assert.equal((await post('/v1/control', { stop: true })).status, 200);
    assert.equal((await post('/v1/control', { mode: 'god' })).status, 400);
    assert.equal((await post('/v1/ack', { acks: 'x'.repeat(70_000) })).status, 413);
    assert.deepEqual(log.acks, [{ eventId: 'm0aaaaaaaaaa02', status: 'applied' }]);
    assert.deepEqual(log.control, [{ stop: true }]);
  });
});
