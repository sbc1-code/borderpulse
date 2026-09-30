import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { MIN_CROSSINGS } from './fetch-cbp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DAY = 86_400_000;
const MINUTE = 60_000;

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

export function validatePublishData({ crossings, history, fx }, now = Date.now()) {
  function recent(value, maxAge, label) {
    const time = Date.parse(value);
    requireValue(Number.isFinite(time) && time <= now + 5 * MINUTE && now - time <= maxAge,
      `${label} timestamp is missing, future-dated or stale`);
    return time;
  }
  const current = recent(crossings?.fetched_at, 90 * MINUTE, 'CBP');
  const ports = crossings?.crossings;
  requireValue(Array.isArray(ports) && ports.length >= MIN_CROSSINGS && crossings.count === ports.length,
    `Current snapshot must contain at least ${MIN_CROSSINGS} crossings and a matching count`);
  requireValue(ports.every(row => row?.port_number) && new Set(ports.map(row => String(row.port_number))).size === ports.length,
    'Current snapshot has missing or duplicate port identities');
  recent(fx?.fetched_at, 48 * 60 * MINUTE, 'Exchange rate fetch');
  requireValue(fx.base_currency === 'USD' && fx.target_currency === 'MXN' && Number.isFinite(fx.rate) && fx.rate > 0,
    'Exchange rate must be a valid USD/MXN quote');
  recent(history?.generated_at, 90 * MINUTE, 'History generation');
  requireValue(history.lookback_days === 30 && Array.isArray(history.snapshots) && history.snapshots.length >= 2,
    'Missing rolling 30-day history');
  let previous = -Infinity;
  const times = history.snapshots.map(snapshot => {
    // Collector artifacts can be up to 90 minutes old at publication. The
    // aggregate builder itself filters to the exact 30-day window.
    const time = recent(snapshot.fetched_at, 31 * DAY, 'Historical snapshot');
    requireValue(time > previous, 'History timestamps must be unique and ordered');
    previous = time;
    requireValue(Array.isArray(snapshot.crossings) && snapshot.crossings.length >= MIN_CROSSINGS,
      'Historical snapshot is empty or truncated');
    return time;
  });
  requireValue(times[0] <= now - 27 * DAY, 'History coverage collapsed: oldest observation must reach at least 27 days back');
  requireValue(times.at(-1) === current, 'History does not include the current validated snapshot');
  const newest = new Map(history.snapshots.at(-1).crossings.map(row => [String(row.port_number), row.current_wait_time]));
  requireValue(ports.every(row => newest.has(String(row.port_number))
    && newest.get(String(row.port_number)) === (typeof row.current_wait_time === 'number' ? row.current_wait_time : null)),
  'Newest history observation differs from the current snapshot');
  return {
    cbp_fetched_at: crossings.fetched_at,
    crossing_count: ports.length,
    history_generated_at: history.generated_at,
    history_first_observation: history.snapshots[0].fetched_at,
    history_last_observation: history.snapshots.at(-1).fetched_at,
    history_snapshot_count: times.length,
    exchange_rate_fetched_at: fx.fetched_at,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const read = name => JSON.parse(fs.readFileSync(path.join(root, 'public/data', name), 'utf8'));
    const data = validatePublishData({ crossings: read('crossings.json'), history: read('snapshot-history.json'), fx: read('exchange-rate.json') });
    const publication = {
      commit_sha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
      prepared_at: new Date().toISOString(),
      ...data,
    };
    if (process.argv.includes('--write-manifest')) {
      fs.writeFileSync(path.join(root, 'public/data/publication.json'), JSON.stringify(publication, null, 2) + '\n');
    }
    console.log(JSON.stringify(publication, null, 2));
  } catch (error) {
    console.error(`[publish-data] ${error.message}`);
    process.exitCode = 1;
  }
}
