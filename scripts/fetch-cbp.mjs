#!/usr/bin/env node
/**
 * Fetches US-Mexico border wait times from CBP's official public feed
 * and writes a clean JSON snapshot to public/data/crossings.json.
 *
 * CBP feed: https://bwt.cbp.gov/api/bwtpublicmod
 * Runs on a scheduled GitHub Action.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

// bwt.cbp.gov serves two endpoints with the same JSON shape:
//   /api/waittimes        — legacy, frozen on 3/26/2026 (do NOT use)
//   /api/bwtpublicmod     — current, used by the CBP Angular app
const CBP_URL = 'https://bwt.cbp.gov/api/bwtpublicmod';
const OUT_PATH = path.join(process.cwd(), 'public', 'data', 'crossings.json');

// Minimum healthy crossing count. CBP's Mexican-border feed yields ~43 distinct
// crossings after dedupe. If we ever fall below this, something upstream broke
// (e.g. CBP relabeled/localized fields): refuse to overwrite the last-good
// snapshot rather than silently publishing an empty map. See DECISIONS.md.
const MIN_CROSSINGS = 35;

// --- CBP localization normalization -----------------------------------------
// In May 2026 CBP's bwtpublicmod feed began returning Spanish-localized values
// ("Frontera mexicana", "Abierto", "Sin demora", ...). The feed can come back
// in either language depending on CBP's server-side locale, so we normalize
// every field we depend on to its canonical English form before processing.
// Keys are accent-stripped + lowercased; values match the strings the site and
// pre-localization snapshots were built against.
const normalizeKey = (value) =>
  (value ?? '').toString().trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, ''); // strip diacritics

const BORDER_MAP = {
  'mexican border': 'Mexican Border',
  'frontera mexicana': 'Mexican Border',
  'canadian border': 'Canadian Border',
  'frontera canadiense': 'Canadian Border',
};

const PORT_STATUS_MAP = {
  'open': 'Open', 'abierto': 'Open',
  'closed': 'Closed', 'cerrado': 'Closed',
};

// Lane statuses: lowercase "no delay"/"delay" and title-case "Update Pending"
// are passed through to the UI; "Lanes Closed" and "N/A" are the two sentinels
// parseLane treats as "no usable lane".
const LANE_STATUS_MAP = {
  'no delay': 'no delay', 'sin demora': 'no delay',
  'delay': 'delay', 'demora': 'delay',
  'lanes closed': 'Lanes Closed', 'carriles cerrados': 'Lanes Closed',
  'update pending': 'Update Pending',
  'actualizacion pendiente': 'Update Pending', 'actualización pendiente': 'Update Pending',
  'n/a': 'N/A', 'no aplica': 'N/A',
};

const passthrough = (v) => (v ?? '').toString().trim();
const normalizeBorder = (v) => BORDER_MAP[normalizeKey(v)] ?? passthrough(v);
const normalizePortStatus = (v) => PORT_STATUS_MAP[normalizeKey(v)] ?? passthrough(v);
const normalizeLaneStatus = (v) => LANE_STATUS_MAP[normalizeKey(v)] ?? passthrough(v);
const isMexicanBorder = (p) => BORDER_MAP[normalizeKey(p?.border)] === 'Mexican Border';

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
  if (!lane) return null;
  const status = normalizeLaneStatus(lane.operational_status);
  if (status === 'N/A' || status === 'Lanes Closed') return null;
  const delay = parseInt(lane.delay_minutes, 10);
  const open = parseInt(lane.lanes_open, 10);
  return {
    status: status || null,
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
    border: normalizeBorder(p.border),
    hours: p.hours,
    port_status: normalizePortStatus(p.port_status),
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

  const rawMexican = data.filter(isMexicanBorder);
  const mexican = dedupe(rawMexican.map(mapPort));

  // Fail-safe: never overwrite the last-good snapshot with a near-empty one.
  // A sudden collapse means CBP changed the feed (labels/locale) and the maps
  // above need updating, so surface it loudly (non-zero exit fails the Action and
  // opens a tracking issue) instead of silently publishing an empty map.
  if (mexican.length < MIN_CROSSINGS) {
    throw new Error(
      `Refusing to write crossings.json: ${mexican.length} Mexican-border crossings ` +
      `after dedupe (expected >= ${MIN_CROSSINGS}). ` +
      `Raw Mexican rows from CBP: ${rawMexican.length}; total feed rows: ${data.length}. ` +
      `If raw rows look healthy, CBP likely relabeled/localized fields again; ` +
      `update the normalization maps in scripts/fetch-cbp.mjs. Last-good snapshot left intact.`,
    );
  }

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
