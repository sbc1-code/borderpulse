import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DataService } from '../src/components/utils/dataService.js';

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
