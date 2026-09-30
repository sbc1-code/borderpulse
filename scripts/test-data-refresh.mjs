import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { DataService } from '../src/components/utils/dataService.js';
import { subscribeToBorderData } from '../src/lib/liveDataSubscription.js';

test('the service worker leaves live CBP responses to the CDN and client fallback', () => {
  const handlers = {};
  let cached = 0;
  vm.runInNewContext(fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: { addEventListener: (name, handler) => { handlers[name] = handler; } },
    location: { origin: 'https://borderpulse.com' }, URL,
    caches: { match: () => { cached++; return Promise.resolve({ stale: true }); } },
  });
  let intercepted = false;
  handlers.fetch({ request: { url: 'https://borderpulse.com/api/public/crossings', mode: 'cors' },
    respondWith: () => { intercepted = true; } });
  assert.equal(intercepted, false, 'a stale offline response must not hide a live endpoint failure');
  assert.equal(cached, 0);
});

test('current waits arrive before a slow optional FX feed', async () => {
  const service = new DataService();
  let finishFx;
  const fx = new Promise(resolve => { finishFx = resolve; });
  service.fetchJson = async path => path === '/data/crossings.json'
    ? { fetched_at: '2026-09-28T00:00:00Z', crossings: [{ port_number: '250401', current_wait_time: 20 }] }
    : path === '/data/exchange-rate.json' ? fx : null;
  const readings = [];
  service.addListener(data => readings.push(data));
  const first = await service.getBorderData();
  assert.equal(first.crossings[0].current_wait_time, 20);
  assert.equal(first.exchange_rate, null);
  const enriched = new Promise(resolve => service.addListener(data => { if (data.exchange_rate) resolve(data); }));
  finishFx({ rate: 18, fetched_at: '2026-09-28T00:00:00Z' });
  assert.equal((await enriched).timestamp, first.timestamp);
  assert.equal(readings.length, 2);
});

test('concurrent refreshes share one request and preserve the latest reading', async () => {
  const service = new DataService();
  let finish;
  let requests = 0;
  service.fetchCrossingsDoc = () => { requests++; return new Promise(resolve => { finish = resolve; }); };
  service.fetchJson = async () => null;
  const first = service.getBorderData();
  const second = service.getBorderData();
  assert.equal(first, second);
  assert.equal(requests, 1);
  finish({ doc: { fetched_at: '2026-09-28T00:15:00Z', crossings: [{ port_number: '250401', current_wait_time: 0 }] }, fromFallback: false });
  assert.equal((await second).crossings[0].current_wait_time, 0);
});

test('current-waits views refresh while open, on tab return and online; cleanup retains other subscribers', async t => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const page = new EventTarget();
  page.visibilityState = 'visible';
  const connection = new EventTarget();
  const service = new DataService();
  let wait = 10;
  let calls = 0;
  service.fetchJson = async path => {
    if (path !== '/data/crossings.json') return null;
    calls++;
    return { fetched_at: '2026-09-28T00:00:00Z', crossings: [{ port_number: '250401', current_wait_time: wait }] };
  };
  const readings = [];
  const unsubscribe = subscribeToBorderData(data => readings.push(data), { service, page, connection });
  await service.inFlight;
  const stopOther = subscribeToBorderData(() => {}, { service, page, connection });
  await service.inFlight;
  wait = 30;
  t.mock.timers.tick(5 * 60_000);
  await service.inFlight;
  assert.equal(readings.at(-1).crossings[0].current_wait_time, 30);
  const beforeHidden = calls;
  page.visibilityState = 'hidden';
  page.dispatchEvent(new Event('visibilitychange'));
  assert.equal(calls, beforeHidden);
  wait = 45;
  page.visibilityState = 'visible';
  page.dispatchEvent(new Event('visibilitychange'));
  await service.inFlight;
  assert.equal(calls, beforeHidden + 1, 'tab return is deduplicated across views');
  assert.equal(readings.at(-1).crossings[0].current_wait_time, 45);
  connection.dispatchEvent(new Event('online'));
  await service.inFlight;
  unsubscribe();
  assert.ok(service.refreshTimer);
  const beforeCleanup = readings.length;
  t.mock.timers.tick(5 * 60_000);
  await service.inFlight;
  assert.equal(readings.length, beforeCleanup);
  stopOther();
  assert.equal(service.refreshTimer, null);
  const finalCalls = calls;
  page.dispatchEvent(new Event('visibilitychange'));
  connection.dispatchEvent(new Event('online'));
  t.mock.timers.tick(5 * 60_000);
  assert.equal(calls, finalCalls);
});

test('subscribers receive new snapshots; network failure preserves the last real timestamp', async () => {
  const service = new DataService();
  const received = [];
  const listener = (data) => received.push(data);
  service.addListener(listener);
  let timestamp = '2026-09-28T00:00:00Z';
  service.fetchJson = async (path) => path === '/data/crossings.json'
    ? { fetched_at: timestamp, crossings: [{ port_number: '250401', name: 'San Ysidro', current_wait_time: 20 }] }
    : null;
  await service.getBorderData();
  timestamp = '2026-09-28T00:15:00Z';
  await service.getBorderData();
  assert.equal(received.length, 2);
  assert.equal(received[1].timestamp, timestamp);
  service.fetchJson = async () => { throw new Error('offline'); };
  const offline = await service.getBorderData();
  assert.equal(offline.success, false);
  assert.equal(offline.timestamp, timestamp);
  assert.equal(offline.crossings[0].current_wait_time, 20);
  service.removeListener(listener);
  await service.getBorderData();
  assert.equal(received.length, 3);
});

test('an initial failure never invents a fresh timestamp', async () => {
  const service = new DataService();
  service.fetchJson = async () => { throw new Error('offline'); };
  const data = await service.getBorderData();
  assert.equal(data.timestamp, null);
  assert.deepEqual(data.crossings, []);
});

test('live failure retains a newer browser reading, then accepts live recovery', async t => {
  const service = new DataService({ liveApi: true });
  let liveTime = '2026-09-29T01:00:00Z';
  let fail = false;
  const doc = fetched_at => ({ fetched_at, crossings: [{ port_number: '250401', current_wait_time: 0 }] });
  t.mock.method(globalThis, 'fetch', async path => {
    assert.equal(path, '/api/public/crossings', 'CDN request has no cache-busting query');
    if (fail) throw new Error('upstream down');
    return { ok: true, json: async () => doc(liveTime) };
  });
  service.fetchJson = async path => path === '/data/crossings.json' ? doc('2026-09-28T01:00:00Z') : null;
  const first = await service.getBorderData();
  assert.equal(first.fromFallback, false);
  fail = true;
  const fallback = await service.getBorderData();
  assert.equal(fallback.timestamp, liveTime);
  assert.equal(fallback.crossings[0].current_wait_time, 0);
  assert.equal(fallback.fromFallback, true);
  fail = false;
  liveTime = '2026-09-29T01:15:00Z';
  assert.equal((await service.getBorderData()).timestamp, liveTime);
});

test('malformed live response falls back to the static timestamp; missing timestamps never become fresh', async t => {
  const service = new DataService({ liveApi: true });
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ crossings: [] }) }));
  const staticTime = '2026-09-28T01:00:00Z';
  service.fetchJson = async path => path === '/data/crossings.json'
    ? { fetched_at: staticTime, crossings: [{ port_number: '250401', current_wait_time: 10 }] } : null;
  assert.equal((await service.getBorderData()).timestamp, staticTime);
  service.fetchJson = async () => ({ crossings: [{ port_number: '250401' }] });
  assert.equal((await service.getBorderData()).timestamp, staticTime);
  service.cache = null;
  assert.equal((await service.getBorderData()).timestamp, null);
});
