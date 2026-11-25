import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildSnapshot, parseFeed, parseFlow, reconcile, reportUtc } from './canada-fixture.mjs';
import { captureMilliseconds } from './capture-time.mjs';

const fixtures = new URL('../fixtures/', import.meta.url);
const enText = await readFile(new URL('cbsa-eng.csv', fixtures), 'utf8');
const frText = await readFile(new URL('cbsa-fra.csv', fixtures), 'utf8');

test('the dated JSON exactly reproduces the hashed agency rows in both languages', async () => {
  const snapshot = await buildSnapshot();
  const json = await readFile(new URL('canada.json', fixtures), 'utf8');
  assert.deepEqual(snapshot, JSON.parse(json));
  assert.equal(snapshot.crossings.length, 3);
  assert.ok(snapshot.snapshotOnly);
  assert.equal((Date.parse(snapshot.fetchedAt) - Date.parse(snapshot.crossings[0].reportedAt)) / 1000, 1213.37);
});

test('the three port and mode combinations retain their individual source meanings', async () => {
  const { crossings } = await buildSnapshot();
  const ca = Object.fromEntries(crossings.map(p => [p.id, p.flows.CA]));
  assert.equal(ca.douglas.commercial.state, 'not_applicable');
  assert.equal(ca['abbotsford-huntingdon'].commercial.state, 'no_delay');
  assert.equal(ca['abbotsford-huntingdon'].commercial.minutes, null);
  assert.equal(ca['pacific-highway'].commercial.minutes, 5);
  for (const p of crossings) {
    assert.equal(p.flows.CA.traveler.minutes, 5);
    for (const flow of Object.values(p.flows.US)) {
      assert.deepEqual(flow, { state: 'unknown', minutes: null, raw: '--', reason: 'outside_source_coverage' });
    }
  }
});

test('a French compound duration can cross a week, day, or hour boundary', () => {
  assert.equal(parseFlow('1 semaine, 1 jour, 1 heure, 1 minute').minutes, 11581);
  assert.equal(parseFlow('0\u00a0semaine, 0\u00a0jour, 0\u00a0heure, 5\u00a0minutes').minutes, 5);
});

test('a stated zero, no delay, inapplicable service, missing and closure stay distinct', () => {
  for (const [raw, state, minutes] of [
    ['0 minutes', 'wait', 0], ['No Delay', 'no_delay', null], ['Aucun délai', 'no_delay', null],
    ['—', 'unknown', null], ['--', 'unknown', null], ['', 'unknown', null], ['5 or 10 minutes', 'unknown', null],
    ['-1 minute', 'unknown', null], ['Not Applicable', 'not_applicable', null],
    ['Ne s’applique pas', 'not_applicable', null], ['Temporarily Closed', 'closed', null], ['Fermé', 'closed', null],
  ]) {
    assert.equal(parseFlow(raw).state, state);
    assert.equal(parseFlow(raw).minutes, minutes);
  }
});

test('closing one vehicle flow preserves the other flow in the same direction', () => {
  const rawRows = enText.split('\n').map(line => line.startsWith('Pacific Highway;;')
    ? line.replace(';; 5 minutes;;', ';; Temporarily Closed;;') : line).join('\n');
  const port = parseFeed(rawRows, 'eng').find(p => p.id === 'pacific-highway');
  assert.equal(port.flows.CA.commercial.state, 'closed');
  assert.equal(port.flows.CA.traveler.minutes, 5);
});

test('a reverse-direction number in this Canada-only source still has unknown operational status', () => {
  const raw = enText.replace(';; --;;', ';; 20 minutes;;');
  const p = parseFeed(raw, 'eng').find(port => port.flows.US.commercial.raw === '20 minutes');
  assert.equal(p.flows.US.commercial.minutes, null);
  assert.equal(p.flows.US.commercial.state, 'unknown');
});

test('B.C. sample timestamp converts without guessing from the Washington side or local browser', () => {
  const expected = '2026-11-24T07:20:00.000Z';
  assert.equal(reportUtc('2026-11-24 00:20 PDT'), expected);
  assert.equal(reportUtc('2026-11-24 00:20 HAP'), expected);
  assert.equal(reportUtc('2026-11-24 00:20 PCT'), expected);
  for (const bad of ['2026-11-24 00:20 PST', '2026-11-24 00:20', '2026-11-31 00:20 PDT',
    '2026-11-24 26:20 PDT', '2026-01-01 00:20 PDT']) {
    assert.throws(() => reportUtc(bad), /source timestamp|calendar date/);
  }
});

test('column changes, malformed rows, duplicate, missing or misidentified pilot ports fail explicitly', () => {
  assert.throws(() => parseFeed(enText.replace('U.S. bound', 'Canada bound'), 'eng'), /header/);
  assert.throws(() => parseFeed(enText.replace(';; Surrey', '; Surrey'), 'eng'), /field count/);
  const douglas = enText.split('\n').find(row => row.startsWith('Douglas;;'));
  assert.throws(() => parseFeed(enText + '\n' + douglas, 'eng'), /Ambiguous/);
  assert.throws(() => parseFeed(enText.replace(douglas, ''), 'eng'), /Incomplete/);
  assert.throws(() => parseFeed(enText.replace('Huntingdon, BC/Sumas, WA', 'Surrey, BC/Blaine, WA'), 'eng'), /Ambiguous/);
  assert.deepEqual(parseFeed('\n' + enText + '\n\n', 'eng'), parseFeed(enText, 'eng'));
});

test('conflicting source times or language observations stop generation', () => {
  const en = parseFeed(enText, 'eng');
  assert.throws(() => reconcile(en, parseFeed(frText.replace('00:20 HAP', '01:20 HAP'), 'fra')), /disagree/);
  assert.throws(() => reconcile(en, parseFeed(frText.replace('Aucun délai', 'Fermé'), 'fra')), /disagree/);
});

test('both source adapters require an explicit, valid UTC collection clock', () => {
  for (const bad of [undefined, null, '', '2026-11-24', '2026-11-24T07:20:00', '2026-11-31T07:20:00Z',
    '2026-11-24T24:00:00Z']) {
    assert.ok(Number.isNaN(captureMilliseconds(bad)));
  }
  assert.equal(captureMilliseconds('2026-11-24T07:40:13.370287+00:00'), Date.UTC(2026, 10, 24, 7, 40, 13, 370));
  assert.equal(captureMilliseconds('2026-11-24T07:40:46.176841Z'), Date.UTC(2026, 10, 24, 7, 40, 46, 176));
});
