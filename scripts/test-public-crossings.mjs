import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/public/crossings.js';

function response() {
  return {
    headers: {},
    status(code) { this.statusCode = code; },
    setHeader(key, value) { this.headers[key] = value; },
    end(body) { this.body = JSON.parse(body); },
  };
}
test('public endpoint normalizes official data and permits five-minute CDN caching', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () =>
    Array.from({ length: 42 }, (_, index) => ({
      port_number: String(900000 + index), port_name: `Test crossing ${index}`,
      border: 'Frontera mexicana', port_status: 'Abierto', date: '9/29/2026', time: '8:00 pm',
      passenger_vehicle_lanes: { standard_lanes: { operational_status: 'Sin demora', delay_minutes: '0', lanes_open: '1' } },
    })),
  }));
  const res = response();
  await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.count, 42);
  assert.equal(res.body.crossings[0].current_wait_time, 0);
  assert.equal(res.body.crossings[0].lanes.passenger_standard.status, 'no delay');
  assert.match(res.headers['Vercel-CDN-Cache-Control'], /s-maxage=300/);
  assert.ok(Number.isFinite(Date.parse(res.body.fetched_at)));
});
for (const [name, fetchImpl] of [
  ['upstream outage', async () => { throw new Error('upstream unavailable'); }],
  ['upstream HTTP error', async () => ({ ok: false, status: 503 })],
  ['malformed upstream body', async () => ({ ok: true, json: async () => ({ error: 'bad response' }) })],
  ['collapsed official feed', async () => ({ ok: true, json: async () => [] })],
]) test(`public endpoint does not cache ${name}`, async t => {
  t.mock.method(globalThis, 'fetch', fetchImpl);
  const res = response();
  await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 502);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(res.headers['Vercel-CDN-Cache-Control'], undefined);
});
test('public endpoint rejects mutations without contacting CBP', async t => {
  t.mock.method(globalThis, 'fetch', async () => { assert.fail('must not fetch'); });
  const res = response();
  await handler({ method: 'POST' }, res);
  assert.equal(res.statusCode, 405);
});
