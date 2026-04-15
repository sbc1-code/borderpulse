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

function getPortTimezone(crossing) {
  const name = `${crossing?.name || ''} ${crossing?.port_name || ''}`;
  if (crossing?.state === 'CA') return 'America/Los_Angeles';
  if (crossing?.state === 'AZ') return 'America/Phoenix';
  if (crossing?.state === 'NM') return 'America/Denver';
  if (crossing?.state === 'TX' && MOUNTAIN_TZ_PORTS.some((label) => name.includes(label))) {
    return 'America/Denver';
  }
  return 'America/Chicago';
}

function parseTimeToken(token) {
  const clean = token.trim().toLowerCase();
  if (clean === 'midnight') return 24 * 60;

  const match = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (!match) return null;

  let hour = Number(match[1]) % 12;
  const minute = Number(match[2] || 0);
  if (match[3] === 'pm') hour += 12;
  return hour * 60 + minute;
}

function parseHours(hours) {
  if (!hours) return null;
  const clean = hours.trim();
  if (/24\s*hrs\/day/i.test(clean)) return { kind: 'always' };

  const parts = clean.split('-');
  if (parts.length !== 2) return null;

  const start = parseTimeToken(parts[0]);
  const end = parseTimeToken(parts[1]);
  if (start == null || end == null) return null;

  return { kind: 'window', start, end };
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

  const schedule = parseHours(hours);
  if (!schedule) {
    return `${language === 'en' ? 'Official hours' : 'Horario oficial'}: ${hours}`;
  }

  if (schedule.kind === 'always') {
    return language === 'en' ? 'Open 24 hours' : 'Abierto 24 horas';
  }

  const timeZone = getPortTimezone(crossing);
  const now = currentMinutesInZone(timeZone);
  const isWithinSchedule = now >= schedule.start && now < schedule.end;
  const portStatus = getPortStatus(crossing);

  if (portStatus === 'closed') {
    return language === 'en'
      ? `Closed now · next opening ${formatMinutes(schedule.start, language)}`
      : `Cerrado ahora · próxima apertura ${formatMinutes(schedule.start, language)}`;
  }

  if (portStatus === 'open' && isWithinSchedule) {
    return language === 'en'
      ? `Open now · next closing ${formatMinutes(schedule.end, language)}`
      : `Abierto ahora · próximo cierre ${formatMinutes(schedule.end, language)}`;
  }

  return `${language === 'en' ? 'Official hours' : 'Horario oficial'}: ${hours}`;
}
