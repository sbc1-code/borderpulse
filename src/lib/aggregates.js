// Shared confidence floor for the (day, hour) aggregate grid.
//
// Why this lives in one file: the floor was previously declared three times
// (CrossingDetail, BestTime, Compare) and every copy sat at 1, so a single
// CBP reading rendered as a confident "best time to cross" recommendation.
//
// Why 5 is now affordable: build-aggregates.mjs pools each (day, hour) cell
// with an adaptive centred window over neighbouring hours (up to +/-2h, only
// widening when a cell is short of samples). That lifted per-cell density from
// median 2 to median 10, so 88% of cells clear this floor -- against 7% under
// the old raw 7x24 grid, where 5 would have blanked the heatmap.
//
// This floor is a property of the data, not a preference. It was 2 while the
// grid was raw. If the bucketing changes again, re-measure before moving it.
export const MIN_CELL_SAMPLES = 5;

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
