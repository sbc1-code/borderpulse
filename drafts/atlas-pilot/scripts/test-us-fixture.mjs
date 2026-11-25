import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeLane, normalizeSnapshot } from './us-fixture.mjs';

const raw = JSON.parse(await readFile(new URL('../fixtures/cbp-us-bound.json', import.meta.url)));
const archived = JSON.parse(await readFile(new URL('../fixtures/us-lanes.json', import.meta.url)));
const normalized = normalizeSnapshot(raw);

test('archived standard-lane output reproduces from official three-port fixture', () => {
  assert.deepEqual(normalized, archived);
  const [pacific, peace, sumas] = normalized.crossings;
  assert.deepEqual([pacific.id, peace.id, sumas.id], ['pacific-highway', 'douglas', 'abbotsford-huntingdon']);
  for (const lane of [pacific.traveler, pacific.commercial, peace.traveler]) {
    assert.deepEqual([lane.state, lane.minutes, lane.raw, lane.reportedAt, lane.ageMinutes],
      ['reported_wait', 5, 'no delay', '2026-11-24T07:00:00.000Z', 40.8]);
  }
  assert.deepEqual([peace.commercial.state, peace.commercial.minutes, peace.commercial.reportedAt],
    ['not_applicable', null, null]);
  for (const lane of [sumas.traveler, sumas.commercial]) {
    assert.deepEqual([lane.state, lane.minutes, lane.reportedAt, lane.ageMinutes],
      ['stale', 0, '2026-11-24T05:00:00.000Z', 160.8]);
  }
});

test('missing or duplicate port, changed source and identity mismatch fail explicitly', () => {
  for (const fixture of [
    { ...raw, ports: raw.ports.slice(1) },
    { ...raw, ports: [...raw.ports, raw.ports[0]] },
    { ...raw, sourceUrl: '' },
    { ...raw, ports: raw.ports.map((p,i) => i === 0 ? { ...p, crossing_name: '' } : p) },
  ]) assert.throws(() => normalizeSnapshot(fixture));
});

test('timestamps, incomplete lanes and unsupported states never invent an available wait', () => {
  const port = raw.ports[0];
  const sample = port.passenger_vehicle_lanes.standard_lanes;
  for (const delta of [
    { update_time: '' }, { update_time: 'At 11:00 pm PDT' }, { update_time: 'At 11:39 pm PST' },
    { delay_minutes: '' }, { delay_minutes: '-1' }, { operational_status: 'Update Pending' },
    { operational_status: 'unexpected' },
  ]) {
    const lane = normalizeLane({ ...sample, ...delta }, port, raw.retrievedAt);
    assert.deepEqual([lane.state, lane.minutes], ['unknown', null]);
  }
  const future = normalizeLane(sample, port, '2026-11-24T06:30:00Z');
  assert.deepEqual([future.state, future.minutes], ['unknown', null]);
  assert.equal(normalizeLane({ ...sample, operational_status: 'Lanes Closed', lanes_open: '0' }, port, raw.retrievedAt).state, 'closed');
});

test('a contradictory port state or lane count cannot confirm a wait or closure', () => {
  const port = raw.ports[0];
  const lane = port.passenger_vehicle_lanes.standard_lanes;
  for (const [p, l] of [
    [{ ...port, port_status: 'Closed' }, lane], [{ ...port, port_status: 'Unknown' }, lane],
    [{ ...port, time: '23:59:00' }, lane],
    [port, { ...lane, lanes_open: '0' }], [port, { ...lane, lanes_open: '-1' }],
    [port, { ...lane, operational_status: 'Lanes Closed', lanes_open: '1' }],
    [port, { ...lane, operational_status: 'N/A', lanes_open: '1' }],
    [port, { ...lane, delay_minutes: ['5'] }], [port, { ...lane, lanes_open: ['1'] }],
  ]) {
    const result = normalizeLane(l, p, raw.retrievedAt);
    assert.deepEqual([result.state, result.minutes], ['unknown', null]);
  }
});
