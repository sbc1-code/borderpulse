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
  const currentDoc = JSON.parse(fs.readFileSync(path.resolve(root, DATA_FILE), 'utf8'));
  const { portToSlug } = slugMod.buildSlugMap(currentDoc.crossings || []);
  const portToMeta = new Map();
  for (const c of currentDoc.crossings || []) {
    portToMeta.set(String(c.port_number), { name: c.name, state: c.state });
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
    // Use UTC day/hour — callers interpret in local context; good enough for "typical pattern".
    const dayIdx = ts.getUTCDay();
    const hour = ts.getUTCHours();

    for (const c of doc.crossings || []) {
      const w = typeof c.current_wait_time === 'number' ? c.current_wait_time : null;
      addSample(String(c.port_number), dayIdx, hour, w);
    }
  }

  const outDir = path.resolve(root, 'public/data/aggregates');
  fs.mkdirSync(outDir, { recursive: true });

  let written = 0;
  for (const [port, byDay] of buckets.entries()) {
    const slug = portToSlug[port];
    if (!slug) continue;
    const meta = portToMeta.get(port) || {};

    const byHour = [];
    let bestMedian = Infinity;
    let bestHour = null;
    const allWaits = [];

    for (const [dayIdx, byHourMap] of byDay.entries()) {
      for (const [hour, arr] of byHourMap.entries()) {
        const m = median(arr);
        if (m == null) continue;
        byHour.push({ day: dayIdx, hour, median: m, samples: arr.length });
        allWaits.push(...arr);
      }
    }

    // Overall best hour across all days (for meta descriptions/FAQ)
    const hourAgg = new Map();
    for (const row of byHour) {
      if (!hourAgg.has(row.hour)) hourAgg.set(row.hour, []);
      hourAgg.get(row.hour).push(row.median);
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
      lookback_days: LOOKBACK_DAYS,
      sample_count: allWaits.length,
      overall_median: median(allWaits),
      overall_best_hour: bestHour,
      overall_best_median: Number.isFinite(bestMedian) ? bestMedian : null,
      by_hour: byHour.sort((a, b) => a.day - b.day || a.hour - b.hour),
      generated_at: new Date().toISOString(),
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
