import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { captureMilliseconds } from './capture-time.mjs';

const fixtures = new URL('../fixtures/', import.meta.url);
const ports = new Map([
  ['Douglas', ['douglas', 'Surrey, BC/Blaine, WA']],
  ['Pacific Highway', ['pacific-highway', 'Surrey, BC/Blaine, WA']],
  ['Abbotsford-Huntingdon', ['abbotsford-huntingdon', 'Huntingdon, BC/Sumas, WA']],
]);
const headers = {
  eng: ['Customs Office', 'Location', 'Last updated', 'Commercial Flow - Canada bound',
    'Commercial Flow - U.S. bound', 'Travellers Flow - Canada bound', 'Travellers Flow - U.S. bound'],
  fra: ["Bureau de l'ASFC", 'Emplacement', 'Mis à jour', 'Débit / Expéditions commerciales - Vers le Canada',
    'Débit / Expéditions commerciales - Vers les États-Unis', 'Débit / Voyageurs - Vers le Canada',
    'Débit / Voyageurs - Vers les États-Unis'],
};

const statuses = new Map([
  ['no delay', 'no_delay'], ['aucun délai', 'no_delay'],
  ['not applicable', 'not_applicable'], ["ne s'applique pas", 'not_applicable'],
  ['closed', 'closed'], ['fermé', 'closed'], ['fermée', 'closed'],
  ['temporarily closed', 'closed'], ['temporairement fermé', 'closed'], ['temporairement fermée', 'closed'],
  ['--', 'unknown'], ['', 'unknown'],
]);

export function parseFlow(raw) {
  const label = raw.toLowerCase().replaceAll('’', "'").replace(/\s+/gu, ' ').trim();
  const state = statuses.get(label);
  if (state) return { state, minutes: null, raw };
  const simple = /^(\d+) minutes?$/.exec(label);
  const compound = /^(\d+) semaines?, (\d+) jours?, (\d+) heures?, (\d+) minutes?$/.exec(label);
  let minutes;
  if (simple) minutes = Number(simple[1]);
  if (compound) {
    const [weeks, days, hours, mins] = compound.slice(1).map(Number);
    minutes = weeks * 10080 + days * 1440 + hours * 60 + mins;
  }
  if (Number.isSafeInteger(minutes)) return { state: 'wait', minutes, raw };
  return { state: 'unknown', minutes: null, raw, reason: 'unrecognized_label' };
}

function parseFields(line) {
  const fields = line.split(';;').map(field => field.trim());
  if (fields.length !== 8 || fields.pop() !== '') {
    throw new Error('CBSA field count or trailing delimiter changed');
  }
  return fields;
}

// Only the three named lower-mainland B.C. ports are accepted. Their offsets
// after the March 2026 change are UTC−07. Avoid host time-zone database drift.
// https://news.gov.bc.ca/releases/2026AG0013-000209
export function reportUtc(raw) {
  const match = /^(\d{4}-\d\d-\d\d) ([01]\d|2[0-3]):([0-5]\d) (?:PDT|HAP|PCT)$/.exec(raw);
  if (!match || match[1] < '2026-03-09') throw new Error('Unverified B.C. source timestamp: ' + raw);
  const civil = match[1] + 'T' + match[2] + ':' + match[3] + ':00';
  const wallTime = new Date(civil + 'Z');
  if (!Number.isFinite(+wallTime) || wallTime.toISOString().slice(0, 19) !== civil) {
    throw new Error('Invalid B.C. calendar date: ' + raw);
  }
  return new Date(civil + '-07:00').toISOString();
}

export function parseFeed(text, lang) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
  if (!lines.length || !headers[lang] ||
      JSON.stringify(parseFields(lines[0])) !== JSON.stringify(headers[lang])) {
    throw new Error('Unexpected CBSA header in ' + lang);
  }
  const records = new Map();
  for (const line of lines.slice(1)) {
    const [name, location, rawTimestamp, freightCA, freightUS, travelerCA, travelerUS] = parseFields(line);
    const port = ports.get(name);
    if (!port) continue;
    const [id, expectedLocation] = port;
    if (records.has(id) || location !== expectedLocation) throw new Error('Ambiguous crossing: ' + name);
    // This collection documents entry into Canada. Preserve reverse fields for
    // inspection; a future change in them needs an independent source review.
    const unsupported = raw => ({ state: 'unknown', minutes: null, raw, reason: 'outside_source_coverage' });
    records.set(id, {
      id, name, location, rawTimestamp, reportedAt: reportUtc(rawTimestamp),
      flows: {
        CA: { traveler: parseFlow(travelerCA), commercial: parseFlow(freightCA) },
        US: { traveler: unsupported(travelerUS), commercial: unsupported(freightUS) },
      },
    });
  }
  if (records.size !== ports.size) throw new Error('Incomplete three-crossing sample: ' + lang);
  return [...records.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function semanticRecord(record) {
  return [record.id, record.location, record.reportedAt,
    ...Object.values(record.flows).flatMap(direction =>
      Object.values(direction).map(({ state, minutes, raw, reason }) =>
        [state, minutes, reason === 'unrecognized_label' || reason === 'outside_source_coverage' ? raw : null]))];
}

export function reconcile(english, french) {
  if (JSON.stringify(english.map(semanticRecord)) !== JSON.stringify(french.map(semanticRecord))) {
    throw new Error('English and French fixture observations disagree');
  }
  return english;
}

export async function buildSnapshot() {
  const capture = JSON.parse(await readFile(new URL('capture.json', fixtures), 'utf8'));
  const parsed = {};
  for (const feed of capture.feeds) {
    const fetched = captureMilliseconds(feed.fetchedAt);
    if (!Number.isFinite(fetched)) throw new Error('Invalid CBSA retrieval time: ' + feed.lang);
    const bytes = await readFile(new URL('cbsa-' + feed.lang + '.csv', fixtures));
    if (createHash('sha256').update(bytes).digest('hex') !== feed.sha256Subset) {
      throw new Error('Source excerpt hash mismatch: ' + feed.lang);
    }
    parsed[feed.lang] = parseFeed(bytes.toString('utf8'), feed.lang);
    if (parsed[feed.lang].some(crossing => Date.parse(crossing.reportedAt) > fetched)) {
      throw new Error('Source report is later than collection time: ' + feed.lang);
    }
  }
  const english = capture.feeds.find(feed => feed.lang === 'eng');
  return {
    sourceUrl: english.sourceUrl, fetchedAt: english.fetchedAt, snapshotOnly: true,
    crossings: reconcile(parsed.eng, parsed.fra),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(await buildSnapshot(), null, 2));
}
