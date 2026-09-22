import test from 'node:test';
import assert from 'node:assert/strict';
import { createCbpPayload } from './fetch-cbp.mjs';
import publicCrossingsHandler from '../api/public/crossings.js';

function lane(delay = 10) {
  return {
    operational_status: 'Sin demora',
    delay_minutes: String(delay),
    lanes_open: '2',
    update_time: '03:00 PM',
  };
}

function sourcePort({
  portNumber = '250401',
  portName = 'San Ysidro',
  passengerLanes = { standard_lanes: lane() },
} = {}) {
  return {
    port_number: portNumber,
    port_name: portName,
    crossing_name: 'Passenger',
    border: 'Frontera mexicana',
    hours: '24 Hours',
    port_status: 'Abierto',
    construction_notice: null,
    date: '09/22/2026',
    time: '03:00 PM',
    passenger_vehicle_lanes: passengerLanes,
    pedestrian_lanes: null,
    commercial_vehicle_lanes: null,
  };
}

async function invoke(handler, req) {
  let resolve;
  const result = new Promise((done) => { resolve = done; });
  const res = {
    statusCode: 200,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name] = value; return this; },
    end(body) { resolve({ status: this.statusCode, headers: this.headers, body: JSON.parse(body) }); },
  };
  await handler(req, res);
  return result;
}

test('normalizes localized CBP rows and preserves pinned identity', () => {
  const payload = createCbpPayload([
    sourcePort(),
    sourcePort({
      portNumber: '250407',
      passengerLanes: { ready_lanes: lane(20) },
    }),
  ], {
    minimumCrossings: 1,
    fetchedAt: '2026-09-22T22:00:00.000Z',
  });

  assert.equal(payload.source, 'U.S. Customs and Border Protection');
  assert.equal(payload.fetched_at, '2026-09-22T22:00:00.000Z');
  assert.equal(payload.count, 1);
  assert.equal(payload.crossings[0].port_number, '250401');
  assert.equal(payload.crossings[0].border, 'Mexican Border');
  assert.equal(payload.crossings[0].port_status, 'Open');
  assert.equal(payload.crossings[0].current_wait_time, 10);
  assert.equal(payload.crossings[0].lanes.passenger_ready.delay_minutes, 20);
});

test('refuses an implausibly short official response', () => {
  assert.throws(
    () => createCbpPayload([], { minimumCrossings: 1 }),
    /Refusing CBP payload: 0 Mexican-border crossings/,
  );
});

test('public Vercel handler caches only a healthy normalized payload', async () => {
  const raw = Array.from({ length: 35 }, (_, index) => sourcePort({
    portNumber: String(900000 + index),
    portName: `Example Port ${index}`,
  }));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => raw });
  try {
    const result = await invoke(publicCrossingsHandler, { method: 'GET' });
    assert.equal(result.status, 200);
    assert.equal(result.body.count, 35);
    assert.match(result.headers['Vercel-CDN-Cache-Control'], /s-maxage=300/);
    assert.equal(result.headers['Cache-Control'], 'public, max-age=0, must-revalidate');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('public Vercel handler does not cache an unsupported method', async () => {
  const result = await invoke(publicCrossingsHandler, { method: 'POST' });
  assert.equal(result.status, 405);
  assert.equal(result.headers['Cache-Control'], 'no-store');
});
