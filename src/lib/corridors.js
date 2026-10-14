import { availableLaneWait } from './crossingAvailability.js';
import { parseOperatingHours, nowInTz, getPortTimezone } from '../components/utils/crossingMeta.js';
import { freshnessOf, FRESHNESS } from './trustState.js';

// Explicit canonical ports: state boundaries do not define a local journey.
export const CORRIDORS = [
  { id: 'el-paso-juarez', name: 'El Paso–Juárez', ports: ['240202', '240201', '240104', '240204', '240801', '240401'] },
  { id: 'san-diego-tijuana', name: 'San Diego–Tijuana', ports: ['250401', '250601', '250501'] },
  { id: 'calexico-mexicali', name: 'Calexico–Mexicali', ports: ['250302', '250301'] },
  { id: 'nogales', name: 'Nogales', ports: ['260401', '260402', '260403'] },
  { id: 'laredo', name: 'Laredo–Nuevo Laredo', ports: ['230401', '230402', '230403', '230404'] },
  { id: 'brownsville', name: 'Brownsville–Matamoros', ports: ['535504', '535502', '535501', '535503'] },
  { id: 'mcallen-reynosa', name: 'McAllen–Reynosa', ports: ['230501', '230502', '230503'] },
  { id: 'eagle-pass', name: 'Eagle Pass–Piedras Negras', ports: ['230301', '230302'] },
  { id: 'progreso', name: 'Progreso–Nuevo Progreso', ports: ['230901', '230902'] },
];

export const LOCAL_LANES = [
  { key: 'passenger_standard', en: 'Standard passenger', es: 'Auto estándar' },
  { key: 'passenger_ready', en: 'Ready Lane', es: 'Ready Lane' },
  { key: 'passenger_sentri', en: 'SENTRI', es: 'SENTRI' },
  { key: 'pedestrian_standard', en: 'Pedestrian', es: 'Peatones' },
];

export function corridorFor(id) {
  return CORRIDORS.find(c => c.id === id) || null;
}

export function isOperatingNow(crossing, now = Date.now()) {
  if ((crossing?.port_status || '').trim().toLowerCase() !== 'open') return false;
  const schedule = parseOperatingHours(crossing.hours);
  if (schedule.kind === 'always') return true;
  if (schedule.kind !== 'windows') return false;
  const timeZone = getPortTimezone(crossing);
  const date = new Date(now);
  const { day, hour } = nowInTz(timeZone, date);
  const minute = Number(new Intl.DateTimeFormat('en-US', { timeZone, minute: 'numeric' }).format(date));
  return schedule.windowsByDay[day].some(w => hour * 60 + minute >= w.start && hour * 60 + minute < w.end);
}

export function localComparison(crossings, corridorId, laneKey, fetchedAt, now = Date.now()) {
  const corridor = corridorFor(corridorId);
  if (!corridor || !LOCAL_LANES.some(l => l.key === laneKey)) return { rows: [], shortest: null };
  const rows = corridor.ports.map(port => {
    const crossing = crossings.find(c => String(c.port_number) === port);
    if (!crossing) return null;
    const open = isOperatingNow(crossing, now);
    const wait = open ? availableLaneWait(crossing, laneKey) : null;
    let reason = null;
    if (wait == null) {
      if ((crossing.port_status || '').trim().toLowerCase() === 'closed') reason = 'port_closed';
      else if (!open) reason = parseOperatingHours(crossing.hours).kind === 'unknown' ? 'hours_unknown' : 'outside_hours';
      else if (crossing.lanes?.[laneKey]?.lanes_open === 0) reason = 'lane_closed';
      else reason = 'no_report';
    }
    return { crossing, wait, reason };
  }).filter(Boolean);
  const eligible = rows.filter(r => r.wait != null).sort((a, b) => a.wait - b.wait);
  const freshness = freshnessOf(fetchedAt, now).state;
  // Never turn a stale/unknown/future retrieval into advice. Lane report times
  // remain raw text in the UI; a recent retrieval does not prove a recent report.
  const usable = [FRESHNESS.FRESH, FRESHNESS.AGING].includes(freshness)
    && new Date(fetchedAt).getTime() <= now;
  const tied = eligible.length > 1 && eligible[0].wait === eligible[1].wait;
  return { rows, shortest: usable && eligible.length >= 2 && !tied ? eligible[0] : null };
}
