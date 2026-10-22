const nonnegative = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const integerIn = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
// The publisher emits UTC ISO timestamps. Reject timezone-less strings and
// calendar rollovers rather than interpreting them in the visitor's timezone.
const sourceTime = (value, now) => {
  if (typeof value !== 'string') return false;
  const parts = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/.exec(value);
  const stamp = Date.parse(value);
  return Boolean(parts) && Number.isFinite(stamp) && stamp <= now
    && new Date(stamp).toISOString() === `${parts[1]}.${(parts[2] || '').padEnd(3, '0')}Z`;
};

// These records describe weekday/hour medians in a 30-day sample. Their
// generated prose and retained first-detection date are not live observations.
export function historicalPatternFor(feed, slug, now = Date.now()) {
  if (!Array.isArray(feed?.active) || !slug) return null;
  const entries = feed.active.filter(entry => entry?.port_slug === slug);
  if (!entries.length) return null;
  const unverified = { state: 'unverified' };
  if (!sourceTime(feed.snapshot_at, now) || !sourceTime(feed.generated_at, now)) return unverified;

  for (const entry of entries) {
    const e = entry.evidence;
    if (!e || !integerIn(e.samples, 1, Number.MAX_SAFE_INTEGER) || !nonnegative(e.overall_median)) continue;
    let day, hour, median;
    if (entry.type === 'sunday_spike') {
      day = 0;
      hour = e.peak_hour;
      median = e.peak_median;
      if (!integerIn(hour, 16, 22) || e.overall_median === 0) continue;
    } else if (entry.type === 'lowest_today') {
      day = e.day_of_week;
      hour = e.best_hour;
      median = e.best_median;
      if (!integerIn(day, 0, 6) || !integerIn(hour, 0, 23)) continue;
    } else continue;
    if (!nonnegative(median)) continue;
    return {
      state: 'historical', type: entry.type, day, hour, median,
      baseline: e.overall_median, samples: e.samples,
      snapshotAt: feed.snapshot_at, generatedAt: feed.generated_at,
    };
  }
  return unverified;
}
