import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANOMALY_CONFIG as CFG } from './lib/anomaly-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_EN_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES_ES_FULL = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function formatHour12(h) {
  const hr = h % 12 || 12;
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${hr} ${suffix}`;
}

// Bilingual one-liner shown on /crossing/<slug>. Server-rendered so the JSON
// feed is the source of truth and CrossingDetail just reads strings.
function buildSummaries(anomaly) {
  const ev = anomaly.evidence || {};
  if (anomaly.type === 'lowest_today') {
    const pct = Math.round((1 - ev.best_median / Math.max(1, ev.overall_median)) * 100);
    const dayEn = DAY_NAMES_EN_FULL[ev.day_of_week];
    const dayEs = DAY_NAMES_ES_FULL[ev.day_of_week];
    return {
      summary_en: `Right now ${anomaly.port_name}'s lightest ${dayEn} hour so far is ${formatHour12(ev.best_hour)} (median ${ev.best_median} min) — ~${pct}% below the 30-day baseline of ${ev.overall_median} min.`,
      summary_es: `Ahora mismo la hora más ligera del ${dayEs} en ${anomaly.port_name} es ${formatHour12(ev.best_hour)} (mediana ${ev.best_median} min) — ~${pct}% debajo de la base de 30 días de ${ev.overall_median} min.`,
    };
  }
  if (anomaly.type === 'sunday_spike') {
    const pct = Math.round((ev.ratio || 0) * 100);
    return {
      summary_en: `Heads up: ${anomaly.port_name}'s Sunday peak hits ${ev.peak_median} min around ${formatHour12(ev.peak_hour)} — ~${pct}% of the 30-day median. Plan around it.`,
      summary_es: `Atención: el pico dominical de ${anomaly.port_name} alcanza ${ev.peak_median} min cerca de las ${formatHour12(ev.peak_hour)} — ~${pct}% de la mediana de 30 días. Planea alrededor.`,
    };
  }
  return { summary_en: anomaly.finding || '', summary_es: anomaly.finding || '' };
}

// Roll prior runs' `active` items into `trailing_24h`, capped at 24h ago.
// Dedup by (port_slug, type) keeping the newest detected_at. Lets the UI
// answer "what fired today" without re-running detection.
function mergeTrailing(existing, newActive, generatedAt) {
  const cutoff = new Date(generatedAt).getTime() - 24 * 60 * 60 * 1000;
  const newKeys = new Set(newActive.map((a) => `${a.port_slug}::${a.type}`));
  const prior = [...(existing?.active || []), ...(existing?.trailing_24h || [])];
  const dedup = new Map();
  for (const a of prior) {
    const k = `${a.port_slug}::${a.type}`;
    if (newKeys.has(k)) continue; // newer run supersedes
    const t = new Date(a.detected_at || a.generated_at || 0).getTime();
    if (t < cutoff) continue;
    const cur = dedup.get(k);
    const curT = cur ? new Date(cur.detected_at || 0).getTime() : 0;
    if (!cur || t > curT) dedup.set(k, a);
  }
  return [...dedup.values()].sort((a, b) =>
    (b.detected_at || '').localeCompare(a.detected_at || ''),
  );
}

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

  // Public anomalies.json: feed read by /crossing/<slug> for inline callouts.
  // Includes ALL detected anomalies (not just the capped top-N intended for
  // the blog drafter), so every top-port anomaly surfaces in the UI even if
  // it falls below the daily blog cap.
  const publicDir = path.resolve(root, 'public/data');
  const publicPath = path.resolve(publicDir, 'anomalies.json');
  fs.mkdirSync(publicDir, { recursive: true });
  const generatedAt = new Date().toISOString();

  // Read the previous file first so we can preserve detected_at on entries
  // whose evidence is byte-identical — otherwise an hourly cron would churn
  // 24 no-op commits/day with only the timestamp moving.
  let existing = null;
  if (fs.existsSync(publicPath)) {
    try { existing = JSON.parse(fs.readFileSync(publicPath, 'utf8')); } catch {}
  }
  const priorByKey = new Map();
  for (const a of (existing?.active || [])) {
    if (!a || !a.port_slug || !a.type) continue;
    priorByKey.set(`${a.port_slug}::${a.type}::${JSON.stringify(a.evidence || {})}`, a);
  }

  const activeForUi = anomalies.map((a) => {
    const summaries = buildSummaries(a);
    const key = `${a.port_slug}::${a.type}::${JSON.stringify(a.evidence || {})}`;
    const prior = priorByKey.get(key);
    return {
      type: a.type,
      port_slug: a.port_slug,
      port_name: a.port_name,
      state: a.state,
      severity: a.severity,
      detected_at: prior?.detected_at || generatedAt,
      summary_en: summaries.summary_en,
      summary_es: summaries.summary_es,
      evidence: a.evidence,
    };
  });
  const trailing = mergeTrailing(existing, activeForUi, generatedAt);

  // If active + trailing are byte-identical to the previous file, preserve
  // the top-level generated_at too so the committed file doesn't churn.
  const newContentKey = JSON.stringify({ active: activeForUi, trailing_24h: trailing });
  const oldContentKey = existing
    ? JSON.stringify({ active: existing.active || [], trailing_24h: existing.trailing_24h || [] })
    : null;
  const finalGeneratedAt = (newContentKey === oldContentKey && existing?.generated_at)
    ? existing.generated_at
    : generatedAt;

  const publicOut = {
    generated_at: finalGeneratedAt,
    snapshot_at: snapshotTimestamp,
    active: activeForUi,
    trailing_24h: trailing,
  };
  fs.writeFileSync(publicPath, JSON.stringify(publicOut, null, 2));

  console.log(
    `[anomaly] detected ${anomalies.length}, capped to ${capped.length} (maxDraftsPerRun=${CFG.maxDraftsPerRun}). public/data/anomalies.json: ${activeForUi.length} active, ${trailing.length} trailing-24h.`,
  );
  if (anomalies.length === 0) {
    console.log('[anomaly] no anomalies tripped thresholds today. This is normal.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
