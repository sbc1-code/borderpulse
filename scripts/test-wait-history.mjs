import test from 'node:test';
import assert from 'node:assert/strict';
import {
  recordSnapshot, getHistory, getHistoryForDirection, getPreviousWait, getAllHistory,
} from '../src/components/utils/waitTimeHistory.js';

const KEY = 'borderPulse_waitHistory_v2';
const LEGACY_KEY = 'borderPulse_waitHistory_v1';
const NOW = Date.parse('2026-10-27T03:00:00Z');
const minute = 60_000;
const day = 24 * 60 * minute;
const iso = time => new Date(time).toISOString();
const crossing = wait => ({ port_number: '250401', current_wait_time: wait });

function fixture(t, values = {}) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const stored = new Map(Object.entries(values));
  const storage = {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: storage });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  });
  t.mock.method(Date, 'now', () => NOW);
  return { stored, storage };
}

test('history records source retrievals once across refresh, enrichment, fallback and recovery', t => {
  fixture(t);
  const sourceTime = NOW - 2 * day;
  recordSnapshot([crossing(0)], 'northbound', iso(sourceTime));
  assert.deepEqual(getHistory('250401'), [{ t: sourceTime, wait: 0 }],
    'an old published reading stays dated at its actual retrieval');
  t.mock.method(Date, 'now', () => NOW + 5 * minute);
  recordSnapshot([crossing(0)], 'northbound', iso(sourceTime));
  recordSnapshot([crossing(99)], 'northbound', iso(sourceTime));
  recordSnapshot([crossing(60)], 'northbound', iso(sourceTime - minute));
  assert.equal(getHistory('250401').length, 1, 'replayed and older snapshots create no observations');
  recordSnapshot([crossing(20)], 'northbound', iso(NOW));
  recordSnapshot([crossing(20)], 'northbound', iso(NOW + minute));
  assert.deepEqual(getHistory('250401'), [
    { t: sourceTime, wait: 0 }, { t: NOW, wait: 20 }, { t: NOW + minute, wait: 20 },
  ], 'a later retrieval is a real sample even if the wait is unchanged');
  assert.equal(getPreviousWait('250401'), 20);
});

test('missing, malformed, future and expired source times never become current history', t => {
  const { stored } = fixture(t);
  for (const sourceTime of [undefined, null, '', 'invalid', NOW, new Date(NOW), iso(NOW + 1), iso(NOW - 7 * day - 1)]) {
    recordSnapshot([crossing(20)], 'northbound', sourceTime);
  }
  assert.deepEqual(getAllHistory(), {});
  assert.equal(stored.has(KEY), false);
  recordSnapshot([crossing(20)], 'northbound', iso(NOW - minute));
  assert.deepEqual(getHistory('250401'), [{ t: NOW - minute, wait: 20 }]);
});

test('unverifiable legacy browser-clock history is preserved without being reused', t => {
  const legacy = JSON.stringify({ '250401': [{ t: NOW - minute, wait: 99 }] });
  const { stored } = fixture(t, { [LEGACY_KEY]: legacy });
  assert.deepEqual(getAllHistory(), {});
  assert.equal(getPreviousWait('250401'), null);
  recordSnapshot([crossing(0)], 'northbound', iso(NOW - minute));
  recordSnapshot([crossing(20)], 'northbound', iso(NOW));
  assert.equal(getPreviousWait('250401'), 0);
  assert.equal(stored.get(LEGACY_KEY), legacy, 'retain the old raw value unchanged');
  assert.equal(JSON.parse(stored.get(KEY))['250401'][0].wait, 0);
});

test('malformed stored data cannot break history consumers or introduce invalid samples', t => {
  const { stored } = fixture(t);
  for (const value of ['invalid', 'null', '42', '[]', '"history"', '{"250401":{}}']) {
    stored.set(KEY, value);
    assert.deepEqual(getAllHistory(), {});
    assert.deepEqual(getHistory('250401'), []);
    assert.equal(getPreviousWait('250401'), null);
  }
  stored.set(KEY, JSON.stringify({ '250401': [
    null, { t: NOW + minute, wait: 99 }, { t: NOW - 8 * day, wait: 99 },
    { t: NOW, wait: -1 }, { t: 'invalid', wait: 99 }, { t: NOW, wait: '99' },
    { t: NOW, wait: 20 }, { t: NOW - minute, wait: 0 }, { t: NOW, wait: 99 },
  ] }));
  assert.deepEqual(getHistory('250401'), [{ t: NOW - minute, wait: 0 }, { t: NOW, wait: 20 }]);
  recordSnapshot([crossing(30)], 'northbound', iso(NOW));
  assert.equal(getHistory('250401').length, 2, 'a duplicate does not overwrite its recorded source');
});

test('directional samples remain separate and unavailable or closed waits are not zero', t => {
  fixture(t);
  const row = { ...crossing(10), southbound_wait_time: 30 };
  recordSnapshot([row], 'northbound', iso(NOW));
  recordSnapshot([row], 'southbound', iso(NOW));
  assert.deepEqual(getAllHistory('northbound'), { '250401': [{ t: NOW, wait: 10 }] });
  assert.deepEqual(getHistoryForDirection('250401', 'southbound'), [{ t: NOW, wait: 30 }]);
  for (const wait of [null, undefined, NaN, Infinity, -1]) {
    recordSnapshot([{ port_number: '250601', current_wait_time: wait }], 'northbound', iso(NOW));
  }
  recordSnapshot([{ port_number: '250601', current_wait_time: 0, port_status: 'Closed' }], 'northbound', iso(NOW));
  assert.deepEqual(getHistory('250601'), []);
  t.mock.method(Date, 'now', () => NOW + 7 * day + 1);
  assert.deepEqual(getAllHistory(), {}, 'expired readings do not persist in analytics');
});

test('storage denial and quota failures leave history usable and later writes can recover', t => {
  const { stored, storage } = fixture(t);
  t.mock.method(console, 'warn', () => {});
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
  assert.doesNotThrow(() => recordSnapshot([crossing(20)], 'northbound', iso(NOW)));
  assert.deepEqual(getAllHistory(), {});
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: storage });
  storage.setItem = () => { throw new Error('quota'); };
  assert.doesNotThrow(() => recordSnapshot([crossing(20)], 'northbound', iso(NOW)));
  assert.deepEqual(getHistory('250401'), []);
  storage.setItem = (key, value) => stored.set(key, value);
  recordSnapshot([crossing(20)], 'northbound', iso(NOW));
  assert.deepEqual(getHistory('250401'), [{ t: NOW, wait: 20 }]);
});
