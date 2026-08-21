import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FRESHNESS,
  FRESH_MAX_MINUTES,
  AGING_MAX_MINUTES,
  ageMinutes,
  freshnessOf,
  formatAge,
  liveLabel,
  summarize,
} from '../src/lib/trustState.js';

const NOW = Date.parse('2026-08-21T12:00:00.000Z');
const minutesAgo = (m) => new Date(NOW - m * 60_000).toISOString();

test('freshness boundaries are inclusive on the fresh side', () => {
  // Exactly at the threshold must still count as fresh, so a card does not
  // flip to "stale" one second after a perfectly normal refresh.
  assert.equal(freshnessOf(minutesAgo(FRESH_MAX_MINUTES), NOW).state, FRESHNESS.FRESH);
  assert.equal(freshnessOf(minutesAgo(FRESH_MAX_MINUTES + 1), NOW).state, FRESHNESS.AGING);
  assert.equal(freshnessOf(minutesAgo(AGING_MAX_MINUTES), NOW).state, FRESHNESS.AGING);
  assert.equal(freshnessOf(minutesAgo(AGING_MAX_MINUTES + 1), NOW).state, FRESHNESS.STALE);
});

test('thresholds tolerate real measured delivery, not the configured cron', () => {
  // Measured snapshot gaps: p50 38, p75 45, p90 55, p95 63 minutes. A p90
  // delivery must NOT read as stale or the banner becomes noise again, which
  // is why the previous time-based banner was removed.
  assert.notEqual(freshnessOf(minutesAgo(38), NOW).state, FRESHNESS.STALE);
  assert.notEqual(freshnessOf(minutesAgo(55), NOW).state, FRESHNESS.STALE);
  assert.notEqual(freshnessOf(minutesAgo(63), NOW).state, FRESHNESS.STALE);
  // But a genuine outage must be caught.
  assert.equal(freshnessOf(minutesAgo(240), NOW).state, FRESHNESS.STALE);
});

test('missing or unparseable timestamps are unknown, never zero', () => {
  for (const bad of [null, undefined, '', 'not-a-date']) {
    assert.equal(ageMinutes(bad, NOW), null);
    assert.equal(freshnessOf(bad, NOW).state, FRESHNESS.UNKNOWN);
  }
  // An unknown age must not render as "Live".
  assert.notEqual(liveLabel(FRESHNESS.UNKNOWN, null, 'en'), 'Live');
});

test('future timestamps clamp to zero rather than going negative', () => {
  assert.equal(ageMinutes(new Date(NOW + 60_000).toISOString(), NOW), 0);
});

test('only fresh data is allowed to call itself Live, in both languages', () => {
  assert.equal(liveLabel(FRESHNESS.FRESH, 3, 'en'), 'Live');
  assert.equal(liveLabel(FRESHNESS.FRESH, 3, 'es'), 'En vivo');
  for (const state of [FRESHNESS.AGING, FRESHNESS.STALE, FRESHNESS.UNKNOWN]) {
    assert.doesNotMatch(liveLabel(state, 120, 'en'), /^Live$/);
    assert.doesNotMatch(liveLabel(state, 120, 'es'), /^En vivo$/);
  }
});

test('age formatting is localized and reads naturally at each scale', () => {
  assert.equal(formatAge(0, 'en'), 'just now');
  assert.equal(formatAge(0, 'es'), 'ahora mismo');
  assert.equal(formatAge(46, 'en'), '46 min ago');
  assert.equal(formatAge(46, 'es'), 'hace 46 min');
  assert.equal(formatAge(60, 'en'), '1 h ago');
  assert.equal(formatAge(91, 'en'), '1 h 31 min ago');
  assert.equal(formatAge(91, 'es'), 'hace 1 h 31 min');
  assert.equal(formatAge(null, 'en'), 'time unknown');
});

test('summarize uses the median, because border waits are right-skewed', () => {
  // The exact live sample that motivated this: mean 35 vs median 15, a 133%
  // overstatement driven by a tail of 90-170 minute ports.
  const live = [0, 0, 1, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 7, 10, 15, 15, 15, 20,
    20, 20, 20, 30, 35, 38, 40, 60, 90, 90, 120, 150, 150, 170];
  const s = summarize(live);
  assert.equal(s.median, 15);
  assert.equal(s.mean, 35);
  assert.equal(s.count, 33);
  assert.ok(s.mean > s.median * 2, 'sample should demonstrate the skew');
});

test('summarize handles empty, sparse, and dirty input', () => {
  assert.deepEqual(summarize([]), { median: null, mean: null, min: null, max: null, count: 0 });
  assert.deepEqual(summarize(undefined).count, 0);
  assert.equal(summarize([7]).median, 7);
  // Even-length arrays average the two middle values.
  assert.equal(summarize([10, 20]).median, 15);
  // Nulls and undefined are dropped, not coerced to zero, which would drag the
  // median toward a wait nobody reported.
  assert.equal(summarize([10, null, 20, undefined, 30]).count, 3);
  assert.equal(summarize([10, null, 20, undefined, 30]).median, 20);
});

test('a zero wait is a real reading and must survive summarization', () => {
  // Distinct from "no report": 0 min means CBP measured no delay.
  const s = summarize([0, 0, 10]);
  assert.equal(s.count, 3);
  assert.equal(s.min, 0);
  assert.equal(s.median, 0);
});
