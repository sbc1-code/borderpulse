#!/usr/bin/env node
/**
 * Fetches USD/MXN exchange rate. Reads existing snapshot to preserve
 * previous_rate and compute change_percentage.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const PRIMARY = 'https://api.exchangerate.host/latest?base=USD&symbols=MXN';
const FALLBACK = 'https://open.er-api.com/v6/latest/USD';
const OUT_PATH = path.join(process.cwd(), 'public', 'data', 'exchange-rate.json');

async function tryFetch(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'borderpulse.com/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  let rate = null;
  let source = null;

  try {
    const j = await tryFetch(PRIMARY);
    if (j?.rates?.MXN) { rate = j.rates.MXN; source = 'exchangerate.host'; }
  } catch (e) {
    console.warn(`primary FX source failed: ${e.message}`);
  }
  if (!rate) {
    const j = await tryFetch(FALLBACK);
    if (j?.rates?.MXN) { rate = j.rates.MXN; source = 'open.er-api.com'; }
  }
  if (!rate) throw new Error('All FX sources failed');

  let previous_rate = null;
  try {
    const existing = JSON.parse(await fs.readFile(OUT_PATH, 'utf8'));
    previous_rate = Number(existing?.rate) || null;
  } catch {}

  const change_percentage = previous_rate
    ? Number((((rate - previous_rate) / previous_rate) * 100).toFixed(4))
    : 0;

  const payload = {
    base_currency: 'USD',
    target_currency: 'MXN',
    rate: Number(rate.toFixed(4)),
    previous_rate,
    change_percentage,
    source,
    last_updated: new Date().toISOString(),
    fetched_at: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`Wrote USD/MXN=${payload.rate} (Δ${change_percentage}%, via ${source}) → ${OUT_PATH}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
