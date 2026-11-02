import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  accumulateSnapshot,
  currentFlips,
  describePair,
  emptyLaneStats,
  heatLevel,
  hourStats,
  openLaneCount,
  pairOutcome,
  recordOutcome,
  reportedLaneMinutes,
} from '../src/lib/laneFlips.js';
import {
  archiveCaveat,
  historyCoverage,
  historyNotice,
  pairClocks,
  heatLegend,
  eligibilityNote,
  checkNote,
  detailTitle,
  hourDetail,
  indexTitle,
  methodParagraph,
  periodSentence,
  shareText,
  verdictSentence,
} from '../src/lib/laneFlipCopy.js';

const lane = (delay_minutes, status = 'delay', lanes_open = 1, update_time = 'At 10:00 pm PST') => ({
  delay_minutes, status, lanes_open, update_time,
});

function otay(ready = 110, general = 60) {
  return {
    port_number: '250601',
    port_status: 'Open',
    name: 'Otay Mesa',
    lanes: {
      passenger_standard: lane(general),
      passenger_ready: lane(ready),
      passenger_sentri: lane(10, 'no delay'),
      pedestrian_standard: lane(30),
      pedestrian_ready: null,
    },
  };
}

test('a reported fast lane slower than general is a flip, including the 50 minute gap', () => {
  const row = describePair(otay(), { key: 'passenger_ready', general: 'passenger_standard' });
  assert.equal(row.state, 'slower');
  assert.equal(row.gap, 50);
  assert.equal(verdictSentence(row, 'en', true), 'In the latest fetch, Ready Lane is reported 50 min slower than general.');
  assert.equal(verdictSentence(row, 'es', true), 'En la última consulta, Ready Lane se reporta 50 min más lento que el general.');
  assert.equal(verdictSentence(row, 'en', false), 'In the latest report, Ready Lane is reported 50 min slower than general.');
});

test('faster, equal, zero, pending, closed, and closed-booth lanes stay distinct', () => {
  assert.equal(describePair(otay(10, 60), { key: 'passenger_sentri', general: 'passenger_standard' }).state, 'faster');
  assert.equal(describePair(otay(60, 60), { key: 'passenger_ready', general: 'passenger_standard' }).state, 'same');
  assert.equal(describePair(otay(0, 60), { key: 'passenger_ready', general: 'passenger_standard' }).gap, -60);
  const pending = otay();
  pending.lanes.passenger_ready = lane(20, 'Update Pending');
  assert.equal(describePair(pending, { key: 'passenger_ready', general: 'passenger_standard' }).state, 'fast-missing');
  assert.equal(reportedLaneMinutes(pending, 'passenger_ready'), null);
  const shut = otay();
  shut.lanes.passenger_ready = lane(20, 'delay', 0);
  assert.equal(describePair(shut, { key: 'passenger_ready', general: 'passenger_standard' }).state, 'no-open');
  const closed = otay();
  closed.port_status = 'Closed';
  assert.equal(describePair(closed, { key: 'passenger_ready', general: 'passenger_standard' }).state, 'closed');
  assert.equal(reportedLaneMinutes(closed, 'passenger_standard'), null);
});

test('a null or missing open count is not zero, and Lanes Closed or N/A is not a comparison', () => {
  assert.equal(openLaneCount(null), null);
  assert.equal(openLaneCount(undefined), null);
  assert.equal(openLaneCount(''), null);
  assert.equal(openLaneCount(0), 0);
  for (const status of ['Lanes Closed', 'N/A', 'n/a']) {
    const crossing = otay();
    crossing.lanes.passenger_ready = {
      status,
      delay_minutes: 110,
      lanes_open: null,
      update_time: 'At 10:00 pm PST',
    };
    const row = describePair(crossing, { key: 'passenger_ready', general: 'passenger_standard' });
    assert.equal(reportedLaneMinutes(crossing, 'passenger_ready'), null, status);
    assert.equal(row.fast.lanesOpen, null, status);
    assert.equal(row.gap, null, status);
    assert.equal(row.state, 'fast-missing', status);
    assert.equal(currentFlips([crossing]).some(flip => flip.key === 'passenger_ready'), false, status);
    const ports = new Map();
    const meta = new Map([['250601', { slug: 'otay-mesa', name: 'Otay Mesa', timezone: 'America/Los_Angeles' }]]);
    accumulateSnapshot(ports, [crossing], '2026-11-02T06:00:00.000Z', meta, () => 9);
    assert.equal(ports.get('250601').lanes.passenger_sentri.paired, 1, status);
    assert.equal(ports.get('250601').lanes.passenger_ready, undefined, status);
  }
  const omitted = otay();
  delete omitted.lanes.passenger_ready.lanes_open;
  omitted.lanes.passenger_ready.status = 'Lanes Closed';
  omitted.lanes.passenger_ready.delay_minutes = 50;
  const omittedRow = describePair(omitted, { key: 'passenger_ready', general: 'passenger_standard' });
  assert.notEqual(omittedRow.state, 'no-open');
  assert.notEqual(omittedRow.state, 'slower');
  assert.equal(currentFlips([omitted]).length, 0);
});

test('a missing fast lane never borrows the general wait', () => {
  const crossing = otay();
  crossing.lanes.passenger_ready = null;
  const row = describePair(crossing, { key: 'passenger_ready', general: 'passenger_standard' });
  assert.equal(row.state, 'fast-missing');
  assert.equal(row.fast.minutes, null);
  assert.equal(row.gap, null);
  assert.equal(pairOutcome(60, null), null);
});

test('pedestrian Ready compares with pedestrian general, not with vehicles', () => {
  const crossing = otay();
  crossing.lanes.pedestrian_ready = lane(45);
  const row = describePair(crossing, { key: 'pedestrian_ready', general: 'pedestrian_standard' });
  assert.equal(row.state, 'slower');
  assert.equal(row.gap, 15);
  assert.match(verdictSentence(row, 'en', true), /Ready pedestrian is reported 15 min slower than general pedestrian/);
  const flips = currentFlips([crossing]);
  assert.deepEqual(flips.map(flip => flip.key), ['passenger_ready', 'pedestrian_ready']);
});

test('hour counts describe retained fetches without an inference from repeated values', () => {
  const stats = emptyLaneStats();
  recordOutcome(stats, 15, 'slower');
  recordOutcome(stats, 15, 'faster');
  recordOutcome(stats, 8, 'faster');
  assert.equal(hourStats(stats, 15).slower, 1);
  assert.equal(hourStats(stats, 8).paired, 1);
  const usual = { paired: 10, slower: 1, faster: 8, same: 1 };
  const mixed = { paired: 10, slower: 4, faster: 5, same: 1 };

  assert.equal(heatLevel(usual), 'low');
  assert.equal(heatLevel(mixed), 'mixed');
  assert.equal(heatLevel({ paired: 4, slower: 2, faster: 2, same: 0 }), 'often');
  assert.match(hourDetail({ key: 'passenger_ready', general: 'passenger_standard' }, usual, 8, 'en'), /1 slower, 8 faster, and 1 the same, out of 10 fetches with both lane values/);
  assert.doesNotMatch(hourDetail({ key: 'passenger_ready', general: 'passenger_standard' }, mixed, 15, 'en'), /usually/);
});

test('alias rows in one fetch are counted once under the canonical port', () => {
  const ports = new Map();
  const meta = new Map([['250601', { slug: 'otay-mesa', name: 'Otay Mesa', timezone: 'America/Los_Angeles' }]]);
  accumulateSnapshot(ports, [
    { port_number: '250609', port_status: 'Open', lanes: { passenger_standard: lane(60), passenger_ready: lane(110) } },
    { port_number: '250601', port_status: 'Open', lanes: { passenger_standard: lane(60), passenger_ready: lane(110) } },
  ], '2026-11-01T18:00:00.000Z', meta, () => 10);
  assert.equal(ports.get('250601').lanes.passenger_ready.paired, 1);
  assert.equal(ports.get('250601').lanes.passenger_ready.slower, 1);
});

test('copy stays bilingual, dated, and free of em dashes', () => {
  const pieces = [
    indexTitle('en'), indexTitle('es'),
    detailTitle('Otay Mesa', 'en'), detailTitle('Otay Mesa', 'es'),
    checkNote('en'), checkNote('es'),
    methodParagraph('en'), methodParagraph('es'),
    periodSentence({ key: 'passenger_ready', general: 'passenger_standard' }, { slower: 12, paired: 80 }, 'en'),
    periodSentence({ key: 'passenger_ready', general: 'passenger_standard' }, { slower: 12, paired: 80 }, 'es'),
    shareText({
      language: 'es',
      name: 'Otay Mesa',
      url: 'https://borderpulse.com/lane-flip/otay-mesa/',
      notes: ['En la última consulta, Ready Lane se reporta 50 min más lento que el general.'],
      rows: [{ key: 'passenger_ready', minutes: 110, reportTime: 'At 10:00 pm PST' }],
    }),
  ];
  for (const text of pieces) {
    assert.equal(text.includes('\u2014'), false, text);
    assert.equal(text.includes('\u2013'), false, text);
  }
  assert.match(pieces.at(-1), /110 min reportados/);
  assert.match(pieces.at(-1), /Revisa CBP antes de salir/);
  assert.match(pieces.at(-1), /https:\/\/borderpulse.com\/lane-flip\/otay-mesa\//);
});

test('eight repeated values yield counts, never a usual/independent prediction', () => {
  const stats = emptyLaneStats();
  for (let n = 0; n < 8; n++) recordOutcome(stats, 8, 'faster');
  const row = { key: 'passenger_ready', general: 'passenger_standard' };
  for (const language of ['en', 'es']) {
    const text = hourDetail(row, hourStats(stats, 8), 8, language);
    assert.match(text, /8/);
    assert.doesNotMatch(text, /usually|suele|siempre|never|nunca/i);
    assert.doesNotMatch(heatLegend(language).map(item => item.label).join(' '), /never|nunca/i);
  }
});
test('coverage uses retained dates, marks stale/unknown/future windows and discloses legacy normalization', () => {
  const artifact = { window_start: '2026-10-03T10:00:00Z', window_end: '2026-11-01T10:00:00Z', snapshot_count: 17 };
  const now = Date.parse('2026-11-03T10:00:00Z');
  assert.deepEqual(historyCoverage(artifact, now), { valid: true, stale: true });
  assert.equal(historyCoverage(artifact, Date.parse('2026-11-01T11:00:00Z')).stale, false);
  assert.equal(historyCoverage({}, now).valid, false);
  assert.equal(historyCoverage({ ...artifact, window_end: '2027-01-01' }, now).valid, false);
  assert.match(historyNotice(artifact, now, 'en'), /Stale archive.*2026-10-03.*2026-11-01.*17/);
  assert.match(historyNotice(artifact, now, 'es'), /Archivo desactualizado/);
  assert.match(archiveCaveat('en'), /without reconstruction from raw/);
  assert.match(eligibilityNote('es'), /no autoriza/);
});
test('each compared lane keeps its own source clock, including missing clocks', () => {
  const crossing = otay();
  crossing.lanes.passenger_standard.update_time = 'At 9:00 pm PST';
  crossing.lanes.passenger_ready.update_time = 'At 10:00 pm PST';
  crossing.lanes.passenger_ready.source_updated_at = '11/2/2026 10:05 pm';
  let row = describePair(crossing, { key: 'passenger_ready', general: 'passenger_standard' });
  assert.match(pairClocks(row), /General: At 9:00 pm PST.*Ready Lane: At 10:00 pm PST.*11\/2\/2026/);
  crossing.lanes.passenger_standard.update_time = null;
  row = describePair(crossing, { key: 'passenger_ready', general: 'passenger_standard' });
  assert.match(pairClocks(row), /General: CBP time unavailable/);
});

test('published archive coverage and paired counts reconcile without inventing raw reconstruction', () => {
  const artifact = JSON.parse(fs.readFileSync(new URL('../public/data/lane-flips.json', import.meta.url)));
  assert.equal(artifact.normalization, 'legacy-normalized-no-raw-reconstruction');
  assert.ok(artifact.snapshot_count > 0);
  assert.ok(artifact.window_start >= artifact.requested_window_start);
  assert.ok(artifact.window_end <= artifact.generated_at);
  for (const crossing of artifact.crossings) {
    for (const stats of Object.values(crossing.lanes)) {
      assert.ok(stats.first_fetch >= artifact.window_start);
      assert.ok(stats.last_fetch <= artifact.window_end);
      assert.ok(stats.first_fetch <= stats.last_fetch);
      assert.ok(stats.paired <= artifact.snapshot_count);
      assert.equal(stats.slower + stats.faster + stats.same, stats.paired);
      assert.equal(Object.values(stats.by_hour).reduce((n, hour) => n + hour.paired, 0), stats.paired);
    }
  }
});
