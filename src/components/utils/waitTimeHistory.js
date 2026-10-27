/**
 * waitTimeHistory - localStorage-backed per-crossing history.
 * Keeps last 7 days of { t, wait } samples per port_number, where t is the
 * snapshot retrieval time, not the time the browser displayed the reading.
 * Used for sparklines, trend arrows, and the Analytics view.
 */
import { getStorageKey, getWaitMinutes } from './crossingDirection.js';
import { readStorage, writeStorage } from '../../lib/browserStorage.js';

// v1 stamped the browser clock and cannot establish source retrieval times.
// Leave that raw value intact, but do not reuse it as verified history.
const STORAGE_KEY = 'borderPulse_waitHistory_v2';
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SAMPLES_PER_CROSSING = 7 * 24 * 4;

export function readAllHistory() {
  try {
    const parsed = JSON.parse(readStorage(STORAGE_KEY, '{}'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const now = Date.now();
    const cutoff = now - RETENTION_MS;
    const entries = [];
    for (const [key, value] of Object.entries(parsed)) {
      if (!Array.isArray(value)) continue;
      const series = [];
      let previous = cutoff - 1;
      for (const sample of value) {
        // v2 writes increasing retrieval times. Discard corrupted ordering;
        // sorting it would manufacture a sequence the recorder did not save.
        if (Number.isInteger(sample?.t) && sample.t > previous && sample.t <= now
          && Number.isFinite(sample.wait) && sample.wait >= 0) {
          series.push(sample);
          previous = sample.t;
        }
      }
      if (series.length) entries.push([key, series.slice(-MAX_SAMPLES_PER_CROSSING)]);
    }
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

export function recordSnapshot(crossings, direction = 'northbound', fetchedAt = null) {
  if (!Array.isArray(crossings) || crossings.length === 0) return;
  const now = Date.now();
  const cutoff = now - RETENTION_MS;
  const sourceTime = typeof fetchedAt === 'string' ? Date.parse(fetchedAt) : NaN;
  if (!(sourceTime >= cutoff && sourceTime <= now)) return;
  const all = readAllHistory();

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
  const all = readAllHistory();
  return all[crossingId] || [];
}

export function getHistoryForDirection(crossingId, direction = 'northbound') {
  const key = getStorageKey(crossingId, direction);
  if (!key) return [];
  const all = readAllHistory();
  return all[key] || [];
}

export function getPreviousWait(crossingId, direction = 'northbound') {
  const h = getHistoryForDirection(crossingId, direction);
  if (h.length < 2) return null;
  return h[h.length - 2].wait;
}

export function clearHistory() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
