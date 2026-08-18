export function getPortStatus(crossing) {
  const raw = (crossing?.port_status || '').trim().toLowerCase();
  if (raw === 'open') return 'open';
  if (raw === 'closed') return 'closed';
  return 'unknown';
}

export function hasOperationalAdvisory(crossing) {
  return getPortStatus(crossing) === 'closed' || Boolean((crossing?.construction_notice || '').trim());
}

export function getOperationalNotice(crossing) {
  const note = (crossing?.construction_notice || '').replace(/\s+/g, ' ').trim();
  return note || null;
}

export function getAdvisoryType(crossing) {
  if (getPortStatus(crossing) === 'closed') return 'closure';

  const note = getOperationalNotice(crossing);
  if (!note) return null;

  if (/construct|construction|work|lane reduction|delay/i.test(note)) return 'construction';
  if (/closed|closure|saturday|sunday|hours|midnight|daily/i.test(note)) return 'hours';
  if (/ready lane|sentri|fast|pedestrian|cargo|commercial/i.test(note)) return 'lane';
  return 'notice';
}

const MOUNTAIN_TZ_PORTS = [
  'El Paso',
  'Bridge of the Americas',
  'Paso Del Norte',
  'Ysleta',
  'Stanton',
  'Tornillo',
  'Marcelino Serna',
];

export function getPortTimezone(crossing) {
  const name = `${crossing?.name || ''} ${crossing?.port_name || ''}`;
  if (crossing?.state === 'CA') return 'America/Los_Angeles';
  if (crossing?.state === 'AZ') return 'America/Phoenix';
  if (crossing?.state === 'NM') return 'America/Denver';
  if (crossing?.state === 'TX' && MOUNTAIN_TZ_PORTS.some((label) => name.includes(label))) {
    return 'America/Denver';
  }
  return 'America/Chicago';
}

// Aggregate by_hour buckets are stored in PORT-LOCAL day/hour (see
// scripts/build-aggregates.mjs). Any "which bucket is it right now" lookup
// must be computed in the port's timezone, not the browser's: a viewer in
// El Paso looking at San Ysidro is an hour off otherwise, and a remote
// viewer can land on the wrong day entirely.
const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const tzFormatterCache = new Map();

function tzFormatter(tz) {
  if (!tzFormatterCache.has(tz)) {
    tzFormatterCache.set(
      tz,
      new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        weekday: 'short',
        hour: 'numeric',
        hourCycle: 'h23',
      }),
    );
  }
  return tzFormatterCache.get(tz);
}

export function nowInTz(tz, date = new Date()) {
  const parts = tzFormatter(tz).formatToParts(date);
  let day = 0;
  let hour = 0;
  for (const p of parts) {
    if (p.type === 'weekday') day = WEEKDAY_INDEX[p.value] ?? 0;
    if (p.type === 'hour') hour = Number(p.value) % 24;
  }
  return { day, hour };
}

export function nowInPortTz(crossing, date = new Date()) {
  return nowInTz(getPortTimezone(crossing), date);
}

const DAY_NAMES = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  weds: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

const TIME_RANGE_RE = /((?:\d{1,2})(?::\d{2})?\s*(?:am|pm)|midnight)\s*(?:-|–|—|to)\s*((?:\d{1,2})(?::\d{2})?\s*(?:am|pm)|midnight)/i;

function parseTimeToken(token, position = 'start') {
  const clean = token.trim().toLowerCase();
  if (clean === 'midnight') return position === 'start' ? 0 : 24 * 60;

  const match = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (!match) return null;

  let hour = Number(match[1]) % 12;
  const minute = Number(match[2] || 0);
  if (match[3] === 'pm') hour += 12;
  return hour * 60 + minute;
}

function parseDayToken(token) {
  return DAY_NAMES[token.trim().toLowerCase()] ?? null;
}

function expandDayRange(startToken, endToken) {
  const start = parseDayToken(startToken);
  const end = parseDayToken(endToken);
  if (start == null || end == null) return [];
  const days = [];
  let day = start;
  do {
    days.push(day);
    day = (day + 1) % 7;
  } while (day !== (end + 1) % 7 && days.length <= 7);
  return days;
}

function parseDaySelector(prefix) {
  const clean = prefix.trim().replace(/[:;,]+$/, '').trim();
  if (!clean) return [0, 1, 2, 3, 4, 5, 6];

  const normalized = clean.replace(/\s+to\s+/i, '-').replace(/\s*[-–—]\s*/g, '-');
  const tokens = normalized.split('-').map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 1) {
    const day = parseDayToken(tokens[0]);
    return day == null ? null : [day];
  }
  if (tokens.length === 2) return expandDayRange(tokens[0], tokens[1]);
  return null;
}

function addWindow(windowsByDay, day, start, end) {
  if (start == null || end == null || start < 0 || end < 0 || start > 24 * 60 || end > 24 * 60) return false;
  if (start === end) return false;

  if (end > start) {
    windowsByDay[day].push({ start, end });
    return true;
  }

  // A closing time earlier than the opening time is an overnight schedule.
  windowsByDay[day].push({ start, end: 24 * 60 });
  windowsByDay[(day + 1) % 7].push({ start: 0, end });
  return true;
}

function parseScheduleSegment(segment) {
  const match = segment.match(TIME_RANGE_RE);
  if (!match) return null;

  const prefix = segment.slice(0, match.index).trim();
  const days = parseDaySelector(prefix);
  if (!days) return null;

  const start = parseTimeToken(match[1], 'start');
  const end = parseTimeToken(match[2], 'end');
  if (start == null || end == null) return null;
  return { days, start, end };
}

export function parseOperatingHours(hours) {
  const clean = String(hours || '').trim();
  const windowsByDay = Array.from({ length: 7 }, () => []);
  if (!clean) return { kind: 'unknown', windowsByDay };

  if (/^(?:open\s*)?(?:24\s*(?:hrs?|hours?)\s*(?:\/|per\s*)?day|24\/7|always\s*open)$/i.test(clean)) {
    for (const dayWindows of windowsByDay) dayWindows.push({ start: 0, end: 24 * 60 });
    return { kind: 'always', windowsByDay };
  }

  // A seasonal label without an active date or an explicit day binding is not
  // safe to interpret as today's schedule. Keep the heatmap, but suppress the
  // recommendation until the feed gives us an unambiguous window.
  if (/season|holiday|varies|call for|appointment/i.test(clean) && !/^(?:sun|mon|tue|wed|thu|fri|sat|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(clean)) {
    return { kind: 'unknown', windowsByDay };
  }

  const segments = clean
    .replace(/\r?\n/g, ';')
    .split(/[;|]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (!segments.length) return { kind: 'unknown', windowsByDay };

  for (const segment of segments) {
    const parsed = parseScheduleSegment(segment);
    if (!parsed) return { kind: 'unknown', windowsByDay };
    for (const day of parsed.days) {
      if (!addWindow(windowsByDay, day, parsed.start, parsed.end)) {
        return { kind: 'unknown', windowsByDay: Array.from({ length: 7 }, () => []) };
      }
    }
  }

  if (!windowsByDay.some((dayWindows) => dayWindows.length)) {
    return { kind: 'unknown', windowsByDay };
  }
  return { kind: 'windows', windowsByDay };
}

export function isHourWithinOperatingHours(crossing, day, hour) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return false;
  const schedule = parseOperatingHours(crossing?.hours);
  if (schedule.kind === 'always') return true;
  if (schedule.kind !== 'windows' || !Number.isInteger(day) || day < 0 || day > 6) return false;

  // Aggregate cells represent a full clock hour. Require the full hour to be
  // inside the published window so a 6:30 AM opening cannot produce a "6 AM"
  // recommendation, and a 10 PM closing cannot produce a "10 PM" one.
  const hourStart = hour * 60;
  const hourEnd = hourStart + 60;
  return schedule.windowsByDay[day].some(({ start, end }) => hourStart >= start && hourEnd <= end);
}

function currentMinutesInZone(timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    timeZone,
  });
  const parts = formatter.formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  return hour * 60 + minute;
}

function formatMinutes(minutes, language) {
  if (minutes === 24 * 60) {
    return language === 'en' ? 'midnight' : 'medianoche';
  }

  const hour24 = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  const suffix = hour24 >= 12 ? (language === 'en' ? 'PM' : 'p. m.') : (language === 'en' ? 'AM' : 'a. m.');
  const hour12 = hour24 % 12 || 12;
  if (minute === 0) return `${hour12} ${suffix}`;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function getHoursSummary(crossing, language = 'en') {
  const hours = (crossing?.hours || '').trim();
  if (!hours) {
    return language === 'en' ? 'Official hours unavailable' : 'Horario oficial no disponible';
  }

  const schedule = parseOperatingHours(hours);
  if (schedule.kind === 'unknown') {
    return `${language === 'en' ? 'Official hours' : 'Horario oficial'}: ${hours}`;
  }

  if (schedule.kind === 'always') {
    return language === 'en' ? 'Open 24 hours' : 'Abierto 24 horas';
  }

  const timeZone = getPortTimezone(crossing);
  const now = currentMinutesInZone(timeZone);
  const day = nowInTz(timeZone).day;
  const activeWindow = schedule.windowsByDay[day].find(({ start, end }) => now >= start && now < end);
  const portStatus = getPortStatus(crossing);

  if (portStatus === 'closed') {
    const nextOpening = schedule.windowsByDay[day].find(({ start }) => start > now)?.start
      ?? schedule.windowsByDay[(day + 1) % 7][0]?.start;
    return language === 'en'
      ? `Closed now${nextOpening != null ? ` · next opening ${formatMinutes(nextOpening, language)}` : ''}`
      : `Cerrado ahora${nextOpening != null ? ` · próxima apertura ${formatMinutes(nextOpening, language)}` : ''}`;
  }

  if (portStatus === 'open' && activeWindow) {
    return language === 'en'
      ? `Open now · next closing ${formatMinutes(activeWindow.end, language)}`
      : `Abierto ahora · próximo cierre ${formatMinutes(activeWindow.end, language)}`;
  }

  return `${language === 'en' ? 'Official hours' : 'Horario oficial'}: ${hours}`;
}
