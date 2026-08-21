// Shared trust-state model: freshness, missing values, and summary semantics.
//
// One place to decide "how confident is the UI allowed to sound", so a badge,
// a banner, and a summary chip can never disagree about the same data.
//
// ---------------------------------------------------------------------------
// Thresholds come from MEASURED delivery, not the configured cron.
// ---------------------------------------------------------------------------
// fetch-cbp.yml requests `*/15 * * * *`, but GitHub throttles scheduled runs.
// Measured across 80 consecutive committed snapshots:
//
//   min 7 · p50 38 · p75 45 · p90 55 · p95 63 · max 102 minutes
//   68% of gaps exceed 30 min, 25% exceed 45 min, only 5% exceed 60 min
//
// So a threshold derived from the *configured* 15 minutes would flag stale
// data roughly two thirds of the time during entirely healthy operation. That
// is precisely why an earlier time-based banner was removed as noise (see the
// history of StaleDataBanner.jsx). The fix is not to drop freshness signalling
// but to base it on what the pipeline actually delivers.
//
// FRESH  <= 45 min   normal delivery (covers p75)
// AGING  45-90 min   slower than usual, still plausible; show the age, no alarm
// STALE  > 90 min    outside normal operation (99th percentile), say so plainly
//
// If the cron cadence or GitHub's throttling changes, re-measure with
// `git log --format=%H -- public/data/crossings.json` before moving these.

export const FRESH_MAX_MINUTES = 45;
export const AGING_MAX_MINUTES = 90;

export const FRESHNESS = {
  FRESH: 'fresh',
  AGING: 'aging',
  STALE: 'stale',
  UNKNOWN: 'unknown',
};

/**
 * Age of a snapshot in minutes. Returns null when the timestamp is missing or
 * unparseable, so callers can distinguish "unknown" from "zero".
 */
export function ageMinutes(timestamp, now = Date.now()) {
  if (!timestamp) return null;
  const t = new Date(timestamp).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((now - t) / 60000));
}

/** Classify a snapshot timestamp into a freshness state. */
export function freshnessOf(timestamp, now = Date.now()) {
  const age = ageMinutes(timestamp, now);
  if (age == null) return { state: FRESHNESS.UNKNOWN, age: null };
  if (age <= FRESH_MAX_MINUTES) return { state: FRESHNESS.FRESH, age };
  if (age <= AGING_MAX_MINUTES) return { state: FRESHNESS.AGING, age };
  return { state: FRESHNESS.STALE, age };
}

/** "just now" / "12 min ago" / "3 h ago" — localized, no dependency. */
export function formatAge(age, language = 'en') {
  if (age == null) return language === 'en' ? 'time unknown' : 'hora desconocida';
  if (age < 2) return language === 'en' ? 'just now' : 'ahora mismo';
  if (age < 60) {
    return language === 'en' ? `${age} min ago` : `hace ${age} min`;
  }
  const h = Math.floor(age / 60);
  const m = age % 60;
  const hs = language === 'en' ? `${h} h` : `${h} h`;
  if (m === 0) return language === 'en' ? `${hs} ago` : `hace ${hs}`;
  return language === 'en' ? `${hs} ${m} min ago` : `hace ${hs} ${m} min`;
}

/**
 * The live-state label for a card footer. Only genuinely recent data is
 * allowed to call itself "Live"; everything else states its age instead of
 * implying a real-time feed.
 */
export function liveLabel(state, age, language = 'en') {
  const en = language === 'en';
  switch (state) {
    case FRESHNESS.FRESH:
      return en ? 'Live' : 'En vivo';
    case FRESHNESS.AGING:
      return formatAge(age, language);
    case FRESHNESS.STALE:
      return en ? `Stale · ${formatAge(age, language)}` : `Desactualizado · ${formatAge(age, language)}`;
    default:
      return en ? 'Age unknown' : 'Antigüedad desconocida';
  }
}

/**
 * Summary statistic for a set of waits.
 *
 * Uses the MEDIAN, not the mean. Border waits are heavily right-skewed: a
 * measured live sample of 33 reporting ports ran mean 35 min against median
 * 15 min, a 133% overstatement, because a long tail of 90-170 minute ports
 * drags the average. A headline labelled "typical" must not be a mean.
 *
 * Returns both so callers can show the median and still describe the spread
 * honestly, plus `count` so a summary can say what it is summarising.
 */
export function summarize(waits) {
  const values = (waits || []).filter((w) => typeof w === 'number').sort((a, b) => a - b);
  if (!values.length) return { median: null, mean: null, min: null, max: null, count: 0 };
  const mid = Math.floor(values.length / 2);
  const median = values.length % 2
    ? values[mid]
    : Math.round((values[mid - 1] + values[mid]) / 2);
  const mean = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  return { median, mean, min: values[0], max: values[values.length - 1], count: values.length };
}
