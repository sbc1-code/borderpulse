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

// Collapse dupes: for a given port, if there are multiple rows and one of them
// is just the port_name with no crossing_name (e.g. Otay Mesa generic +
// Otay Mesa Passenger/Commercial), keep the named rows and drop the bare one
// when it has no wait data.
const dedupe = (rows) => {
  const byPort = new Map();
  for (const r of rows) {
    const arr = byPort.get(r.port_name) || [];
    arr.push(r);
    byPort.set(r.port_name, arr);
  }
  const keep = [];
  for (const [, arr] of byPort) {
    if (arr.length === 1) { keep.push(arr[0]); continue; }
    const hasNamedWithWait = arr.some((r) => r.crossing_name && r.current_wait_time != null);
    for (const r of arr) {
      const isBare = !r.crossing_name;
      if (isBare && hasNamedWithWait && r.current_wait_time == null) continue; // drop
      keep.push(r);
    }
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
