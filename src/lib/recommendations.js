import { isHourWithinOperatingHours } from '../components/utils/crossingMeta.js';
import { isSparseCell } from './aggregates.js';

export function eligibleHourEntries(crossing, byHour, day) {
  if (!Array.isArray(byHour)) return [];
  return byHour
    .filter((entry) => entry.day === day && !isSparseCell(entry))
    .filter((entry) => isHourWithinOperatingHours(crossing, entry.day, entry.hour))
    .sort((a, b) => a.median - b.median || a.hour - b.hour);
}

export function pickLightestHour(crossing, byHour, day) {
  return eligibleHourEntries(crossing, byHour, day)[0] || null;
}

export function isAnyDayHourEligible(crossing, hour) {
  return Array.from({ length: 7 }, (_, day) => day)
    .some((day) => isHourWithinOperatingHours(crossing, day, hour));
}
