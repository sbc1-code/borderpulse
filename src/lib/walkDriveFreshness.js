import { freshnessOf, FRESHNESS } from './trustState.js';

// Retrieval freshness is separate from CBP's clock-only lane report times.
// Missing, malformed and future retrievals cannot support a recommendation.
export function walkDriveFreshness(fetchedAt, now = Date.now()) {
  const freshness = typeof fetchedAt === 'string' && Date.parse(fetchedAt) <= now
    ? freshnessOf(fetchedAt, now)
    : { state: FRESHNESS.UNKNOWN, age: null };
  return {
    ...freshness,
    usable: [FRESHNESS.FRESH, FRESHNESS.AGING].includes(freshness.state),
  };
}
