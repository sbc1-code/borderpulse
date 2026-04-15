/**
 * waitTimeHistory - localStorage-backed per-crossing history.
 * Keeps last 7 days of { t, wait } samples per port_number.
 * Used for sparklines, trend arrows, and the Analytics view.
 */
const STORAGE_KEY = 'borderPulse_waitHistory_v1';
const MAX_DAYS = 7;
const MAX_SAMPLES_PER_CROSSING = 7 * 24 * 4; // 15-min grain × 7d

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(obj) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.warn('[waitTimeHistory] write failed', e);
  }
}

export function recordSnapshot(crossings) {
  if (!Array.isArray(crossings) || crossings.length === 0) return;
  const now = Date.now();
  const cutoff = now - MAX_DAYS * 24 * 60 * 60 * 1000;
  const all = readAll();

  for (const c of crossings) {
    const id = c.port_number || c.id;
    if (!id) continue;
    const wait = c.current_wait_time;
    if (wait == null) continue;

    const series = all[id] || [];
    const last = series[series.length - 1];
    // Dedupe: skip if identical to last entry written in the last minute
    if (last && now - last.t < 60 * 1000 && last.wait === wait) continue;

    series.push({ t: now, wait });
    const trimmed = series.filter((s) => s.t >= cutoff).slice(-MAX_SAMPLES_PER_CROSSING);
    all[id] = trimmed;
  }
  writeAll(all);
}

export function getHistory(crossingId) {
  if (!crossingId) return [];
  const all = readAll();
  return all[crossingId] || [];
}

export function getPreviousWait(crossingId) {
  const h = getHistory(crossingId);
  if (h.length < 2) return null;
  return h[h.length - 2].wait;
}

export function getAllHistory() {
  return readAll();
}

export function clearHistory() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
