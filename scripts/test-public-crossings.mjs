import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createCbpPayload } from './fetch-cbp.mjs';
import { canonicalPortNumber } from '../src/lib/portIdentity.js';
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


// Official co-occurring rows observed 2026-10-11 at 00:14 PDT. Main San
// Ysidro is open while PedWest is closed and CBX retains airport-bridge waits.
const sanYsidroRows = JSON.parse(fs.readFileSync(new URL('./fixtures/san-ysidro-family.json', import.meta.url)));
function withOtherPorts(rows) {
  return [...rows, ...Array.from({ length: 35 }, (_, index) => ({
    port_number: String(900000 + index), port_name: `Test crossing ${index}`,
    border: 'Mexican Border', port_status: 'Open', hours: '24 hrs/day',
  }))];
}
function mainRow(rows) {
  return createCbpPayload(withOtherPorts(rows)).crossings.find(row => row.port_number === '250401');
}
test('San Ysidro keeps its own status and hours while all lane reports are pending', () => {
  const orders = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
  for (const order of orders) {
    const rows = order.map(index => sanYsidroRows[index]);
    const row = mainRow(rows);
    assert.ok(row, 'main crossing identity must survive ranking and source order');
    assert.equal(row.name, 'San Ysidro');
    assert.equal(row.crossing_name, '');
    assert.equal(row.port_status, 'Open');
    assert.equal(row.hours, '24 hrs/day');
    assert.equal(row.current_wait_time, null);
    assert.equal(row.lanes.pedestrian_standard.status, 'Update Pending');
    assert.equal(row.lanes.pedestrian_standard.delay_minutes, null, 'CBX zero is not a main-crossing wait');
  }
});
test('San Ysidro never adopts CBX lane waits when its own lane is unavailable', () => {
  const rows = structuredClone(sanYsidroRows);
  rows.find(row => row.port_number === '250401').pedestrian_lanes.standard_lanes.operational_status = 'N/A';
  assert.equal(mainRow(rows).lanes.pedestrian_standard, null);
});
test('San Ysidro preserves actual zero and positive waits from its main row', () => {
  for (const delay of ['0', '85']) {
    const rows = structuredClone(sanYsidroRows);
    rows.find(row => row.port_number === '250401').passenger_vehicle_lanes.standard_lanes = {
      operational_status: delay === '0' ? 'no delay' : 'delay', delay_minutes: delay, lanes_open: '4',
    };
    assert.equal(mainRow(rows).current_wait_time, Number(delay));
  }
});
test('missing main San Ysidro fails closed rather than relabeling another facility', () => {
  assert.throws(() => mainRow(sanYsidroRows.filter(row => row.port_number !== '250401')), /main port 250401 is missing/);
  assert.equal(canonicalPortNumber('250407'), '250407', 'PedWest is not an identity alias for the main crossing');
});
test('public endpoint preserves the main crossing alongside co-occurring sibling rows', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => withOtherPorts(sanYsidroRows) }));
  const res = response();
  await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.crossings.find(row => row.port_number === '250401').port_status, 'Open');
});


test('known San Ysidro facility IDs remain isolated when upstream names change', () => {
  const rows = structuredClone(sanYsidroRows);
  for (const row of rows) row.port_name = 'Renamed source row';
  rows.find(row => row.port_number === '250407').passenger_vehicle_lanes.standard_lanes = {
    operational_status: 'delay', delay_minutes: '170', lanes_open: '5',
  };
  const result = mainRow(rows);
  assert.equal(result.name, 'San Ysidro');
  assert.equal(result.port_status, 'Open');
  assert.equal(result.current_wait_time, null, 'a high-scoring sibling must not supply a wait');
});
test('public endpoint fails without caching if the main San Ysidro row is absent', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => withOtherPorts(sanYsidroRows.filter(row => row.port_number !== '250401')) }));
  const res = response();
  await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 502);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(res.headers['Vercel-CDN-Cache-Control'], undefined);
});
