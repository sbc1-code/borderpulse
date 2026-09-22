import { HttpError } from './http.js';

export const LANE_TYPES = new Set(['standard', 'sentri', 'ready', 'pedestrian', 'commercial']);

function requiredString(value, name, max = 160) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > max) {
    throw new HttpError(400, `${name} is invalid`);
  }
  return value.trim();
}

export function validateSavedCrossingInput(body) {
  const portNumber = requiredString(body?.port_number, 'port_number', 32);
  const displayName = requiredString(body?.display_name, 'display_name');
  const laneType = requiredString(body?.lane_type, 'lane_type', 20);
  if (!LANE_TYPES.has(laneType)) throw new HttpError(400, 'lane_type is invalid');
  return {
    port_number: portNumber,
    display_name: displayName,
    direction: 'northbound',
    lane_type: laneType,
  };
}

function validDays(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 7) return false;
  const unique = new Set(value);
  return unique.size === value.length && value.every((day) => Number.isInteger(day) && day >= 0 && day <= 6);
}

function validTime(value) {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
}

function validTimeZone(value) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 80) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function validateAlertRuleInput(body) {
  const crossingId = requiredString(body?.saved_crossing_id, 'saved_crossing_id', 64);
  const threshold = body?.threshold_minutes;
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 600) {
    throw new HttpError(400, 'threshold_minutes is invalid');
  }
  if (!validDays(body?.days_of_week)) throw new HttpError(400, 'days_of_week is invalid');
  if (!validTime(body?.window_start) || !validTime(body?.window_end)) {
    throw new HttpError(400, 'alert window is invalid');
  }
  const timezone = requiredString(body?.timezone, 'timezone', 80);
  if (!validTimeZone(timezone)) throw new HttpError(400, 'timezone is invalid');
  return {
    saved_crossing_id: crossingId,
    threshold_minutes: threshold,
    days_of_week: body.days_of_week,
    window_start: body.window_start,
    window_end: body.window_end,
    timezone,
    enabled: body.enabled !== false,
  };
}

export function validateProfileInput(body) {
  const result = {};
  if (body && Object.hasOwn(body, 'language')) {
    if (body.language !== 'en' && body.language !== 'es') throw new HttpError(400, 'language is invalid');
    result.language = body.language;
  }
  if (body && Object.hasOwn(body, 'timezone')) {
    result.timezone = requiredString(body.timezone, 'timezone', 80);
    if (!validTimeZone(result.timezone)) throw new HttpError(400, 'timezone is invalid');
  }
  if (body && Object.hasOwn(body, 'email_opt_in')) {
    if (typeof body.email_opt_in !== 'boolean') throw new HttpError(400, 'email_opt_in is invalid');
    result.email_opt_in = body.email_opt_in;
    result.email_opt_in_at = body.email_opt_in ? new Date().toISOString() : null;
  }
  if (!Object.keys(result).length) throw new HttpError(400, 'No profile fields provided');
  return result;
}
