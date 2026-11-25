import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { captureMilliseconds } from './capture-time.mjs';

const source = new URL('../fixtures/cbp-us-bound.json', import.meta.url);
const expected = new Map([
  ['300401', ['pacific-highway', 'Blaine', 'Pacific Highway']],
  ['300402', ['douglas', 'Blaine', 'Peace Arch']],
  ['300901', ['abbotsford-huntingdon', 'Sumas', '']],
]);
const washingtonClock = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const sourceUrl = 'https://bwt.cbp.gov/api/waittimes';
const staleAfterMinutes = 120; // Review policy at time of capture, not a CBP service standard.

function nonnegativeInteger(value) {
  if ((typeof value !== 'string' && typeof value !== 'number') || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}

function localLaneTime(date, clock, rawClock, fetched) {
  // CBP gives a date on the port entry and a separate time-only string on the lane.
  // This bounded fixture resolves same-day updates and bounded midnight rollovers (up to 6 hours
  // before the port clock) preceding the port clock.
  const dateMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  const timeMatch = /^At (\d{1,2}):(\d{2}) (am|pm) (PST|PDT)$/.exec(rawClock);
  const portClock = /^(\d{2}):(\d{2}):(\d{2})$/.exec(clock);
  if (!dateMatch || !timeMatch || !portClock) return null;
  const [, month, day, year] = dateMatch;
  const [, hour, minute, ampm, zone] = timeMatch;
  if (+hour < 1 || +hour > 12 || +minute > 59 || +portClock[1] > 23 ||
      +portClock[2] > 59 || +portClock[3] > 59) return null;
  const hour24 = +hour % 12 + (ampm === 'pm' ? 12 : 0);
  const laneMinutes = hour24 * 60 + +minute;
  const portMinutes = +portClock[1] * 60 + +portClock[2];
  const offset = zone === 'PST' ? '-08:00' : '-07:00';
  const portDatePrefix = year + '-' + month + '-' + day + 'T';
  const portStamp = new Date(portDatePrefix + clock + offset);
  let laneYear = year, laneMonth = month, laneDay = day;
  if (laneMinutes > portMinutes) {
    const prev = new Date(Date.UTC(+year, +month - 1, +day) - 86400000);
    laneYear = String(prev.getUTCFullYear()).padStart(4, '0');
    laneMonth = String(prev.getUTCMonth() + 1).padStart(2, '0');
    laneDay = String(prev.getUTCDate()).padStart(2, '0');
  }
  const laneDatePrefix = laneYear + '-' + laneMonth + '-' + laneDay + 'T';
  const stamp = new Date(laneDatePrefix + String(hour24).padStart(2, '0') + ':' + minute + ':00' + offset);
  if (!Number.isFinite(+stamp) || !Number.isFinite(+portStamp) || +portStamp > fetched) return null;
  const diffMs = +portStamp - +stamp;
  if (diffMs < 0 || (laneMinutes > portMinutes && diffMs > 6 * 3600 * 1000)) return null;
  function matchesLocal(instant, yy, mmStr, ddStr, hh, mm) {
    const local = Object.fromEntries(washingtonClock.formatToParts(instant).map(p => [p.type, p.value]));
    return local.year === yy && local.month === mmStr && local.day === ddStr &&
      +local.hour === hh && local.minute === mm;
  }
  // When the two readings straddle a clock change, this same-offset fixture
  // cannot establish their order. Leave the observation unknown.
  return matchesLocal(stamp, laneYear, laneMonth, laneDay, hour24, minute) &&
    matchesLocal(portStamp, year, month, day, +portClock[1], portClock[2]) ? stamp : null;
}

export function normalizeLane(lane, port, fetchedAt) {
  const raw = String(lane?.operational_status ?? '');
  const result = { state: 'unknown', minutes: null, raw, reportedAt: null, ageMinutes: null };
  const fetched = captureMilliseconds(fetchedAt);
  if (!Number.isFinite(fetched) || port.port_status !== 'Open') return result;
  const lanesOpen = lane?.lanes_open ?? '';
  const openCount = nonnegativeInteger(lanesOpen);
  if (lanesOpen !== '' && openCount === null) return result;
  if (raw === 'N/A') return openCount > 0 ? result : { ...result, state: 'not_applicable' };
  const stamp = localLaneTime(port.date, port.time, lane?.update_time ?? '', fetched);
  if (!stamp) return result;
  const age = (fetched - stamp.valueOf()) / 60000;
  if (age < 0) return result;
  const normalized = { ...result, reportedAt: stamp.toISOString(), ageMinutes: Math.round(age * 10) / 10 };
  if (raw === 'Lanes Closed') {
    if (openCount > 0) return normalized;
    return { ...normalized, state: age > staleAfterMinutes ? 'stale' : 'closed' };
  }
  if (!['no delay', 'delay'].includes(raw.toLowerCase())) return normalized;
  if (openCount === 0) return normalized;
  const minutes = nonnegativeInteger(lane.delay_minutes);
  if (minutes === null) return normalized;
  return { ...normalized, state: age > staleAfterMinutes ? 'stale' : 'reported_wait', minutes };
}

export function normalizeSnapshot(fixture) {
  if (fixture.sourceUrl !== sourceUrl || !Number.isFinite(captureMilliseconds(fixture.retrievedAt))) {
    throw new Error('Unexpected CBP source or retrieval time');
  }
  const crossings = [...expected].map(([number, [id, name, crossing]]) => {
    const matches = fixture.ports.filter(port => port.port_number === number);
    if (matches.length !== 1) throw new Error('Missing or duplicate CBP crossing ' + number);
    const [port] = matches;
    if (port.border !== 'Canadian Border' || port.port_name !== name || port.crossing_name !== crossing) {
      throw new Error('CBP port identity changed for ' + number);
    }
    return {
      id, portNumber: number,
      traveler: normalizeLane(port.passenger_vehicle_lanes?.standard_lanes, port, fixture.retrievedAt),
      commercial: normalizeLane(port.commercial_vehicle_lanes?.standard_lanes, port, fixture.retrievedAt),
    };
  });
  return { sourceUrl, fetchedAt: fixture.retrievedAt, laneType: 'General (standard)',
    trialStaleAfterMinutes: staleAfterMinutes, snapshotOnly: true, crossings };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const fixture = JSON.parse(await readFile(source, 'utf8'));
  console.log(JSON.stringify(normalizeSnapshot(fixture), null, 2));
}
