import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createCbpPayload } from './fetch-cbp.mjs';
import { hasPedestrianLane } from '../src/lib/crossingAvailability.js';
import { standardPassengerWait } from '../src/lib/standardPassengerWait.js';

// Official bwtpublicmod body saved 2026-11-02 at 8:16 AM PST.
// Both Ysleta port numbers are in this file, with reported lane minutes on
// 240203 and Update Pending on 240104.
const feed = JSON.parse(fs.readFileSync(new URL('./fixtures/cbp-bwtpublicmod-2026-11-02.json', import.meta.url)));
const FETCHED = '2026-11-02T16:16:00.000Z';

function payloadFrom(rows) {
  return createCbpPayload(rows, { fetchedAt: FETCHED });
}

function byPort(payload, port) {
  const row = payload.crossings.find(crossing => crossing.port_number === port);
  assert.ok(row, `missing ${port}`);
  return row;
}

function expectLane(crossing, key, status, minutes, open) {
  const lane = crossing.lanes[key];
  assert.ok(lane, `${crossing.port_number} ${key}`);
  assert.equal(lane.status, status, `${crossing.name} ${key} status`);
  assert.equal(lane.delay_minutes, minutes, `${crossing.name} ${key} minutes`);
  if (open !== undefined) assert.equal(lane.lanes_open, open, `${crossing.name} ${key} open count`);
}

test('Ysleta keeps reported lane minutes and the closed standard lane', () => {
  for (const rows of [feed, [...feed].reverse()]) {
    const payload = payloadFrom(rows);
    assert.equal(payload.count, 42);
    const ysleta = byPort(payload, '240104');
    assert.equal(ysleta.name, 'El Paso - Ysleta');
    assert.equal(ysleta.hours, '24 hrs/day');
    assert.equal(ysleta.current_wait_time, null);
    assert.equal(standardPassengerWait(ysleta), null);
    assert.equal(payload.crossings.some(row => row.port_number === '240203'), false);
    expectLane(ysleta, 'passenger_standard', 'Lanes Closed', null, null);
    expectLane(ysleta, 'passenger_ready', 'delay', 50, 3);
    expectLane(ysleta, 'passenger_sentri', 'delay', 25, 4);
    expectLane(ysleta, 'pedestrian_standard', 'no delay', 1, 2);
    expectLane(ysleta, 'pedestrian_ready', 'N/A', null, null);
    expectLane(ysleta, 'commercial_standard', 'delay', 25, 4);
    expectLane(ysleta, 'commercial_fast', 'delay', 15, 3);
    assert.equal(ysleta.lanes.passenger_ready.update_time, 'At 9:00 am MST');
  }
});

test('other duplicate rows in the 2026-11-02 feed keep reported minutes and explicit statuses', () => {
  const payload = payloadFrom(feed);
  const otay = byPort(payload, '250601');
  expectLane(otay, 'passenger_standard', 'delay', 90, 3);
  expectLane(otay, 'passenger_sentri', 'delay', 25, 4);
  expectLane(otay, 'passenger_ready', 'delay', 90, 4);
  expectLane(otay, 'pedestrian_standard', 'delay', 100, 6);
  expectLane(otay, 'pedestrian_ready', 'N/A', null, null);
  expectLane(otay, 'commercial_standard', 'delay', 15, 4);
  expectLane(otay, 'commercial_fast', 'no delay', 5, 3);
  assert.equal(otay.hours, '24 hrs/day');

  const bota = byPort(payload, '240201');
  expectLane(bota, 'passenger_standard', 'delay', 55, 2);
  expectLane(bota, 'passenger_sentri', 'N/A', null, null);
  expectLane(bota, 'commercial_fast', 'no delay', 0, 2);

  const pdn = byPort(payload, '240202');
  expectLane(pdn, 'passenger_standard', 'delay', 85, 1);
  expectLane(pdn, 'commercial_standard', 'N/A', null, null);
  expectLane(pdn, 'commercial_fast', 'N/A', null, null);

  const naco = byPort(payload, '260301');
  assert.equal(naco.hours, '6 am-10 pm');
  expectLane(naco, 'passenger_standard', 'no delay', 5, 1);
  expectLane(naco, 'passenger_sentri', 'N/A', null, null);
  expectLane(naco, 'passenger_ready', 'N/A', null, null);
  expectLane(naco, 'pedestrian_ready', 'N/A', null, null);
  expectLane(naco, 'commercial_standard', 'Lanes Closed', null, null);
  expectLane(naco, 'commercial_fast', 'N/A', null, null);

  const roma = byPort(payload, '231001');
  expectLane(roma, 'passenger_standard', 'delay', 30, 3);
  expectLane(roma, 'passenger_ready', 'Lanes Closed', null, null);
  expectLane(roma, 'passenger_sentri', 'N/A', null, null);
  expectLane(roma, 'pedestrian_standard', 'N/A', null, null);
  expectLane(roma, 'commercial_standard', 'delay', 20);
  assert.equal(hasPedestrianLane(roma), false, 'an Update Pending duplicate is not a pedestrian lane');

  const bm = byPort(payload, '535501');
  expectLane(bm, 'passenger_standard', 'delay', 90, 3);
  expectLane(bm, 'passenger_sentri', 'N/A', null, null);
  expectLane(bm, 'pedestrian_ready', 'N/A', null, null);
  expectLane(bm, 'commercial_standard', 'N/A', null, null);

  const gateway = byPort(payload, '535504');
  expectLane(gateway, 'passenger_standard', 'delay', 120, 3);
  expectLane(gateway, 'passenger_sentri', 'N/A', null, null);
  expectLane(gateway, 'commercial_standard', 'N/A', null, null);
  expectLane(gateway, 'commercial_fast', 'N/A', null, null);

  for (const [port, key] of [
    ['230301', 'passenger_standard'],
    ['240204', 'passenger_standard'],
    ['230502', 'passenger_standard'],
    ['230401', 'passenger_standard'],
    ['230403', 'passenger_standard'],
  ]) {
    expectLane(byPort(payload, port), key, 'Lanes Closed', null, null);
  }

  const sanYsidro = byPort(payload, '250401');
  expectLane(sanYsidro, 'passenger_standard', 'delay', 90, 6);
  expectLane(sanYsidro, 'pedestrian_standard', 'delay', 60, 15);
  expectLane(sanYsidro, 'pedestrian_ready', 'no delay', 5, 1);
  expectLane(sanYsidro, 'commercial_standard', 'N/A', null, null);
  assert.equal(payload.crossings.some(row => row.port_number === '250407' || row.port_number === '250409'), false);

  for (const crossing of payload.crossings) {
    for (const [key, lane] of Object.entries(crossing.lanes)) {
      assert.ok(lane, `${crossing.port_number} ${key} was flattened`);
      assert.ok(['delay', 'no delay', 'Lanes Closed', 'N/A', 'Update Pending'].includes(lane.status), lane.status);
    }
  }

  assert.equal(hasPedestrianLane(byPort(payload, '230901')), true);
  assert.equal(hasPedestrianLane(byPort(payload, '240801')), true);
  assert.equal(hasPedestrianLane(byPort(payload, '230301')), false);
  assert.equal(hasPedestrianLane(byPort(payload, '230902')), false);
});

function lane(status, delay = '', open = '') {
  return {
    operational_status: status,
    delay_minutes: delay === '' ? '' : String(delay),
    lanes_open: open === '' ? '' : String(open),
    update_time: delay === '' ? '' : 'At 9:00 am MST',
  };
}

function row({ port, name, crossing = '', hours = '24 hrs/day', lanes = {} }) {
  const pick = (key, fallback) => lanes[key] || lane(fallback);
  return {
    port_number: port,
    port_name: name,
    crossing_name: crossing,
    border: 'Mexican Border',
    port_status: 'Open',
    hours,
    date: '11/2/2026',
    time: '11:00:00',
    passenger_vehicle_lanes: {
      standard_lanes: pick('passenger_standard', 'N/A'),
      NEXUS_SENTRI_lanes: pick('passenger_sentri', 'N/A'),
      ready_lanes: pick('passenger_ready', 'N/A'),
    },
    pedestrian_lanes: {
      standard_lanes: pick('pedestrian_standard', 'N/A'),
      ready_lanes: pick('pedestrian_ready', 'N/A'),
    },
    commercial_vehicle_lanes: {
      standard_lanes: pick('commercial_standard', 'N/A'),
      FAST_lanes: pick('commercial_fast', 'N/A'),
    },
  };
}

function withFillers(rows) {
  const fillers = Array.from({ length: 35 }, (_, index) => row({
    port: String(810000 + index),
    name: `Filler Crossing ${index}`,
    lanes: { passenger_standard: lane('no delay', 0, 1) },
  }));
  return [...rows, ...fillers];
}

test('a reported minute outranks Lanes Closed and Update Pending on the same lane', () => {
  const closed = row({
    port: '240203', name: 'El Paso', crossing: 'Ysleta',
    lanes: { passenger_standard: lane('Lanes Closed'), passenger_ready: lane('Carriles cerrados') },
  });
  const pending = row({
    port: '240104', name: 'YSLETA', hours: '6 am-10 pm',
    lanes: {
      passenger_standard: lane('Actualización Pendiente'),
      passenger_ready: lane('Update Pending'),
    },
  });
  const numbered = row({
    port: '240104', name: 'YSLETA',
    lanes: { passenger_standard: lane('demora', 12, 2) },
  });
  const zero = row({
    port: '240203', name: 'El Paso', crossing: 'Ysleta',
    lanes: { passenger_standard: lane('Sin demora', 0, 1) },
  });

  for (const rows of [[closed, pending], [pending, closed]]) {
    const ysleta = byPort(payloadFrom(withFillers(rows)), '240104');
    expectLane(ysleta, 'passenger_standard', 'Lanes Closed', null, null);
    expectLane(ysleta, 'passenger_ready', 'Lanes Closed', null, null);
    assert.equal(ysleta.current_wait_time, null);
    assert.equal(ysleta.hours, '24 hrs/day');
  }

  for (const rows of [[numbered, closed], [closed, numbered]]) {
    const ysleta = byPort(payloadFrom(withFillers(rows)), '240104');
    expectLane(ysleta, 'passenger_standard', 'delay', 12, 2);
    assert.equal(ysleta.current_wait_time, 12);
  }

  for (const rows of [[zero, pending], [pending, zero]]) {
    const ysleta = byPort(payloadFrom(withFillers(rows)), '240104');
    expectLane(ysleta, 'passenger_standard', 'no delay', 0, 1);
    assert.equal(ysleta.current_wait_time, 0);
    assert.equal(standardPassengerWait(ysleta), 0);
  }

  assert.equal(standardPassengerWait({
    port_status: 'Open',
    lanes: { passenger_standard: { status: 'Lanes Closed', delay_minutes: 5, lanes_open: 1 } },
  }), null);
});
