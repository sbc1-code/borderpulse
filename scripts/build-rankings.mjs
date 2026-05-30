#!/usr/bin/env node
/**
 * Builds public/data/rankings.json for every crossing that has enough CBP
 * history, ranked by typical (median) northbound wait over the lookback
 * window. Powers the <CrossingRankings /> blog component so the "busiest
 * and fastest crossings" story stays live instead of going stale.
 *
 * Reads the per-crossing aggregates produced by build-aggregates.mjs, so it
 * must run AFTER that step in the build pipeline.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const aggDir = path.resolve(root, 'public/data/aggregates');
const OUT = path.resolve(root, 'public/data/rankings.json');

// A published ranking has to mean something. A crossing with a handful of
// readings in 30 days (e.g. one that barely reports to CBP) can show a "0 min
// typical wait" off a single sample. Exclude those rather than rank them.
const MIN_SAMPLES = 30;

const files = fs.existsSync(aggDir)
  ? fs.readdirSync(aggDir).filter((f) => f.endsWith('.json'))
  : [];

const rows = [];
let lookback = 30;

for (const file of files) {
  const slug = file.replace(/\.json$/, '');
  const d = JSON.parse(fs.readFileSync(path.join(aggDir, file), 'utf8'));
  // Skip crossings without enough history to have a real median. Never
  // publish a ranking row we can't stand behind.
  if (d.overall_median == null) continue;
  if ((d.sample_count ?? 0) < MIN_SAMPLES) continue;
  if (d.lookback_days) lookback = d.lookback_days;
  rows.push({
    slug,
    port_number: d.port_number ?? null,
    name: d.name,
    state: d.state || null,
    overall_median: d.overall_median,
    best_hour: d.overall_best_hour ?? null,
    best_median: d.overall_best_median ?? null,
    sample_count: d.sample_count ?? 0,
  });
}

// Busiest first (highest typical wait); tie-break by sample volume then name
// so the order is deterministic across builds.
rows.sort(
  (a, b) =>
    b.overall_median - a.overall_median ||
    b.sample_count - a.sample_count ||
    a.name.localeCompare(b.name),
);

const payload = {
  generated_at: new Date().toISOString(),
  lookback_days: lookback,
  source: 'U.S. Customs and Border Protection',
  count: rows.length,
  crossings: rows,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
console.log(`Wrote ${rows.length} ranked crossings -> ${OUT}`);
