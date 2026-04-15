#!/usr/bin/env node
/**
 * Pulls crowdsourced US→MX (southbound) wait reports from a public Google
 * Sheet (CSV export), aggregates the last 2 hours, writes
 * public/data/crossings-sb.json.
 *
 * SETUP (one-time on Sebastian's side):
 *   1. Create a Google Form with fields:
 *        - port_number (dropdown with CBP port numbers) OR crossing_name (text)
 *        - wait_minutes (number 0..240)
 *        - notes (optional text)
 *      Form responses auto-populate a linked Google Sheet.
 *   2. In the Sheet: File → Share → Anyone with the link can view.
 *   3. File → Share → Publish to web → CSV → copy the URL.
 *      Should look like: https://docs.google.com/spreadsheets/d/e/.../pub?output=csv
 *   4. Add that URL as a GitHub repo secret named `SB_SHEET_CSV_URL`.
 *   5. This script reads it from process.env.SB_SHEET_CSV_URL.
 *
 * If the env var is unset, the script writes an empty-but-valid JSON so the
 * client can still read the file without 404s.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT_PATH = path.join(process.cwd(), 'public', 'data', 'crossings-sb.json');
const WINDOW_MS = 2 * 60 * 60 * 1000; // last 2 hours

const parseCSV = (text) => {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map((line) => {
    // Simple CSV parse — assumes no embedded commas in quoted fields for MVP.
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const row = {};
    header.forEach((h, i) => { row[h] = cols[i]; });
    return row;
  });
};

const median = (nums) => {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

async function main() {
  const sheetUrl = process.env.SB_SHEET_CSV_URL;
  const empty = {
    source: 'Community reports (Google Form)',
    fetched_at: new Date().toISOString(),
    window_hours: 2,
    count: 0,
    by_port: {},
    note: sheetUrl ? undefined : 'SB_SHEET_CSV_URL env var not set — no reports ingested yet',
  };

  if (!sheetUrl) {
    await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
    await fs.writeFile(OUT_PATH, JSON.stringify(empty, null, 2));
    console.log('No SB_SHEET_CSV_URL set — wrote empty SB snapshot.');
    return;
  }

  console.log(`Fetching ${sheetUrl}...`);
  const res = await fetch(sheetUrl);
  if (!res.ok) throw new Error(`Sheet fetch failed: HTTP ${res.status}`);
  const rows = parseCSV(await res.text());

  const cutoff = Date.now() - WINDOW_MS;
  const recent = rows
    .map((r) => ({
      port_number: (r.port_number || '').trim(),
      crossing_name: (r.crossing_name || '').trim(),
      wait: parseInt(r.wait_minutes, 10),
      ts: new Date(r.Timestamp || r.timestamp || Date.now()).getTime(),
    }))
    .filter((r) => Number.isFinite(r.wait) && r.wait >= 0 && r.wait <= 240 && r.ts >= cutoff);

  const byPort = {};
  for (const r of recent) {
    const key = r.port_number || r.crossing_name.toLowerCase();
    if (!byPort[key]) byPort[key] = { port_number: r.port_number || null, crossing_name: r.crossing_name || null, waits: [] };
    byPort[key].waits.push(r.wait);
  }
  const agg = {};
  for (const [k, v] of Object.entries(byPort)) {
    agg[k] = {
      port_number: v.port_number,
      crossing_name: v.crossing_name,
      sample_count: v.waits.length,
      median_wait: median(v.waits),
    };
  }

  const payload = {
    source: 'Community reports (Google Form)',
    fetched_at: new Date().toISOString(),
    window_hours: 2,
    count: recent.length,
    by_port: agg,
  };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${recent.length} SB reports across ${Object.keys(agg).length} ports → ${OUT_PATH}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
