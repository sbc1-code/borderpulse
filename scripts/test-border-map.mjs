import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
  assert.equal(crossingMapLocation({
    port_number: '240221',
    lat: 31,
    lng: -106
  }), null);
  assert.equal(crossingMapLocation({
    port_number: '260802',
    lat: 32,
    lng: -114
  }), null);
  assert.deepEqual(crossingMapLocation({
    port_number: '230401',
    lat: 0,
    lng: 0
  }), {
    lat: 27.499,
    lng: -99.507,
    approximate: true
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
  const ports = rows.filter(r => ['250401', '250601'].includes(r.id));
  const camera = fitBorderPoints(ports.map(r => r.point));
  const groups = clusterBorderRows(ports, camera, 350 / MAP_WIDTH);
  assert.equal(groups.length, 2, 'nearby ports separate when their region is fitted');
  for (const row of ports) {
    const p = cameraPoint(row.point, camera);
    assert.ok(p.x > 0 && p.x < MAP_WIDTH && p.y > 0 && p.y < MAP_HEIGHT);
  }
});
