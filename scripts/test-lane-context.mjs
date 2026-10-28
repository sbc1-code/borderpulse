import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LANE, LOCAL_LANES, normalizeLane, laneLabel, withLane } from '../src/lib/laneContext.js';
import { availableLaneWait } from '../src/lib/crossingAvailability.js';

test('only supported lane keys are accepted; invalid and absent URLs use labeled Standard', () => {
  for (const { key } of LOCAL_LANES) assert.equal(normalizeLane(key), key);
  for (const value of [null, '', 'SENTRI', 'commercial_fast', '__proto__', 'https://example.com']) {
    assert.equal(normalizeLane(value), DEFAULT_LANE);
    assert.equal(laneLabel(value, 'en'), 'Standard passenger');
    assert.equal(laneLabel(value, 'es'), 'Auto estándar');
  }
});
test('lane links retain path, unrelated query, and camera anchor; Standard keeps canonical path', () => {
  assert.equal(withLane('/crossing/san-ysidro/#cameras', 'passenger_sentri'), '/crossing/san-ysidro/?lane=passenger_sentri#cameras');
  assert.equal(withLane('/?area=san-diego-tijuana', 'passenger_ready'), '/?area=san-diego-tijuana&lane=passenger_ready');
  assert.equal(withLane('/?lane=passenger_sentri&area=el-paso-juarez', DEFAULT_LANE), '/?area=el-paso-juarez');
});
test('selected lane never falls back to a Standard or summary wait; zero remains a report', () => {
  const crossing = { port_status: 'Open', current_wait_time: 115, northbound_wait_time: 115, lanes: {
    passenger_standard: { status: 'Delay', lanes_open: 1, delay_minutes: 115 },
    passenger_sentri: { status: 'No Delay', lanes_open: 1, delay_minutes: 0 },
  } };
  assert.equal(availableLaneWait(crossing, 'passenger_sentri'), 0);
  assert.equal(availableLaneWait(crossing, 'passenger_ready'), null);
  for (const lane of [null, { status: 'Update Pending', delay_minutes: 0 }, { status: 'Delay', lanes_open: 0, delay_minutes: 25 }, { status: 'Delay', lanes_open: 1, delay_minutes: -1 }]) {
    assert.equal(availableLaneWait({ ...crossing, lanes: { ...crossing.lanes, passenger_sentri: lane } }, 'passenger_sentri'), null);
  }
  assert.equal(availableLaneWait({ ...crossing, port_status: 'Closed' }, 'passenger_sentri'), null);
});
