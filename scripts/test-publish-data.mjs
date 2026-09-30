import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePublishData } from './validate-publish-data.mjs';

const now = Date.parse('2026-09-30T05:00:00Z');
const iso = age => new Date(now - age).toISOString();
const minute = 60_000;
function fixture() {
  const rows = Array.from({ length: 42 }, (_, i) => ({ port_number: String(i + 1), current_wait_time: i }));
  return {
    crossings: { count: 42, fetched_at: iso(10 * minute), crossings: rows },
    fx: { fetched_at: iso(10 * minute), rate: 18.02, base_currency: 'USD', target_currency: 'MXN' },
    history: { lookback_days: 30, generated_at: iso(9 * minute), snapshots: [
      { fetched_at: iso(29 * 86400000), crossings: rows },
      { fetched_at: iso(10 * minute), crossings: rows },
    ] },
  };
}
test('valid publication reports its real source times, coverage and zero wait', () => {
  const report = validatePublishData(fixture(), now);
  assert.equal(report.crossing_count, 42);
  assert.equal(report.history_snapshot_count, 2);
  assert.equal(report.cbp_fetched_at, iso(10 * minute));
});
for (const [name, breakData] of [
  ['stale collector', d => { d.crossings.fetched_at = iso(91 * minute); }],
  ['future timestamp', d => { d.crossings.fetched_at = iso(-6 * minute); }],
  ['empty current feed', d => { d.crossings.crossings = []; }],
  ['duplicate identity', d => { d.crossings.crossings[1].port_number = '1'; }],
  ['stale FX', d => { d.fx.fetched_at = iso(49 * 60 * minute); }],
  ['invalid FX', d => { d.fx.rate = 0; }],
  ['collapsed history', d => { d.history.snapshots.shift(); }],
  ['truncated historical snapshot', d => { d.history.snapshots[0].crossings = []; }],
  ['history missing current data', d => { d.history.snapshots.at(-1).fetched_at = iso(11 * minute); }],
  ['history payload mismatch', d => { d.history.snapshots[1].crossings = d.crossings.crossings.map(r => ({...r, current_wait_time: 99})); }],
  ['duplicate snapshot', d => { d.history.snapshots.push(d.history.snapshots.at(-1)); }],
]) test(`publication rejects ${name}`, () => {
  const data = fixture();
  breakData(data);
  assert.throws(() => validatePublishData(data, now));
});
