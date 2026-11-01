import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getCrossingCoords, haversineKm, nearestCrossings } from '../src/lib/geo.js';
import { borderHistorySnapshots, borderReportRows, cameraPoint, clusterBorderRows, crossingMapLocation, fitBorderPoints, MAP_HEIGHT, MAP_WIDTH, WHOLE_BORDER } from '../src/lib/borderMap.js';
const catalog = JSON.parse(fs.readFileSync(new URL('../public/data/crossings.json', import.meta.url))).crossings;
const lane = (value, status = 'Delay', open = 1) => ({
  delay_minutes: value,
  status,
  lanes_open: open,
  update_time: 'At Noon PST'
});
const crossing = (id, report, port_status = 'Open') => ({
  port_number: id,
  name: id,
  port_status,
  lanes: {
    passenger_standard: report
  }
});
test('whole-border catalog retains every record and withholds ambiguous physical pins', () => {
  const rows = borderReportRows(catalog, 'passenger_standard');
  assert.equal(rows.length, catalog.length);
  for (const state of ['CA', 'AZ', 'NM', 'TX']) assert.ok(rows.some(r => r.crossing.state === state && r.point));
  for (const id of ['240221', '260802', '250601', '230404', '250609']) assert.equal(crossingMapLocation({
    port_number: id,
    lat: 31,
    lng: -106
  }), null, 'withheld identities cannot regain a pin through feed coordinates');
  const laredo = crossingMapLocation({
    port_number: '230401',
    lat: 0,
    lng: 0
  });
  assert.deepEqual([laredo.lat, laredo.lng], [27.499, -99.507]);
  assert.equal(laredo.locationKind, 'published-limited');
  assert.equal(crossingMapLocation({
    port_number: 'new-unreviewed',
    lat: 32,
    lng: -114
  }), null, 'a new feed coordinate is not silently treated as a reviewed catalog point');
  const known = JSON.parse(fs.readFileSync(new URL('./fixtures/border-map-catalog.json', import.meta.url))).crossings;
  const coverage = borderReportRows(known, 'passenger_standard');
  assert.equal(known.length, 42);
  assert.equal(coverage.filter(row => row.point).length, 38);
  assert.deepEqual(coverage.filter(row => !row.point).map(row => row.id).sort(), ['230404', '240221', '250601', '260802']);
  const count = kind => coverage.filter(row => row.location?.locationKind === kind).length;
  assert.equal(count('directory-target'), 8);
  assert.equal(count('federal-facility'), 1);
  assert.equal(count('published-limited'), 3);
  assert.equal(count('inherited-unverified'), 26);
  assert.deepEqual(Object.fromEntries(['CA', 'AZ', 'NM', 'TX'].map(state => [state, coverage.filter(row => row.crossing.state === state && row.point).length])), {
    CA: 5,
    AZ: 7,
    NM: 2,
    TX: 24
  });
  assert.equal(crossingMapLocation({
    port_number: 'unknown',
    lat: 500,
    lng: 0
  }), null);
  for (const row of rows.filter(r => r.point)) assert.ok(row.point.x >= 0 && row.point.x <= MAP_WIDTH && row.point.y >= 0 && row.point.y <= MAP_HEIGHT, row.id);
});
test('current lane semantics preserve zero, missing, closed lanes and port override', () => {
  const rows = borderReportRows([crossing('1', lane(0)), crossing('2', lane(null, 'Update Pending')), crossing('3', lane(30, 'Delay', 0)), crossing('4', lane(12), 'Closed')], 'passenger_standard');
  assert.deepEqual(rows.map(r => r.wait), [0, null, null, null]);
  assert.deepEqual(rows.map(r => r.reason), [null, 'no_report', 'lane_closed', 'port_closed']);
  assert.equal(rows[0].report, 'At Noon PST');
});
test('recorded gaps, zero and canonical aliases survive without invented lane detail', () => {
  const snapshots = borderHistorySnapshots({
    snapshots: [{
      fetched_at: '2026-10-30T11:00:00Z',
      source: 'commit:' + 'a'.repeat(40),
      crossings: [{
        port_number: '250609',
        current_wait_time: 0
      }]
    }, {
      fetched_at: '2026-10-30T12:00:00Z',
      crossings: [{
        port_number: '250601',
        current_wait_time: null
      }]
    }, {
      fetched_at: 'garbage',
      crossings: []
    }, {
      fetched_at: '2099-01-01T00:00:00Z',
      crossings: []
    }]
  }, Date.parse('2026-11-01T00:00:00Z'));
  assert.equal(snapshots.length, 2);
  const current = [crossing('250601', lane(55), 'Closed')];
  assert.equal(borderReportRows(current, 'passenger_standard', snapshots[0])[0].wait, 0);
  assert.equal(borderReportRows(current, 'passenger_standard', snapshots[0])[0].reason, null, 'today closure cannot leak into history');
  assert.equal(borderReportRows(current, 'passenger_standard', snapshots[1])[0].wait, null);
  assert.equal(borderReportRows(current, 'passenger_ready', snapshots[0])[0].reason, 'not_retained');
  assert.equal(borderReportRows(current, 'passenger_standard', snapshots[0])[0].report, null);
  assert.equal(snapshots[1].source, null);
  const duplicates = {
    ...snapshots[0],
    crossings: [{
      port_number: '250601',
      current_wait_time: 20
    }, {
      port_number: '250609',
      current_wait_time: 0
    }]
  };
  assert.equal(borderReportRows(current, 'passenger_standard', duplicates)[0].wait, null, 'ambiguous duplicate is not an arbitrary wait');
});
test('camera fit and geographic clustering use the same affine coordinates at intermediate widths', () => {
  const rows = borderReportRows(catalog, 'passenger_standard');
  for (const width of [320, 390, 606, 700, 746, 786, 1100]) {
    const groups = clusterBorderRows(rows, WHOLE_BORDER, width / MAP_WIDTH);
    assert.equal(groups.reduce((n, g) => n + g.rows.length, 0), rows.filter(r => r.point).length);
    for (const group of groups) assert.deepEqual(group.display, cameraPoint(group.point, WHOLE_BORDER));
  }
  const ports = rows.filter(r => ['535504', '535502'].includes(r.id));
  const camera = fitBorderPoints(ports.map(r => r.point));
  const groups = clusterBorderRows(ports, camera, 350 / MAP_WIDTH);
  assert.equal(groups.length, 2, 'nearby ports separate when their region is fitted');
  for (const row of ports) {
    const p = cameraPoint(row.point, camera);
    assert.ok(p.x > 0 && p.x < MAP_WIDTH && p.y > 0 && p.y < MAP_HEIGHT);
  }
});
const geographyEvidence = JSON.parse(fs.readFileSync(new URL('../docs/borderwide-map-review/geographic-evidence.json', import.meta.url)));
test('named primary directory targets replace material fallback displacements', () => {
  const identities = {
    '240204': /Stanton/i,
    '230502': /Pharr - Pharr/i,
    '535504': /Brownsville - Gateway/i,
    '535502': /Veterans/i,
    '230902': /Donna/i,
    '230302': /Eagle Pass - Bridge II/i,
    '240301': /Presidio/i,
    '535503': /Los Indios/i
  };
  const minimumKm = {
    '240204': 3.5,
    '230502': 9.5,
    '535504': 16,
    '535502': 6.5,
    '230902': 10,
    '230302': 2.8,
    '240301': 1.6,
    '535503': 1.3
  };
  for (const row of geographyEvidence.corrections) {
    const record = catalog.find(c => c.port_number === row.port_number);
    assert.ok(record, row.port_number);
    assert.match(record.name, identities[row.port_number]);
    const actual = crossingMapLocation(record),
      shared = getCrossingCoords({
        port_number: row.port_number
      });
    assert.equal(actual.locationKind, 'directory-target');
    assert.equal(actual.approximate, true);
    assert.match(actual.locationSource, /^https:\/\/www\.tabc\.texas\.gov\//);
    assert.deepEqual([actual.lat, actual.lng], [shared.lat, shared.lng], 'shared proximity and map catalog agree');
    assert.ok(haversineKm(actual.lat, actual.lng, row.target.lat, row.target.lng) < .015, 'rounded point stays within 15 m of the linked target');
    assert.ok(haversineKm(actual.lat, actual.lng, row.former_fallback.lat, row.former_fallback.lng) > minimumKm[row.port_number], 'negative control rejects the materially displaced old fallback');
  }
  assert.equal(geographyEvidence.corrections.length, 8);
  assert.deepEqual(crossingMapLocation({
    port_number: '230103'
  }), crossingMapLocation({
    port_number: '535504'
  }), 'Gateway identity alias receives Gateway, not Veterans or another office');
});
test('San Luis I uses the published federal facility point, never the San Luis II duplicate', () => {
  const source = geographyEvidence.san_luis_i;
  const dms = ([d, m, s]) => d + m / 60 + s / 3600;
  const point = crossingMapLocation({
    port_number: '260801'
  });
  assert.equal(point.locationKind, 'federal-facility');
  assert.equal(point.approximate, true);
  assert.ok(haversineKm(point.lat, point.lng, dms(source.latitude_dms), -dms(source.longitude_west_dms)) < .015);
  assert.equal(crossingMapLocation({
    port_number: '260802'
  }), null);
  assert.equal(getCrossingCoords({
    port_number: '260802'
  }), null, 'shared helper cannot reuse the San Luis I fallback for II');
});
test('corrected crossing identities remain physically distinct in nearby comparisons', () => {
  const location = id => getCrossingCoords({
    port_number: id
  });
  const distance = (a, b) => {
    const x = location(a),
      y = location(b);
    return haversineKm(x.lat, x.lng, y.lat, y.lng);
  };
  assert.ok(distance('240204', '240202') < 1, 'Stanton is near downtown PDN');
  assert.ok(distance('240204', '240201') > 2, 'Stanton is not mislabeled as BOTA');
  assert.equal(nearestCrossings({
    port_number: '240204'
  }, catalog, 1)[0].crossing.port_number, '240202');
  assert.ok(location('535504').lat > location('535502').lat, 'Gateway is north of Veterans');
  assert.ok(distance('535504', '535502') > 2 && distance('535504', '535502') < 3.5);
  assert.ok(location('230902').lng < location('230901').lng, 'Donna is a distinct target west of Progreso');
  for (const id of geographyEvidence.withheld) {
    assert.equal(getCrossingCoords({
      port_number: id
    }), null, 'suspect fallback is unavailable to shared proximity helpers');
    assert.equal(getCrossingCoords({
      port_number: id,
      lat: 32,
      lng: -114
    }), null, 'supplied coordinates cannot bypass the shared withholding decision');
  }
});
