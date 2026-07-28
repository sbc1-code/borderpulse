import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const DATA_FILE = 'public/data/crossings.json';
const LOOKBACK_DAYS = 30;

function sh(cmd) {
  return execSync(cmd, { cwd: root, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }).trim();
}

function median(arr) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

async function main() {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const slugMod = await import(path.resolve(root, 'src/lib/slugs.js'));
  const metaMod = await import(path.resolve(root, 'src/components/utils/crossingMeta.js'));
  // Single source of truth for the confidence floor, shared with the UI.
  const { MIN_CELL_SAMPLES } = await import(path.resolve(root, 'src/lib/aggregates.js'));
  const currentDoc = JSON.parse(fs.readFileSync(path.resolve(root, DATA_FILE), 'utf8'));
  const { portToSlug } = slugMod.buildSlugMap(currentDoc.crossings || []);
  const portToMeta = new Map();
  for (const c of currentDoc.crossings || []) {
    portToMeta.set(String(c.port_number), {
      name: c.name,
      state: c.state,
      timezone: metaMod.getPortTimezone(c),
    });
  }

  // Memoized port-local (day, hour) per (timestamp, timezone). Only four
  // distinct timezones exist along the border, so the cache stays small.
  const tzCache = new Map();
  function localDayHour(ts, tz) {
    const key = `${ts.getTime()}|${tz}`;
    if (!tzCache.has(key)) tzCache.set(key, metaMod.nowInTz(tz, ts));
    return tzCache.get(key);
  }

  let log;
  try {
    log = sh(`git log --since="${since}" --pretty=format:%H --date=iso -- ${DATA_FILE}`);
  } catch (e) {
    console.warn('[aggregates] git log failed, skipping', e.message);
    return;
  }
  const shas = log.split('\n').map((x) => x.trim()).filter(Boolean);
  console.log(`[aggregates] ${shas.length} snapshots over last ${LOOKBACK_DAYS} days`);

  // portNumber -> day (0-6) -> hour (0-23) -> [waits]
  const buckets = new Map();

  function addSample(port, dayIdx, hour, wait) {
    if (wait == null || wait < 0 || wait > 360) return;
    if (!buckets.has(port)) buckets.set(port, new Map());
    const byDay = buckets.get(port);
    if (!byDay.has(dayIdx)) byDay.set(dayIdx, new Map());
    const byHour = byDay.get(dayIdx);
    if (!byHour.has(hour)) byHour.set(hour, []);
    byHour.get(hour).push(wait);
  }

  for (const sha of shas) {
    let raw;
    try {
      raw = sh(`git show ${sha}:${DATA_FILE}`);
    } catch {
      continue;
    }
    let doc;
    try { doc = JSON.parse(raw); } catch { continue; }

    const ts = doc.fetched_at ? new Date(doc.fetched_at) : null;
    if (!ts || Number.isNaN(ts.getTime())) continue;
    // Bucket by PORT-LOCAL day/hour. The original UTC bucketing shifted
    // every published "best hour" by 5-7 hours once the UI labeled buckets
    // as local clock time: a "Monday 3 AM spike" at a California port was
    // actually the Sunday 8 PM return peak.
    for (const c of doc.crossings || []) {
      const w = typeof c.current_wait_time === 'number' ? c.current_wait_time : null;
      const meta = portToMeta.get(String(c.port_number));
      const tz = meta?.timezone || metaMod.getPortTimezone(c);
      const { day: dayIdx, hour } = localDayHour(ts, tz);
      addSample(String(c.port_number), dayIdx, hour, w);
    }
  }

  // Rebuild the directory from scratch each run. These files ship from
  // public/, and build-rankings.mjs reads whatever is in here — so a stale
  // slug left behind by a CBP rename keeps being published and can outrank
  // its live siblings. That is exactly how presidio.json (generated
  // 2026-04-27, orphaned when the port became presidio-presidio-port-of-entry)
  // ended up as the only entry in rankings.json, pointing at a 404.
  const outDir = path.resolve(root, 'public/data/aggregates');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const generatedAt = new Date().toISOString();
  const aggregateByPort = new Map();
  for (const [port, byDay] of buckets.entries()) {
    const slug = portToSlug[port];
    if (!slug) continue;
    const meta = portToMeta.get(port) || {};

    const byHour = [];
    let bestMedian = Infinity;
    let bestHour = null;
    const allWaits = [];

    // Raw observations first, so the document-level counts stay honest. These
    // must NOT come from the pooled cells below, which reuse each observation
    // in up to five neighbouring hours and would inflate sample_count ~5x.
    for (const [, byHourMap] of byDay.entries()) {
      for (const [, arr] of byHourMap.entries()) allWaits.push(...arr);
    }

    // Adaptive centred window over neighbouring hours WITHIN the same day.
    //
    // A 7x24 grid is finer than the throttled cron can fill: raw density is
    // median 2 observations per cell, so only 7% of cells could support a
    // floor of 5 and most published "best hour" claims were noise.
    //
    // Pooling weekday/weekend was the obvious fix and is wrong. Measured
    // 2026-07-27, the within-Mon-Fri spread of day medians is 25 min (median
    // across ports), 2.5x the Sat-Sun spread of 10 min: San Ysidro runs
    // Mon 160 / Tue 160 but Fri 70. Collapsing that to a single "weekday"
    // number misses the true day median by 25 min at the 90th percentile and
    // deletes the most useful advice on the page. Day-of-week IS the signal.
    //
    // Neighbouring hours, by contrast, are highly autocorrelated, so widening
    // along the hour axis buys density cheaply. The window is adaptive rather
    // than fixed: cells with enough raw data keep their exact hourly value and
    // only sparse cells widen. Measured against fixed alternatives, this keeps
    // fixed-1h's low distortion (12 min at p90) AND fixed-2h's coverage (88%
    // of cells clearing a floor of 5, up from 7%), while localising the daily
    // peak within an hour more often than either (76% of port-days).
    const TARGET_SAMPLES = 6;
    const MAX_HALF_WIDTH = 2;

    for (let dayIdx = 0; dayIdx < 7; dayIdx += 1) {
      const byHourMap = byDay.get(dayIdx);
      if (!byHourMap) continue;
      for (let hour = 0; hour < 24; hour += 1) {
        let pooled = [];
        let halfWidth = 0;
        for (; halfWidth <= MAX_HALF_WIDTH; halfWidth += 1) {
          pooled = [];
          for (let off = -halfWidth; off <= halfWidth; off += 1) {
            // Wrap across midnight so 11 PM and 12 AM are neighbours.
            const h = (hour + off + 24) % 24;
            const arr = byHourMap.get(h);
            if (arr) pooled.push(...arr);
          }
          if (pooled.length >= TARGET_SAMPLES) break;
        }
        if (!pooled.length) continue;
        const m = median(pooled);
        if (m == null) continue;
        byHour.push({
          day: dayIdx,
          hour,
          median: m,
          samples: pooled.length,
          // Hours on each side that were pooled to reach this estimate. 0 means
          // the value is that hour alone. Consumers use it to label honestly.
          window_hours: Math.min(halfWidth, MAX_HALF_WIDTH),
          raw_samples: (byHourMap.get(hour) || []).length,
        });
      }
    }

    // Overall best hour across all days (for meta descriptions/FAQ). Pool the
    // raw observations for the hour across every day rather than taking a
    // median of the seven day-medians: that older form compared hours built
    // from different numbers of days, so an hour missing one heavy day scored
    // artificially well. At San Ysidro it put 1 AM (six days, no Tuesday)
    // ahead of the genuinely lighter 3 AM. This value lands in <title>, meta
    // descriptions and FAQ JSON-LD, so it gets the sturdier estimator.
    const hourAgg = new Map();
    for (const [, byHourMap] of byDay.entries()) {
      for (const [hour, arr] of byHourMap.entries()) {
        if (!hourAgg.has(hour)) hourAgg.set(hour, []);
        hourAgg.get(hour).push(...arr);
      }
    }
    for (const [hour, arr] of hourAgg.entries()) {
      if (arr.length < MIN_CELL_SAMPLES) hourAgg.delete(hour);
    }
    for (const [hour, arr] of hourAgg.entries()) {
      const m = median(arr);
      if (m != null && m < bestMedian) {
        bestMedian = m;
        bestHour = hour;
      }
    }

    const out = {
      port_number: port,
      name: meta.name || null,
      state: meta.state || null,
      timezone: meta.timezone || null,
      lookback_days: LOOKBACK_DAYS,
      sample_count: allWaits.length,
      overall_median: median(allWaits),
      overall_best_hour: bestHour,
      overall_best_median: Number.isFinite(bestMedian) ? bestMedian : null,
      by_hour: byHour.sort((a, b) => a.day - b.day || a.hour - b.hour),
      generated_at: generatedAt,
    };
    aggregateByPort.set(port, out);
  }

  let written = 0;
  for (const c of currentDoc.crossings || []) {
    const port = String(c.port_number);
    const slug = portToSlug[port];
    if (!slug) continue;
    const out = aggregateByPort.get(port) || {
      port_number: port,
      name: c.name || null,
      state: c.state || null,
      timezone: metaMod.getPortTimezone(c),
      lookback_days: LOOKBACK_DAYS,
      sample_count: 0,
      overall_median: null,
      overall_best_hour: null,
      overall_best_median: null,
      by_hour: [],
      generated_at: generatedAt,
    };
    fs.writeFileSync(path.resolve(outDir, `${slug}.json`), JSON.stringify(out));
    written++;
  }

  console.log(`[aggregates] wrote ${written} aggregate files`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
