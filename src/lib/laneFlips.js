// Lane Flip Watch compares a reported "fast" lane with its general lane.
// snapshot-history.json stores only standard current_wait_time, so these
// counts are built from the same public/data/crossings.json history the
// collector already walks. Missing reports are not zeroes and never fall
// back to the general or summary wait.

import { canonicalPortNumber, isAliasPort } from './portIdentity.js';

export const FAST_LANE_PAIRS = [
  { key: 'passenger_ready', general: 'passenger_standard' },
  { key: 'passenger_sentri', general: 'passenger_standard' },
  { key: 'pedestrian_ready', general: 'pedestrian_standard' },
];

// Below this, "usually" would describe a handful of reports.
export const MIN_USUAL_PAIRS = 8;

const COMPARABLE = new Set(['delay', 'no delay']);

export function emptyLaneStats() {
  return { paired: 0, slower: 0, faster: 0, same: 0, by_hour: {} };
}

export function reportedLaneMinutes(crossing, key) {
  if (String(crossing?.port_status || '').trim().toLowerCase() === 'closed') return null;
  const lane = crossing?.lanes?.[key];
  if (!lane || typeof lane !== 'object') return null;
  const status = String(lane.status || '').trim().toLowerCase();
  if (!COMPARABLE.has(status)) return null;
  if (Number(lane.lanes_open) === 0) return null;
  if (typeof lane.delay_minutes !== 'number' || !Number.isFinite(lane.delay_minutes)) return null;
  if (lane.delay_minutes < 0) return null;
  return lane.delay_minutes;
}

export function pairOutcome(generalMinutes, fastMinutes) {
  if (!Number.isFinite(generalMinutes) || !Number.isFinite(fastMinutes)) return null;
  if (fastMinutes > generalMinutes) return 'slower';
  if (fastMinutes < generalMinutes) return 'faster';
  return 'same';
}

export function recordOutcome(stats, hour, outcome) {
  if (!stats || (outcome !== 'slower' && outcome !== 'faster' && outcome !== 'same')) return;
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return;
  stats.paired += 1;
  stats[outcome] += 1;
  const bucket = String(hour);
  if (!stats.by_hour[bucket]) stats.by_hour[bucket] = { paired: 0, slower: 0, faster: 0, same: 0 };
  stats.by_hour[bucket].paired += 1;
  stats.by_hour[bucket][outcome] += 1;
}

export function hourStats(stats, hour) {
  const cell = stats?.by_hour?.[String(hour)];
  if (!cell || !Number.isFinite(cell.paired)) return { paired: 0, slower: 0, faster: 0, same: 0 };
  return {
    paired: cell.paired || 0,
    slower: cell.slower || 0,
    faster: cell.faster || 0,
    same: cell.same || 0,
  };
}

export function heatLevel(stats) {
  if (!stats?.paired) return 'none';
  const share = stats.slower / stats.paired;
  if (share <= 0) return 'none-slower';
  if (share < 0.25) return 'low';
  if (share < 0.5) return 'mixed';
  return 'often';
}

function usualShare(stats, direction) {
  if (!stats || stats.paired < MIN_USUAL_PAIRS) return false;
  const favored = direction === 'faster' ? stats.faster : stats.slower;
  const other = direction === 'faster' ? stats.slower : stats.faster;
  return favored > other && favored / stats.paired >= 0.6 && other / stats.paired < 0.4;
}

export function usuallyFaster(stats) {
  return usualShare(stats, 'faster');
}

export function usuallySlower(stats) {
  return usualShare(stats, 'slower');
}

export function laneReport(crossing, key) {
  const lane = crossing?.lanes?.[key];
  const present = Boolean(lane && typeof lane === 'object');
  const lanesOpen = present && Number.isFinite(Number(lane.lanes_open)) ? Number(lane.lanes_open) : null;
  return {
    key,
    present,
    minutes: reportedLaneMinutes(crossing, key),
    reportTime: present && typeof lane.update_time === 'string' && lane.update_time.trim()
      ? lane.update_time.trim()
      : null,
    status: present ? String(lane.status || '') : '',
    lanesOpen,
  };
}

export function describePair(crossing, pair) {
  const fast = laneReport(crossing, pair.key);
  const generalReport = laneReport(crossing, pair.general);
  const closed = String(crossing?.port_status || '').trim().toLowerCase() === 'closed';
  let state = 'absent';
  if (!fast.present && !generalReport.present) state = 'absent';
  else if (closed) state = 'closed';
  else if (fast.present && fast.lanesOpen === 0) state = 'no-open';
  else if (fast.minutes == null && generalReport.minutes == null) state = 'both-missing';
  else if (fast.minutes == null) state = 'fast-missing';
  else if (generalReport.minutes == null) state = 'general-missing';
  else state = pairOutcome(generalReport.minutes, fast.minutes);
  const comparable = state === 'slower' || state === 'faster' || state === 'same';
  return {
    key: pair.key,
    general: pair.general,
    fast,
    generalReport,
    state,
    gap: comparable ? fast.minutes - generalReport.minutes : null,
  };
}

export function currentComparisons(crossing) {
  return FAST_LANE_PAIRS
    .map(pair => describePair(crossing, pair))
    .filter(row => row.fast.present || row.generalReport.present);
}

export function currentFlips(crossings) {
  const rows = [];
  for (const crossing of crossings || []) {
    for (const row of currentComparisons(crossing)) {
      if (row.state === 'slower') rows.push({ crossing, ...row });
    }
  }
  rows.sort((a, b) => (b.gap - a.gap) || String(a.crossing?.name || '').localeCompare(String(b.crossing?.name || '')));
  return rows;
}

function laneScore(crossing) {
  const lanes = crossing?.lanes || {};
  const keys = new Set(FAST_LANE_PAIRS.flatMap(pair => [pair.key, pair.general]));
  let score = 0;
  for (const key of keys) {
    if (lanes[key] && typeof lanes[key] === 'object') score += 1;
    if (Number.isFinite(reportedLaneMinutes(crossing, key))) score += 2;
  }
  return score;
}

export function accumulateSnapshot(ports, crossings, fetchedAt, portMeta, localHour) {
  const stamp = new Date(fetchedAt);
  if (Number.isNaN(stamp.getTime()) || typeof localHour !== 'function') return;
  const best = new Map();
  for (const crossing of crossings || []) {
    const port = canonicalPortNumber(crossing?.port_number);
    if (!port || !portMeta.has(port)) continue;
    const candidate = {
      crossing,
      score: laneScore(crossing),
      alias: isAliasPort(crossing?.port_number),
    };
    const previous = best.get(port);
    const take = !previous
      || candidate.score > previous.score
      || (candidate.score === previous.score && previous.alias && !candidate.alias);
    if (take) best.set(port, candidate);
  }
  for (const [port, { crossing }] of best) {
    const meta = portMeta.get(port);
    const hour = localHour(meta.timezone, stamp);
    if (!Number.isInteger(hour)) continue;
    for (const pair of FAST_LANE_PAIRS) {
      const outcome = pairOutcome(
        reportedLaneMinutes(crossing, pair.general),
        reportedLaneMinutes(crossing, pair.key),
      );
      if (!outcome) continue;
      let entry = ports.get(port);
      if (!entry) {
        entry = {
          port_number: port,
          slug: meta.slug,
          name: meta.name,
          timezone: meta.timezone,
          lanes: {},
        };
        ports.set(port, entry);
      }
      if (!entry.lanes[pair.key]) entry.lanes[pair.key] = emptyLaneStats();
      recordOutcome(entry.lanes[pair.key], hour, outcome);
    }
  }
}

export function laneFlipEntries(artifact) {
  const rows = Array.isArray(artifact?.crossings) ? artifact.crossings : [];
  return rows
    .filter(row => row?.slug && row?.port_number && row?.name)
    .map(row => ({
      port_number: String(row.port_number),
      slug: String(row.slug),
      name: String(row.name),
      timezone: row.timezone || null,
      lanes: row.lanes && typeof row.lanes === 'object' ? row.lanes : {},
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug));
}

export function historyFor(artifact, slug) {
  if (!slug || !artifact) return null;
  return laneFlipEntries(artifact).find(row => row.slug === slug) || null;
}

export function laneStats(entry, key) {
  const stats = entry?.lanes?.[key];
  if (!stats || !Number.isFinite(stats.paired)) return emptyLaneStats();
  return stats;
}
