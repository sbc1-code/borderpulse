#!/usr/bin/env node
/**
 * Fetches USD/MXN exchange rate from exchangerate.host (free, no key required)
 * and writes public/data/exchange-rate.json.
 *
 * Fallback: Open ER API (open.er-api.com). If both fail, exit non-zero
 * so the GH Action surfaces the failure instead of shipping stale data.
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

  const payload = {
    base_currency: 'USD',
    target_currency: 'MXN',
    rate: Number(rate.toFixed(4)),
    source,
    fetched_at: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`Wrote USD/MXN=${payload.rate} (via ${source}) → ${OUT_PATH}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
