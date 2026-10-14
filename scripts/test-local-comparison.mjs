import test from 'node:test';
import assert from 'node:assert/strict';
import { CORRIDORS, localComparison, isOperatingNow } from '../src/lib/corridors.js';
import { camerasFor } from '../src/lib/cameras.js';

const now = Date.parse('2026-10-13T18:00:00Z');
const fresh = new Date(now - 5 * 60_000).toISOString();
const make = (port, wait, overrides = {}) => ({ port_number: port, name: port,
  hours: '24 hrs/day', port_status: 'Open',
  lanes: { passenger_standard: { status: 'Delay', lanes_open: 1, delay_minutes: wait },
    passenger_sentri: { status: 'No Delay', lanes_open: 1, delay_minutes: 0 } }, ...overrides });
const compare = (rows, lane = 'passenger_standard', timestamp = fresh) => localComparison(rows, 'el-paso-juarez', lane, timestamp, now);

test('compare only canonical ports in one corridor, across TX/NM', () => {
  const rows = [make('240202', 30), make('240801', 10, { state: 'NM' }), make('250401', 0)];
  const result = compare(rows);
  assert.equal(result.rows.length, 2);
  assert.equal(result.shortest.crossing.port_number, '240801');
  assert.equal(CORRIDORS.find(c => c.id === 'el-paso-juarez').ports.includes('240221'), false);
});
test('genuine zero remains valid; ties do not invent a winner', () => {
  assert.equal(compare([make('240202', 20), make('240201', 0)]).shortest.wait, 0);
  assert.equal(compare([make('240202', 0), make('240201', 0)]).shortest, null);
});
test('one available report cannot establish a comparative winner', () => {
  assert.equal(compare([make('240202', 0), make('240201', null)]).shortest, null);
});
test('closed ports, zero open lanes, unknown status and missing/pending reports cannot win', () => {
  for (const crossing of [make('240201', 0, { port_status: 'Closed' }), make('240201', 0, { port_status: '' }),
    make('240201', 0, { lanes: { passenger_standard: { status: 'Delay', lanes_open: 0, delay_minutes: 0 } } }),
    make('240201', 0, { lanes: { passenger_standard: { status: 'Update Pending', lanes_open: 1, delay_minutes: 0 } } })]) {
    const result = compare([make('240202', 20), crossing]);
    assert.equal(result.rows[1].wait, null);
    assert.equal(result.shortest, null);
  }
});
test('negative and malformed waits are unavailable, not fastest', () => {
  for (const wait of [-1, '0', NaN, Infinity]) assert.equal(compare([make('240202', 30), make('240201', wait)]).shortest, null);
});
test('no substitution between lane types', () => {
  const row = make('240202', 20);
  delete row.lanes.passenger_sentri;
  const result = compare([row, make('240201', 30)], 'passenger_sentri');
  assert.equal(result.rows[0].wait, null);
  assert.equal(result.shortest, null);
});
test('stale, unknown, invalid and future snapshots suppress the comparative claim', () => {
  const rows = [make('240202', 20), make('240201', 0)];
  for (const timestamp of [null, '', 'bad', new Date(now - 91 * 60_000).toISOString(), new Date(now + 60_000).toISOString()]) {
    const result = compare(rows, 'passenger_standard', timestamp);
    assert.equal(result.shortest, null);
    assert.equal(result.rows[1].wait, 0); // retain last reports, with retrieval label
  }
});
test('hours eligibility uses port local time and exact opening/closing minutes', () => {
  const port = make('240801', 0, { hours: '6:30 AM - 10:00 PM', state: 'NM' });
  assert.equal(isOperatingNow(port, Date.parse('2026-10-13T12:29:00Z')), false);
  assert.equal(isOperatingNow(port, Date.parse('2026-10-13T12:30:00Z')), true);
  assert.equal(isOperatingNow(port, Date.parse('2026-10-14T04:00:00Z')), false);
  assert.equal(isOperatingNow({ ...port, hours: 'Seasonal hours' }, now), false);
});
test('unknown corridor and lane fail closed', () => {
  assert.deepEqual(localComparison([], 'not-a-region', 'passenger_standard', fresh, now), { rows: [], shortest: null });
  assert.deepEqual(compare([make('240202', 0)], 'not-a-lane'), { rows: [], shortest: null });
});
test('camera registry has only reviewed ports and valid public player URLs', () => {
  assert.equal(camerasFor('240801').length, 0);
  for (const port of ['240202', '240204', '240104', '240401', '240201']) {
    assert.equal(camerasFor(port).length, 2);
    for (const view of camerasFor(port)) {
      assert.match(view.id, /^[\w-]{11}$/);
      assert.equal(new URL(view.embedUrl).hostname, 'www.youtube-nocookie.com');
      assert.equal(new URL(view.embedUrl).searchParams.has('autoplay'), false);
    }
  }
});
