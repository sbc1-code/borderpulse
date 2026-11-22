import test from 'node:test';
import assert from 'node:assert/strict';
import { recentTimelineEntries, RECENT_TIMELINE_DAYS } from '../src/lib/timelineFreshness.js';

const now = Date.parse('2026-10-30T00:00:00.000Z');
const item = (id, at) => ({ id, published_at: typeof at === 'number' ? new Date(at).toISOString() : at });

test('the retained March 31 San Ysidro story does not appear as recent in October', () => {
  const story = { id: '7bea0c4e0739', published_at: '2026-03-31T20:46:53.000Z',
    url: 'https://www.cbp.gov/newsroom/national-media-release/cbp-officers-seize-fentanyl-heroin-san-ysidro-port-entry' };
  const original = JSON.stringify(story);
  assert.deepEqual(recentTimelineEntries([story], now), []);
  assert.equal(JSON.stringify(story), original);
});

test('publication age has an inclusive 30-day boundary and rejects future or unknown dates', () => {
  const cutoff = now - RECENT_TIMELINE_DAYS * 24 * 60 * 60 * 1000;
  const entries = [item('boundary', cutoff), item('old', cutoff - 1), item('future', now + 1),
    item('now', now), item('missing', undefined), item('invalid', 'not a date'), null];
  assert.deepEqual(recentTimelineEntries(entries, now).map(entry => entry.id), ['now', 'boundary']);
  assert.deepEqual(recentTimelineEntries(null, now), []);
});

test('newest eligible items appear first, with an eight-card limit and no data mutation', () => {
  const entries = Array.from({ length: 10 }, (_, index) => item(String(index), now - index * 60_000)).reverse();
  const original = JSON.stringify(entries);
  assert.deepEqual(recentTimelineEntries(entries, now).map(entry => entry.id), ['0','1','2','3','4','5','6','7']);
  assert.equal(JSON.stringify(entries), original);
});
