const LANE_KEYS = {
  standard: 'passenger_standard',
  sentri: 'passenger_sentri',
  ready: 'passenger_ready',
  pedestrian: 'pedestrian_standard',
  commercial: 'commercial_standard',
};

const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function parseClock(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function localTimeParts(now, timeZone) {
  let parts;
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
  } catch {
    return null;
  }
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const day = WEEKDAYS[values.weekday];
  const hour = Number(values.hour);
  const minute = Number(values.minute);
  if (!Number.isInteger(day) || !Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  return { day, minuteOfDay: hour * 60 + minute };
}

export function isWithinAlertWindow({ now, timeZone, daysOfWeek, windowStart, windowEnd }) {
  const local = localTimeParts(now, timeZone);
  const start = parseClock(windowStart);
  const end = parseClock(windowEnd);
  if (!local || start == null || end == null || !Array.isArray(daysOfWeek)) return false;
  const days = new Set(daysOfWeek);
  if (start === end) return days.has(local.day);
  if (start < end) return days.has(local.day) && local.minuteOfDay >= start && local.minuteOfDay <= end;
  if (local.minuteOfDay >= start) return days.has(local.day);
  if (local.minuteOfDay <= end) return days.has((local.day + 6) % 7);
  return false;
}

export function observedMinutes(crossing, laneType) {
  const laneKey = LANE_KEYS[laneType];
  const value = laneKey ? crossing?.lanes?.[laneKey]?.delay_minutes : null;
  if (Number.isInteger(value) && value >= 0) return value;
  if (laneType === 'standard' && Number.isInteger(crossing?.current_wait_time) && crossing.current_wait_time >= 0) {
    return crossing.current_wait_time;
  }
  return null;
}

export function evaluateAlertRule({ rule, crossing, snapshotAt, now = new Date(), maxAgeMinutes = 45 }) {
  const snapshotMs = Date.parse(snapshotAt || '');
  const nowMs = now.getTime();
  if (!Number.isFinite(snapshotMs)) return { shouldSend: false, reason: 'snapshot_timestamp_invalid' };
  const ageMinutes = (nowMs - snapshotMs) / 60000;
  if (ageMinutes < 0) return { shouldSend: false, reason: 'snapshot_timestamp_in_future', ageMinutes };
  if (ageMinutes > maxAgeMinutes) return { shouldSend: false, reason: 'snapshot_stale', ageMinutes };
  if (!crossing) return { shouldSend: false, reason: 'crossing_not_found' };
  const minutes = observedMinutes(crossing, rule.lane_type);
  if (minutes == null) return { shouldSend: false, reason: 'lane_data_unavailable', ageMinutes };
  if (!isWithinAlertWindow({ now, timeZone: rule.timezone, daysOfWeek: rule.days_of_week, windowStart: rule.window_start, windowEnd: rule.window_end })) {
    return { shouldSend: false, reason: 'outside_schedule', observedMinutes: minutes, ageMinutes };
  }
  if (minutes > rule.threshold_minutes) {
    return { shouldSend: false, reason: 'above_threshold', observedMinutes: minutes, ageMinutes };
  }
  return { shouldSend: true, reason: null, observedMinutes: minutes, ageMinutes };
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function laneLabel(laneType, language) {
  const labels = language === 'es'
    ? { standard: 'Pasajeros estándar', sentri: 'SENTRI', ready: 'Ready Lane', pedestrian: 'Peatón', commercial: 'Comercial' }
    : { standard: 'Passenger standard', sentri: 'SENTRI', ready: 'Ready Lane', pedestrian: 'Pedestrian', commercial: 'Commercial' };
  return labels[laneType] || laneType;
}

export function buildAlertEmail({ profile, savedCrossing, rule, observed, snapshotAt, appUrl }) {
  const language = profile.language === 'es' ? 'es' : 'en';
  const name = escapeHtml(savedCrossing.display_name);
  const lane = escapeHtml(laneLabel(savedCrossing.lane_type, language));
  const observedText = `${observed} ${language === 'es' ? 'minutos' : 'minutes'}`;
  const sourceTime = new Date(snapshotAt).toLocaleString(language === 'es' ? 'es-MX' : 'en-US', {
    timeZone: rule.timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const safeSourceTime = escapeHtml(sourceTime);
  const manageUrl = `${appUrl.replace(/\/$/, '')}/plus`;
  const subjectName = String(savedCrossing.display_name || '').replace(/[\r\n]/g, ' ').slice(0, 160);
  const subject = language === 'es'
    ? `Border Pulse: ${subjectName} está en ${observedText}`
    : `Border Pulse: ${subjectName} is at ${observedText}`;
  const text = language === 'es'
    ? `Border Pulse observó ${observedText} en ${savedCrossing.display_name} (${laneLabel(savedCrossing.lane_type, language)}), hacia Estados Unidos. La muestra de CBP fue tomada ${sourceTime}. Esto es una observación, no una garantía. Administra tus alertas: ${manageUrl}`
    : `Border Pulse observed ${observedText} at ${savedCrossing.display_name} (${laneLabel(savedCrossing.lane_type, language)}), northbound. The CBP sample was taken ${sourceTime}. This is an observation, not a guarantee. Manage your alerts: ${manageUrl}`;
  const html = language === 'es'
    ? `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#172033"><h1>Border Pulse</h1><p>Tu alerta se activó.</p><p><strong>${name}</strong><br>${lane}<br><strong>${escapeHtml(observedText)}</strong> hacia Estados Unidos</p><p>CBP tomó esta muestra: ${safeSourceTime} (${escapeHtml(rule.timezone)}).</p><p>Es una observación, no una garantía de espera o llegada.</p><p><a href="${escapeHtml(manageUrl)}">Administrar mis alertas</a></p><p style="font-size:12px;color:#64748b">Fuente: U.S. Customs and Border Protection. Border Pulse no controla las condiciones de la frontera.</p></div>`
    : `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#172033"><h1>Border Pulse</h1><p>Your alert was triggered.</p><p><strong>${name}</strong><br>${lane}<br><strong>${escapeHtml(observedText)}</strong> northbound</p><p>CBP took this sample at ${safeSourceTime} (${escapeHtml(rule.timezone)}).</p><p>This is an observation, not a guarantee of wait or arrival time.</p><p><a href="${escapeHtml(manageUrl)}">Manage my alerts</a></p><p style="font-size:12px;color:#64748b">Source: U.S. Customs and Border Protection. Border Pulse does not control border conditions.</p></div>`;
  return { subject, text, html };
}

export async function sendResendEmail({ apiKey, from, to, subject, text, html, fetchImpl = fetch }) {
  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  });
  let payload = null;
  try { payload = await response.json(); } catch {}
  if (!response.ok) throw new Error(payload?.message || `Email provider returned ${response.status}`);
  if (!payload?.id) throw new Error('Email provider returned no message ID');
  return payload.id;
}
