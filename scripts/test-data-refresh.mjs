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
