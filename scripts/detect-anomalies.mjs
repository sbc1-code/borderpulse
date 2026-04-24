import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANOMALY_CONFIG as CFG } from './lib/anomaly-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

async function loadSlugMap() {
  const mod = await import(path.resolve(root, 'src/lib/slugs.js'));
  const doc = JSON.parse(fs.readFileSync(path.resolve(root, 'public/data/crossings.json'), 'utf8'));
  const { portToSlug } = mod.buildSlugMap(doc.crossings || []);
  return {
    portToSlug,
    crossings: doc.crossings || [],
    snapshotTimestamp: doc.fetched_at || doc.timestamp || null,
  };
}

function loadAggregate(slug) {
  const p = path.resolve(root, 'public/data/aggregates', `${slug}.json`);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function hoursAgo(iso) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

function crossingById(crossings, portNumber) {
  return crossings.find((c) => c.port_number === portNumber) || null;
}

// DETECTOR: "lowest today"
// Scans today's (day-of-week, hour) cells in the 30d aggregate for the specified port
// and finds hours where the current median is significantly below the port's overall median.
// Data-only signal. The model decides whether it's a story.
function detectLowestToday(aggregate, portMeta) {
  if (!aggregate || !aggregate.by_hour) return [];
  const today = new Date().getUTCDay();
  const todayCells = aggregate.by_hour
    .filter((s) => s.day === today && s.samples >= CFG.minSamplesPerCell && s.median != null);
  if (todayCells.length === 0) return [];

  const overallMedian = aggregate.overall_median;
  if (overallMedian == null) return [];

  const sorted = [...todayCells].sort((a, b) => a.median - b.median);
  const lightest = sorted[0];
  if (lightest.median > overallMedian * CFG.lowestTodayRatio) return [];

  return [
    {
      type: 'lowest_today',
      port_number: aggregate.port_number,
      port_name: aggregate.name,
      port_slug: portMeta.slug,
      state: portMeta.state,
      finding: `Lightest ${DAY_NAMES[today]} hour at ${aggregate.name} in the last 30 days is hour ${lightest.hour} (median ${lightest.median} min) vs overall median ${overallMedian} min.`,
      evidence: {
        day_of_week: today,
        day_label: DAY_NAMES[today],
        best_hour: lightest.hour,
        best_median: lightest.median,
        overall_median: overallMedian,
        samples: lightest.samples,
      },
    },
  ];
}

// DETECTOR: "sunday spike"
// Compares Sunday evening hours 16 to 22 against the aggregate's overall median.
// Mirrors the "LENTRI" Sunday backup pattern documented in the research dossier.
function detectSundaySpike(aggregate, portMeta) {
  if (!aggregate || !aggregate.by_hour) return [];
  const sundayEvening = aggregate.by_hour.filter(
    (s) => s.day === 0 && s.hour >= 16 && s.hour <= 22 && s.samples >= CFG.minSamplesPerCell && s.median != null,
  );
  if (sundayEvening.length === 0) return [];
  const overallMedian = aggregate.overall_median || 0;
  if (overallMedian === 0) return [];

  const peak = sundayEvening.reduce((a, b) => (a.median > b.median ? a : b));
  if (peak.median < overallMedian * CFG.sundaySpikeRatio) return [];

  return [
    {
      type: 'sunday_spike',
      port_number: aggregate.port_number,
      port_name: aggregate.name,
      port_slug: portMeta.slug,
      state: portMeta.state,
      finding: `${aggregate.name} Sunday peak at hour ${peak.hour} reaches ${peak.median} min median, ${((peak.median / overallMedian) * 100).toFixed(0)}% of the 30-day overall median.`,
      evidence: {
        peak_hour: peak.hour,
        peak_median: peak.median,
        overall_median: overallMedian,
        samples: peak.samples,
        ratio: peak.median / overallMedian,
      },
    },
  ];
}

async function main() {
  const outDir = path.resolve(root, 'drafts/blog/auto-a');
  fs.mkdirSync(outDir, { recursive: true });

  const { portToSlug, crossings, snapshotTimestamp } = await loadSlugMap();
  const staleness = hoursAgo(snapshotTimestamp);
  const skipStaleness = process.env.ANOMALY_SKIP_STALENESS === '1';
  if (staleness > CFG.maxStalenessHours && !skipStaleness) {
    console.warn(
      `[anomaly] crossings snapshot is ${staleness.toFixed(1)}h old (limit ${CFG.maxStalenessHours}h). Skipping run. Set ANOMALY_SKIP_STALENESS=1 to override (local dev only).`,
    );
    fs.writeFileSync(
      path.resolve(outDir, 'queue.json'),
      JSON.stringify({ generated_at: new Date().toISOString(), skipped: 'stale', anomalies: [] }, null, 2),
    );
    return;
  }

  const anomalies = [];
  for (const portNumber of CFG.topPortNumbers) {
    const slug = portToSlug[portNumber];
    if (!slug) continue;
    const cross = crossingById(crossings, portNumber);
    if (!cross) continue;
    const agg = loadAggregate(slug);
    if (!agg) continue;

    const portMeta = { slug, state: cross.state };
    anomalies.push(...detectLowestToday(agg, portMeta));
    anomalies.push(...detectSundaySpike(agg, portMeta));
  }

  // Score and cap. Higher score = more newsworthy.
  // lowest_today: stronger signal = smaller best/overall ratio
  // sunday_spike: stronger signal = larger peak/overall ratio
  for (const a of anomalies) {
    if (a.type === 'lowest_today') {
      a.severity = 1 - a.evidence.best_median / Math.max(1, a.evidence.overall_median);
    } else if (a.type === 'sunday_spike') {
      a.severity = a.evidence.ratio - 1;
    } else {
      a.severity = 0;
    }
  }
  anomalies.sort((a, b) => b.severity - a.severity);
  const capped = anomalies.slice(0, CFG.maxDraftsPerRun);

  const out = {
    generated_at: new Date().toISOString(),
    snapshot_at: snapshotTimestamp,
    detected_count: anomalies.length,
    anomalies: capped,
  };
  fs.writeFileSync(path.resolve(outDir, 'queue.json'), JSON.stringify(out, null, 2));

  console.log(
    `[anomaly] detected ${anomalies.length}, capped to ${capped.length} (maxDraftsPerRun=${CFG.maxDraftsPerRun}).`,
  );
  if (anomalies.length === 0) {
    console.log('[anomaly] no anomalies tripped thresholds today. This is normal.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
