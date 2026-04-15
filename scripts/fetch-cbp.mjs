#!/usr/bin/env node
/**
 * Fetches US-Mexico border wait times from CBP's official public feed
 * and writes a clean JSON snapshot to public/data/crossings.json.
 *
 * CBP feed: https://bwt.cbp.gov/api/waittimes
 * Runs every 15 minutes via GitHub Actions.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const CBP_URL = 'https://bwt.cbp.gov/api/waittimes';
const OUT_PATH = path.join(process.cwd(), 'public', 'data', 'crossings.json');

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

const mapPort = (p) => {
  const passenger_standard = parseLane(p.passenger_vehicle_lanes?.standard_lanes);
  const passenger_sentri = parseLane(p.passenger_vehicle_lanes?.NEXUS_SENTRI_lanes);
  const passenger_ready = parseLane(p.passenger_vehicle_lanes?.ready_lanes);
  const pedestrian_standard = parseLane(p.pedestrian_lanes?.standard_lanes);
  const pedestrian_ready = parseLane(p.pedestrian_lanes?.ready_lanes);
  const commercial_standard = parseLane(p.commercial_vehicle_lanes?.standard_lanes);
  const commercial_fast = parseLane(p.commercial_vehicle_lanes?.FAST_lanes);

  const primaryDelay = passenger_standard?.delay_minutes ?? null;

  return {
    id: p.port_number,
    cbp_id: p.port_number,
    port_number: p.port_number,
    name: p.crossing_name || p.port_name,
    port_name: p.port_name,
    crossing_name: p.crossing_name,
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

async function main() {
  console.log(`Fetching ${CBP_URL}...`);
  const res = await fetch(CBP_URL, { headers: { 'User-Agent': 'borderpulse.com/1.0 (static-fetch)' } });
  if (!res.ok) throw new Error(`CBP fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('CBP response was not an array');

  const mexican = data
    .filter((p) => p.border === 'Mexican Border')
    .map(mapPort);

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
