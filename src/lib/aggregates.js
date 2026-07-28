// Shared confidence floor for the (day, hour) aggregate grid.
//
// Why this lives in one file: the floor was previously declared three times
// (CrossingDetail, BestTime, Compare) and every copy sat at 1, so a single
// CBP reading rendered as a confident "best time to cross" recommendation.
//
// Why 2 and not higher: measured against the real 30-day window on
// 2026-07-27 (389 snapshots, 4,385 populated cells across 44 crossings),
// per-cell density is median 2, mean 2.6, max 6. GitHub throttles the
// 15-minute cron to roughly 13 commits/day, and a 7x24 grid spreads those
// thin. A floor of 2 suppresses the 23% of cells resting on one observation
// -- the genuinely meaningless ones -- while keeping the grid readable.
// A floor of 5 would blank 93% of it.
//
// Raising this is gated on re-bucketing the grid (pooling weekday/weekend
// x hour instead of day x hour), which roughly triples per-cell density.
// Do that first, then raise this. See ROADMAP.md.
export const MIN_CELL_SAMPLES = 2;

// True when a cell has no median or too few observations to publish a number.
// Callers should render a "not enough data" state rather than a figure.
//
// build-aggregates.mjs emits `samples` on by_hour rows, but several call sites
// defensively read `sample_count` (the document-level field name). Accept both
// so this can't silently treat a populated cell as empty.
export function cellSamples(entry) {
  if (!entry) return 0;
  if (typeof entry.samples === 'number') return entry.samples;
  if (typeof entry.sample_count === 'number') return entry.sample_count;
  return 0;
}

export function isSparseCell(entry) {
  if (!entry) return true;
  if (typeof entry.median !== 'number') return true;
  return cellSamples(entry) < MIN_CELL_SAMPLES;
}
