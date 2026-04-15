#!/usr/bin/env node
/**
 * Fetches US-Mexico border wait times from CBP's official public feed
 * and writes a clean JSON snapshot to public/data/crossings.json.
 *
 * CBP feed: https://bwt.cbp.gov/api/bwtpublicmod
 * Runs every 15 minutes via GitHub Actions.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

// bwt.cbp.gov serves two endpoints with the same JSON shape:
//   /api/waittimes        — legacy, frozen on 3/26/2026 (do NOT use)
//   /api/bwtpublicmod     — current, used by the CBP Angular app
const CBP_URL = 'https://bwt.cbp.gov/api/bwtpublicmod';
const OUT_PATH = path.join(process.cwd(), 'public', 'data', 'crossings.json');

// CBP uses these as `crossing_name` but they're lane-type labels, not crossings.
// Drop them from the display name (they'd produce rows like "Otay Mesa - Passenger").
const LANE_TYPE_LABELS = new Set([
  'passenger', 'passengers', 'pedestrian', 'pedestrians',
  'commercial', 'commercial vehicles', 'cargo', 'auto', 'vehicular',
]);

// port_name → US state (for region filtering). CBP uses inconsistent naming
// across rows, so we match by substring too (see stateForPort below).
const PORT_STATE = {
  // California
  'San Ysidro': 'CA', 'Otay Mesa': 'CA', 'Otay Mesa Port of Entry': 'CA',
  'Tecate': 'CA', 'Calexico': 'CA', 'Andrade': 'CA',
  // Arizona
  'San Luis': 'AZ', 'Lukeville': 'AZ', 'Sasabe': 'AZ',
  'Nogales': 'AZ', 'Naco': 'AZ',
  'Douglas': 'AZ', 'Douglas (Raul Hector Castro)': 'AZ',
  // New Mexico
  'Santa Teresa': 'NM', 'Columbus': 'NM',
  // Texas
  'El Paso': 'TX', 'Fabens': 'TX', 'Fort Hancock': 'TX', 'Tornillo': 'TX',
  'Marcelino Serna': 'TX', 'Paso Del Norte': 'TX',
  'Bridge of the Americas Port of Entry': 'TX', 'BOTA CARGO FACILITY': 'TX',
  'Presidio': 'TX', 'Del Rio': 'TX', 'Eagle Pass': 'TX',
  'Laredo': 'TX', 'Gateway': 'TX',
  'Hidalgo/Pharr': 'TX', 'Hidalgo': 'TX', 'Pharr': 'TX',
  'Progreso': 'TX', 'Rio Grande City': 'TX', 'Roma': 'TX', 'ROMA TEXAS': 'TX',
  'Brownsville': 'TX',
};

const stateForPort = (portName) => {
  if (!portName) return null;
  if (PORT_STATE[portName]) return PORT_STATE[portName];
  // Fuzzy fallback — first known prefix match.
  const lower = portName.toLowerCase();
  for (const [k, v] of Object.entries(PORT_STATE)) {
    if (lower.startsWith(k.toLowerCase())) return v;
  }
  return null;
};

const parseLane = (lane) => {
  if (!lane || lane.operational_status === 'N/A' || lane.operational_status === 'Lanes Closed') return null;
  const delay = parseInt(lane.delay_minutes, 10);
  const open = parseInt(lane.lanes_open, 10);
  return {
    status: lane.operational_status || null,
    delay_minutes: Number.isFinite(delay) ? delay : null,
    lanes_open: Number.isFinite(open) ? open : 0,
    update_time: lane.update_time || null,
  };
};

const statusFromDelay = (minutes) => {
  if (minutes == null) return 'unknown';
  if (minutes < 15) return 'good';
  if (minutes < 45) return 'moderate';
  return 'heavy';
};

const cleanCrossingName = (raw) => {
  const s = (raw || '').trim();
  if (!s) return '';
  if (LANE_TYPE_LABELS.has(s.toLowerCase())) return '';
  return s;
};

const mapPort = (p) => {
  const passenger_standard = parseLane(p.passenger_vehicle_lanes?.standard_lanes);
  const passenger_sentri = parseLane(p.passenger_vehicle_lanes?.NEXUS_SENTRI_lanes);
  const passenger_ready = parseLane(p.passenger_vehicle_lanes?.ready_lanes);
  const pedestrian_standard = parseLane(p.pedestrian_lanes?.standard_lanes);
  const pedestrian_ready = parseLane(p.pedestrian_lanes?.ready_lanes);
  const commercial_standard = parseLane(p.commercial_vehicle_lanes?.standard_lanes);
  const commercial_fast = parseLane(p.commercial_vehicle_lanes?.FAST_lanes);

  const primaryDelay = passenger_standard?.delay_minutes ?? null;

  const portName = (p.port_name || '').trim();
  const crossingName = cleanCrossingName(p.crossing_name);
  const fullName = portName && crossingName && portName.toLowerCase() !== crossingName.toLowerCase()
    ? `${portName} - ${crossingName}`
    : (portName || crossingName);

  const state = stateForPort(portName);

  return {
    id: p.port_number,
    cbp_id: p.port_number,
    port_number: p.port_number,
    name: fullName,
    port_name: portName,
    crossing_name: crossingName,
    state,
    border: p.border,
    hours: p.hours,
    port_status: p.port_status,
    construction_notice: p.construction_notice || null,
    updated_at: `${p.date} ${p.time}`,
    current_wait_time: primaryDelay,
    status: statusFromDelay(primaryDelay),
    lanes: {
      passenger_standard,
      passenger_sentri,
      passenger_ready,
      pedestrian_standard,
      pedestrian_ready,
      commercial_standard,
      commercial_fast,
    },
  };
};

// Canonical-name map — CBP has multiple rows for the same physical crossing
// under slightly different labels (e.g. "Marcelino Serna" = "Tornillo",
// "Paso Del Norte" alone = "El Paso - Paso Del Norte (PDN)").
const CANONICAL = [
  { test: /marcelino\s*serna|tornillo/i, key: 'tornillo' },
  { test: /paso\s*del\s*norte/i, key: 'pdn' },
  { test: /bridge\s*of\s*the\s*americas|\bbota\b/i, key: 'bota' },
  { test: /ysleta|zaragoza/i, key: 'ysleta' },
  { test: /stanton/i, key: 'stanton' },
  { test: /otay\s*mesa/i, key: 'otay-mesa' },
  { test: /san\s*ysidro/i, key: 'san-ysidro' },
  { test: /^roma/i, key: 'roma' },
  { test: /cargo|facility/i, key: '__cargo__' }, // deprioritize cargo-only rows
];

const canonicalKey = (row) => {
  const blob = `${row.port_name} ${row.crossing_name}`;
  for (const { test, key } of CANONICAL) {
    if (test.test(blob)) return key;
  }
  return (row.port_name + '|' + (row.crossing_name || '')).toLowerCase().trim();
};

// Score a row for dedupe priority: higher is better.
const rowScore = (r) => {
  let s = 0;
  if (r.current_wait_time != null) s += 100;         // real passenger data wins
  if (r.lanes?.passenger_standard) s += 20;
  if (r.lanes?.passenger_ready) s += 5;
  if (r.lanes?.passenger_sentri) s += 5;
  if (r.lanes?.pedestrian_standard) s += 3;
  if (r.lanes?.commercial_standard) s += 2;
  if (r.name && r.name.includes(' - ')) s += 1;      // prefer "City - Crossing"
  if (/cargo|facility/i.test(r.name || '')) s -= 10; // cargo-only → last
  return s;
};

// Dedupe strategy: group by canonical key, pick the single highest-scoring
// row. Merge any lane data the winner is missing from siblings.
const dedupe = (rows) => {
  const groups = new Map();
  for (const r of rows) {
    const k = canonicalKey(r);
    const arr = groups.get(k) || [];
    arr.push(r);
    groups.set(k, arr);
  }
  const keep = [];
  for (const [, arr] of groups) {
    arr.sort((a, b) => rowScore(b) - rowScore(a));
    const winner = { ...arr[0], lanes: { ...arr[0].lanes } };
    // Merge lane data from siblings if winner has gaps.
    for (const sib of arr.slice(1)) {
      for (const k of Object.keys(sib.lanes || {})) {
        if (!winner.lanes[k] && sib.lanes[k]) winner.lanes[k] = sib.lanes[k];
      }
      // If winner has no wait but sibling does, promote.
      if (winner.current_wait_time == null && sib.current_wait_time != null) {
        winner.current_wait_time = sib.current_wait_time;
        winner.status = sib.status;
      }
    }
    keep.push(winner);
  }
  return keep;
};

async function main() {
  console.log(`Fetching ${CBP_URL}...`);
  const res = await fetch(CBP_URL, { headers: { 'User-Agent': 'borderpulse.com/1.0 (static-fetch)' } });
  if (!res.ok) throw new Error(`CBP fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('CBP response was not an array');

  const mexican = dedupe(
    data
      .filter((p) => p.border === 'Mexican Border')
      .map(mapPort),
  );

  const payload = {
    source: 'U.S. Customs and Border Protection',
    source_url: CBP_URL,
    fetched_at: new Date().toISOString(),
    count: mexican.length,
    crossings: mexican,
  };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${mexican.length} Mexican-border crossings → ${OUT_PATH}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
