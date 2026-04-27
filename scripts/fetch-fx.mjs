#!/usr/bin/env node
/**
 * Fetches USD/MXN exchange rate. Maintains a rolling 48h inline history so
 * `previous_rate` reflects the rate ~24h ago rather than the last fetch.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const PRIMARY = 'https://api.frankfurter.app/latest?from=USD&to=MXN';
const FALLBACK = 'https://open.er-api.com/v6/latest/USD';
const OUT_PATH = path.join(process.cwd(), 'public', 'data', 'exchange-rate.json');

const HISTORY_WINDOW_MS = 48 * 60 * 60 * 1000;
const HISTORY_MAX_ENTRIES = 200;
const TARGET_LOOKBACK_MS = 24 * 60 * 60 * 1000;

async function tryFetch(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'borderpulse.com/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function pickPrevious(history, nowMs) {
  if (!Array.isArray(history) || history.length === 0) return null;
  const target = nowMs - TARGET_LOOKBACK_MS;
  let best = null;
  let bestDelta = Infinity;
  for (const entry of history) {
    const ts = Date.parse(entry?.ts);
    if (!Number.isFinite(ts)) continue;
    const age = nowMs - ts;
    if (age < TARGET_LOOKBACK_MS / 2) continue;
    const delta = Math.abs(ts - target);
    if (delta < bestDelta) {
      best = entry;
      bestDelta = delta;
    }
  }
  return best;
}

async function main() {
  let rate = null;
  let source = null;

  try {
    const j = await tryFetch(PRIMARY);
    if (j?.rates?.MXN) { rate = j.rates.MXN; source = 'frankfurter.app'; }
  } catch (e) {
    console.warn(`primary FX source failed: ${e.message}`);
  }
  if (!rate) {
    try {
      const j = await tryFetch(FALLBACK);
      if (j?.rates?.MXN) { rate = j.rates.MXN; source = 'open.er-api.com'; }
    } catch (e) {
      console.warn(`fallback FX source failed: ${e.message}`);
    }
  }
  if (!rate) throw new Error('All FX sources failed');

  let existing = null;
  try {
    existing = JSON.parse(await fs.readFile(OUT_PATH, 'utf8'));
  } catch {}

  const now = new Date();
  const nowMs = now.getTime();
  const roundedRate = Number(rate.toFixed(4));

  // Build pruned history then append current sample.
  const priorHistory = Array.isArray(existing?.history) ? existing.history : [];
  const prunedHistory = priorHistory
    .filter((e) => {
      const ts = Date.parse(e?.ts);
      return Number.isFinite(ts) && nowMs - ts <= HISTORY_WINDOW_MS;
    })
    .slice(-HISTORY_MAX_ENTRIES + 1);
  const history = [...prunedHistory, { ts: now.toISOString(), rate: roundedRate, source }];

  const prev = pickPrevious(prunedHistory, nowMs);
  const previous_rate = prev ? Number(prev.rate) : null;
  const previous_rate_at = prev ? prev.ts : null;
  const previous_rate_age_hours = prev
    ? Number(((nowMs - Date.parse(prev.ts)) / 3_600_000).toFixed(2))
    : null;
  const change_percentage = previous_rate
    ? Number((((roundedRate - previous_rate) / previous_rate) * 100).toFixed(4))
    : null;

  const payload = {
    base_currency: 'USD',
    target_currency: 'MXN',
    rate: roundedRate,
    previous_rate,
    previous_rate_at,
    previous_rate_age_hours,
    change_percentage,
    source,
    last_updated: now.toISOString(),
    fetched_at: now.toISOString(),
    history,
  };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`Wrote USD/MXN=${payload.rate} (Δ${change_percentage ?? 'n/a'}% vs ${previous_rate_age_hours ?? '?'}h ago, via ${source}) → ${OUT_PATH}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
