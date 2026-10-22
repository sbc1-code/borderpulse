import test from 'node:test';
import assert from 'node:assert/strict';
import { historicalPatternFor } from '../src/lib/historicalPattern.js';
const now = Date.parse('2026-10-21T20:00:00Z'); // Wednesday, including California.
const sunday = { type: 'sunday_spike', port_slug: 'calexico-east', detected_at: '2026-10-18T18:00:00Z', summary_en: 'Right now, choose this crossing', evidence: { peak_hour: 21, peak_median: 120, overall_median: 30, samples: 15 } };
const feed = (...entries) => ({ snapshot_at: '2026-10-21T19:45:00Z', generated_at: '2026-10-21T19:50:00Z', active: entries.length ? entries : [structuredClone(sunday)] });
const select = value => historicalPatternFor(value, 'calexico-east', now);

test('Sunday evidence stays Sunday on Wednesday; generated prose and first-detection time are not observations', () => {
  const p = select(feed());
  assert.deepEqual(p, { state: 'historical', type: 'sunday_spike', day: 0, hour: 21, median: 120, baseline: 30, samples: 15, snapshotAt: '2026-10-21T19:45:00Z', generatedAt: '2026-10-21T19:50:00Z' });
  assert.ok(!JSON.stringify(p).includes('Right now'));
  assert.ok(!JSON.stringify(p).includes('2026-10-18'));
});
test('lowest_today describes its evidenced weekday and preserves a genuine zero', () => {
  const p = select(feed({ ...sunday, type: 'lowest_today', evidence: { day_of_week: 1, best_hour: 0, best_median: 0, overall_median: 30, samples: 2 } }));
  assert.equal(p.day, 1);
  assert.equal(p.median, 0);
  assert.equal(p.hour, 0);
  assert.equal(p.state, 'historical');
});
test('missing, invalid or future source timing withdraws the numerical interpretation', () => {
  for (const key of ['snapshot_at', 'generated_at']) for (const value of [null, '', 'invalid', '1', '2026-10-21T12:00:00', '2026-02-30T12:00:00Z', '2026-10-22T20:00:00Z']) {
    assert.deepEqual(select({ ...feed(), [key]: value }), { state: 'unverified' }, `${key}: ${value}`);
  }
});
test('dated historical evidence remains available; unchanged generation time may precede a newer source snapshot', () => {
  const p = select({ ...feed(), generated_at: '2026-10-01T12:00:00Z' });
  assert.equal(p.state, 'historical');
  assert.equal(p.generatedAt, '2026-10-01T12:00:00Z');
});
test('non-numeric, negative, non-finite and missing evidence cannot become a historical fact', () => {
  for (const key of ['peak_median', 'overall_median']) for (const value of [undefined, null, '120', -1, Infinity, NaN]) {
    const item = structuredClone(sunday); item.evidence[key] = value;
    assert.deepEqual(select(feed(item)), { state: 'unverified' });
  }
  for (const samples of [0, -1, 1.5, '15', NaN, Infinity]) assert.deepEqual(select(feed({ ...sunday, evidence: { ...sunday.evidence, samples } })), { state: 'unverified' });
});
test('weekday/hour evidence follows the detector domains without changing detection thresholds', () => {
  for (const peak_hour of [-1, 0, 15, 23, 24, 21.5, '21']) assert.deepEqual(select(feed({ ...sunday, evidence: { ...sunday.evidence, peak_hour } })), { state: 'unverified' });
  for (const day_of_week of [-1, 7, 1.5, '1']) assert.deepEqual(select(feed({ ...sunday, type: 'lowest_today', evidence: { day_of_week, best_hour: 3, best_median: 5, overall_median: 30, samples: 2 } })), { state: 'unverified' });
});
test('wrong port and absent feed do not create a card; malformed first item does not hide later valid evidence', () => {
  for (const value of [null, {}, { active: {} }, { active: [null] }, feed({ ...sunday, port_slug: 'another-port' })]) assert.equal(select(value), null);
  assert.equal(select(feed({ ...sunday, type: 'unknown' }, sunday)).state, 'historical');
  assert.deepEqual(select(feed({ ...sunday, type: 'unknown' })), { state: 'unverified' });
});
test('a corrected source response restores verified historical evidence', () => {
  const broken = feed(); broken.active[0].evidence.peak_median = null;
  assert.equal(select(broken).state, 'unverified');
  assert.equal(select(feed()).state, 'historical');
});
