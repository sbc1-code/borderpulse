/**
 * waitTimeHistory - localStorage-backed per-crossing history.
 * Keeps last 7 days of { t, wait } samples per port_number, where t is the
 * snapshot retrieval time, not the time the browser displayed the reading.
 * Used for sparklines, trend arrows, and the Analytics view.
 */
import { getStorageKey, getWaitMinutes } from './crossingDirection.js';
import { writeStorage } from '../../lib/browserStorage.js';

// v1 stamped the browser clock and cannot establish source retrieval times.
// Leave that raw value intact, but do not reuse it as verified history.
const STORAGE_KEY = 'borderPulse_waitHistory_v2';
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SAMPLES_PER_CROSSING = 7 * 24 * 4;

function validSeries(value, now) {
  if (!Array.isArray(value)) return [];
  const cutoff = now - RETENTION_MS;
  const samples = value.filter(sample => Number.isFinite(sample?.t)
    && sample.t >= cutoff && sample.t <= now
    && Number.isFinite(sample.wait) && sample.wait >= 0)
    .sort((a, b) => a.t - b.t);
  return samples.filter((sample, index) => index === 0 || sample.t !== samples[index - 1].t)
    .slice(-MAX_SAMPLES_PER_CROSSING);
}

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const now = Date.now();
    return Object.fromEntries(Object.entries(parsed)
      .map(([key, value]) => [key, validSeries(value, now)])
      .filter(([, series]) => series.length));
  } catch {
    return {};
  }
}

export function recordSnapshot(crossings, direction = 'northbound', fetchedAt = null) {
  if (!Array.isArray(crossings) || crossings.length === 0) return;
  const now = Date.now();
  const cutoff = now - RETENTION_MS;
  const sourceTime = typeof fetchedAt === 'string' ? Date.parse(fetchedAt) : NaN;
  if (!Number.isFinite(sourceTime) || sourceTime > now || sourceTime < cutoff) return;
  const all = readAll();

  for (const c of crossings) {
    const id = getStorageKey(c.port_number || c.id, direction);
    if (!id) continue;
    const wait = getWaitMinutes(c, direction);
    if (!Number.isFinite(wait) || wait < 0) continue;

    const series = all[id] || [];
    const last = series[series.length - 1];
    // Reopening, refreshes and optional-feed enrichment can replay one source
    // snapshot. Neither those repeats nor an older fallback is a new sample.
    if (last && sourceTime <= last.t) continue;

    series.push({ t: sourceTime, wait });
    all[id] = series.slice(-MAX_SAMPLES_PER_CROSSING);
  }
  writeStorage(STORAGE_KEY, JSON.stringify(all));
}

export function getHistory(crossingId) {
  if (!crossingId) return [];
  const all = readAll();
  return all[crossingId] || [];
}

export function getHistoryForDirection(crossingId, direction = 'northbound') {
  const key = getStorageKey(crossingId, direction);
  if (!key) return [];
  const all = readAll();
  return all[key] || [];
}

export function getPreviousWait(crossingId, direction = 'northbound') {
  const h = getHistoryForDirection(crossingId, direction);
  if (h.length < 2) return null;
  return h[h.length - 2].wait;
}

export function getAllHistory(direction = null) {
  const all = readAll();
  if (!direction) return all;

  const filtered = {};
  const suffix = direction === 'southbound' ? ':sb' : null;

  for (const [key, value] of Object.entries(all)) {
    if (suffix && key.endsWith(suffix)) filtered[key] = value;
    if (!suffix && !key.endsWith(':sb')) filtered[key] = value;
  }

  return filtered;
}

export function clearHistory() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
