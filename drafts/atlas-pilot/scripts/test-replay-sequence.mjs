import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parseFeed, reconcile } from './canada-fixture.mjs';
import { normalizeSnapshot } from './us-fixture.mjs';

const fixtures = new URL('../fixtures/', import.meta.url);
const enBase = await readFile(new URL('cbsa-eng.csv', fixtures), 'utf8');
const frBase = await readFile(new URL('cbsa-fra.csv', fixtures), 'utf8');
const usBase = JSON.parse(await readFile(new URL('cbp-us-bound.json', fixtures), 'utf8'));

function replaceRow(csv, prefix, oldVal, newVal) {
  return csv
    .split('\n')
    .map(line => (line.startsWith(prefix) ? line.replace(oldVal, newVal) : line))
    .join('\n');
}

function makeCbsaPair({ timestampEn, timestampFr, sumasCommercialEn, sumasCommercialFr }) {
  let en = enBase.replaceAll('2026-11-24 00:20 PDT', timestampEn);
  let fr = frBase.replaceAll('2026-11-24 00:20 HAP', timestampFr);
  if (sumasCommercialEn && sumasCommercialFr) {
    en = replaceRow(en, 'Abbotsford-Huntingdon;;', ';; No Delay;;', `;; ${sumasCommercialEn};;`);
    fr = replaceRow(fr, 'Abbotsford-Huntingdon;;', ';; Aucun délai;;', `;; ${sumasCommercialFr};;`);
  }
  return reconcile(parseFeed(en, 'eng'), parseFeed(fr, 'fra'));
}

function updateUsPorts(retrievedAt, mutator) {
  const clone = structuredClone(usBase);
  clone.retrievedAt = retrievedAt;
  for (const port of clone.ports) mutator(port);
  return normalizeSnapshot(clone);
}

test('replays four agency updates across midnight, temporary commercial closure, and reopening', () => {
  // Checkpoint 1: Baseline capture (2026-11-24T07:40Z / 23:37 PST)
  const cp1Ca = makeCbsaPair({ timestampEn: '2026-11-24 00:20 PDT', timestampFr: '2026-11-24 00:20 HAP' });
  const cp1Us = normalizeSnapshot(usBase);
  const cp1SumasCa = cp1Ca.find(c => c.id === 'abbotsford-huntingdon');
  const cp1SumasUs = cp1Us.crossings.find(c => c.id === 'abbotsford-huntingdon');
  assert.equal(cp1SumasCa.flows.CA.traveler.state, 'wait');
  assert.equal(cp1SumasCa.flows.CA.commercial.state, 'no_delay');
  assert.equal(cp1SumasUs.traveler.state, 'stale');
  assert.equal(cp1SumasUs.traveler.ageMinutes, 160.8);

  // Checkpoint 2: Across midnight rollover (2026-11-24T08:15:00Z / 00:15 PST)
  // CBP port date rolls to 11/24/2026 00:15:00; 11:45 pm PST lanes are 30 min old across midnight,
  // while Sumas 9:00 pm PST lanes remain stale at 195 min old.
  const cp2Ca = makeCbsaPair({ timestampEn: '2026-11-24 01:00 PDT', timestampFr: '2026-11-24 01:00 HAP' });
  const cp2Us = updateUsPorts('2026-11-24T08:15:00Z', port => {
    port.date = '11/24/2026';
    port.time = '00:15:00';
    if (port.port_number !== '300901') {
      port.passenger_vehicle_lanes.standard_lanes.update_time = 'At 11:45 pm PST';
      if (port.commercial_vehicle_lanes.standard_lanes.operational_status !== 'N/A') {
        port.commercial_vehicle_lanes.standard_lanes.update_time = 'At 11:45 pm PST';
      }
    }
  });
  assert.equal(cp2Ca[0].reportedAt, '2026-11-24T08:00:00.000Z');
  const cp2Pacific = cp2Us.crossings.find(c => c.id === 'pacific-highway');
  const cp2Peace = cp2Us.crossings.find(c => c.id === 'douglas');
  const cp2Sumas = cp2Us.crossings.find(c => c.id === 'abbotsford-huntingdon');
  assert.equal(cp2Pacific.traveler.state, 'reported_wait');
  assert.equal(cp2Pacific.traveler.reportedAt, '2026-11-24T07:45:00.000Z');
  assert.equal(cp2Pacific.traveler.ageMinutes, 30);
  assert.equal(cp2Peace.traveler.state, 'reported_wait');
  assert.equal(cp2Peace.commercial.state, 'not_applicable');
  assert.equal(cp2Sumas.traveler.state, 'stale');
  assert.equal(cp2Sumas.traveler.reportedAt, '2026-11-24T05:00:00.000Z');
  assert.equal(cp2Sumas.traveler.ageMinutes, 195);

  // Checkpoint 3: Temporary commercial closure at Sumas / Abbotsford-Huntingdon (09:05Z / 01:05 PST)
  // Passenger lanes stay open while commercial lanes close in both directions.
  const cp3Ca = makeCbsaPair({
    timestampEn: '2026-11-24 02:00 PDT',
    timestampFr: '2026-11-24 02:00 HAP',
    sumasCommercialEn: 'Temporarily Closed',
    sumasCommercialFr: 'Temporairement fermé',
  });
  const cp3Us = updateUsPorts('2026-11-24T09:05:00Z', port => {
    port.date = '11/24/2026';
    port.time = '01:05:00';
    if (port.port_number === '300901') {
      port.passenger_vehicle_lanes.standard_lanes = {
        update_time: 'At 1:00 am PST',
        operational_status: 'no delay',
        delay_minutes: '0',
        lanes_open: '1',
      };
      port.commercial_vehicle_lanes.standard_lanes = {
        update_time: 'At 1:00 am PST',
        operational_status: 'Lanes Closed',
        delay_minutes: '',
        lanes_open: '0',
      };
    } else {
      port.passenger_vehicle_lanes.standard_lanes.update_time = 'At 1:00 am PST';
      if (port.commercial_vehicle_lanes.standard_lanes.operational_status !== 'N/A') {
        port.commercial_vehicle_lanes.standard_lanes.update_time = 'At 1:00 am PST';
      }
    }
  });
  const cp3SumasCa = cp3Ca.find(c => c.id === 'abbotsford-huntingdon');
  const cp3SumasUs = cp3Us.crossings.find(c => c.id === 'abbotsford-huntingdon');
  assert.equal(cp3SumasCa.flows.CA.traveler.state, 'wait');
  assert.equal(cp3SumasCa.flows.CA.traveler.minutes, 5);
  assert.equal(cp3SumasCa.flows.CA.commercial.state, 'closed');
  assert.equal(cp3SumasCa.flows.CA.commercial.minutes, null);
  assert.equal(cp3SumasUs.traveler.state, 'reported_wait');
  assert.equal(cp3SumasUs.traveler.minutes, 0);
  assert.equal(cp3SumasUs.commercial.state, 'closed');
  assert.equal(cp3SumasUs.commercial.minutes, null);

  // Checkpoint 4: Commercial reopening at Sumas / Abbotsford-Huntingdon (10:10Z / 02:10 PST)
  const cp4Ca = makeCbsaPair({
    timestampEn: '2026-11-24 03:00 PDT',
    timestampFr: '2026-11-24 03:00 HAP',
    sumasCommercialEn: 'No Delay',
    sumasCommercialFr: 'Aucun délai',
  });
  const cp4Us = updateUsPorts('2026-11-24T10:10:00Z', port => {
    port.date = '11/24/2026';
    port.time = '02:10:00';
    if (port.port_number === '300901') {
      port.passenger_vehicle_lanes.standard_lanes = {
        update_time: 'At 2:00 am PST',
        operational_status: 'no delay',
        delay_minutes: '0',
        lanes_open: '1',
      };
      port.commercial_vehicle_lanes.standard_lanes = {
        update_time: 'At 2:00 am PST',
        operational_status: 'no delay',
        delay_minutes: '5',
        lanes_open: '1',
      };
    } else {
      port.passenger_vehicle_lanes.standard_lanes.update_time = 'At 2:00 am PST';
      if (port.commercial_vehicle_lanes.standard_lanes.operational_status !== 'N/A') {
        port.commercial_vehicle_lanes.standard_lanes.update_time = 'At 2:00 am PST';
      }
    }
  });
  const cp4SumasCa = cp4Ca.find(c => c.id === 'abbotsford-huntingdon');
  const cp4SumasUs = cp4Us.crossings.find(c => c.id === 'abbotsford-huntingdon');
  assert.equal(cp4SumasCa.flows.CA.commercial.state, 'no_delay');
  assert.equal(cp4SumasCa.flows.CA.commercial.minutes, null);
  assert.equal(cp4SumasUs.commercial.state, 'reported_wait');
  assert.equal(cp4SumasUs.commercial.minutes, 5);
  assert.equal(cp4SumasUs.commercial.ageMinutes, 10);
});
