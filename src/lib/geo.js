// Haversine distance + nearest-crossing helpers.
//
// Coordinates are approximate facility/catalog points, not entrance pins.
// Named US facility representatives and directory targets are recorded in
// docs/BORDERWIDE-GEOGRAPHY-REVIEW.md. Morley retains an explicitly limited
// contextual approximation; two unresolved/aggregate records are withheld. Used for
// proximity-ranking ("nearest crossings") and the geolocation prompt — not
// for navigation, not for southbound estimates.

import { canonicalPortNumber } from './portIdentity.js';

export const WITHHELD_LOCATION_IDS = new Set(['240221', '260802']);

const PORT_COORDS = {
  // California
  '250201': { lat: 32.7184, lng: -114.7282 }, // Andrade — CA0621
  '250301': { lat: 32.6798, lng: -115.3828 }, // Calexico - East — CA0507
  '250302': { lat: 32.6656, lng: -115.4962 }, // Calexico - West — CA0518
  '250401': { lat: 32.5437, lng: -117.0287 }, // San Ysidro — CA0335
  '250501': { lat: 32.5769, lng: -116.6275 }, // Tecate — CA0801
  '250601': { lat: 32.5527, lng: -116.9391 }, // Otay Mesa — CA0267
  // Arizona
  '260101': { lat: 31.3352, lng: -109.5602 }, // Douglas — AZ0611
  '260201': { lat: 31.8816, lng: -112.8161 }, // Lukeville — AZ0670
  '260301': { lat: 31.3346, lng: -109.9483 }, // Naco — AZ0681
  '260401': { lat: 31.3329, lng: -110.9428 }, // Nogales - Deconcini — AZ0551
  '260402': { lat: 31.3351, lng: -110.9677 }, // Nogales - Mariposa — AZ0334
  '260403': { lat: 31.3343, lng: -110.9408 }, // Morley — limited contextual point; do not copy AZ0553's Deconcini duplicate
  '260801': { lat: 32.4844, lng: -114.7799 }, // San Luis - San Luis I
  // New Mexico
  '240601': { lat: 31.7838, lng: -107.6279 }, // Columbus — NM8015 site, not town-geocoded building rows
  '240801': { lat: 31.7860, lng: -106.6799 }, // Santa Teresa — NM0560
  // Texas - El Paso area
  '240201': { lat: 31.7676, lng: -106.4509 }, // BOTA — TX0961
  '240202': { lat: 31.7510, lng: -106.4869 }, // PDN — TX0986
  '240104': { lat: 31.6720, lng: -106.3354 }, // Ysleta — TX0963
  '240204': { lat: 31.7498, lng: -106.4835 }, // El Paso - Stanton DCL
  '240301': { lat: 29.5623, lng: -104.3911 }, // Presidio
  '240401': { lat: 31.4352, lng: -106.1424 }, // Tornillo — TX0711
  'l24501': { lat: 31.2748, lng: -105.8536 }, // Fort Hancock — TX0705
  // Texas - Eagle Pass / Del Rio / Laredo
  '230201': { lat: 29.3336, lng: -100.9186 }, // Del Rio — TX0409
  '230301': { lat: 28.7054, lng: -100.5059 }, // Eagle Pass I — TX0201 administration facility
  '230302': { lat: 28.6979, lng: -100.5094 }, // Eagle Pass - Bridge II
  '230401': { lat: 27.4997, lng: -99.5075 }, // Laredo I — directory target
  '230402': { lat: 27.5017, lng: -99.5027 }, // Laredo II — directory target
  '230403': { lat: 27.7010, lng: -99.7423 }, // Colombia — TX0306
  '230404': { lat: 27.5977, lng: -99.5343 }, // World Trade — TX0730 administration facility
  // Texas - Rio Grande Valley
  '230501': { lat: 26.1007, lng: -98.2665 }, // Hidalgo — TX1782
  '230502': { lat: 26.0669, lng: -98.2052 }, // Hidalgo/Pharr - Pharr
  '230503': { lat: 26.1453, lng: -98.3121 }, // Anzalduas — TX0610 US facility
  '230701': { lat: 26.3680, lng: -98.8016 }, // Rio Grande City — TX2348
  '230901': { lat: 26.0621, lng: -97.9500 }, // Progreso — directory target
  '230902': { lat: 26.0691, lng: -98.0738 }, // Progreso - Donna
  '231001': { lat: 26.4039, lng: -99.0190 }, // Roma — directory target
  '535501': { lat: 25.8937, lng: -97.5051 }, // Brownsville - B&M — TX0312
  '535502': { lat: 25.8858, lng: -97.4764 }, // Brownsville - Veterans International
  '535503': { lat: 26.0291, lng: -97.7388 }, // Brownsville - Los Indios
  '535504': { lat: 25.8988, lng: -97.4976 }, // Brownsville - Gateway
};

const TO_RAD = Math.PI / 180;
const EARTH_RADIUS_KM = 6371;
const KM_PER_MILE = 1.609344;

/**
 * Haversine great-circle distance in kilometers (lat/lng in decimal degrees).
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * TO_RAD;
  const dLng = (lng2 - lng1) * TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * TO_RAD) * Math.cos(lat2 * TO_RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function kmToMiles(km) {
  if (km == null || !Number.isFinite(km)) return null;
  return km / KM_PER_MILE;
}

/**
 * Crossing coordinates: prefer fields on the crossing object, fall back to
 * the PORT_COORDS table by port_number.
 */
export function getCrossingCoords(crossing) {
  if (!crossing) return null;
  const id = canonicalPortNumber(crossing.port_number);
  if (WITHHELD_LOCATION_IDS.has(id)) return null;
  const lat = typeof crossing.lat === 'number'
    ? crossing.lat
    : (typeof crossing.latitude === 'number' ? crossing.latitude : null);
  const lng = typeof crossing.lng === 'number'
    ? crossing.lng
    : (typeof crossing.longitude === 'number' ? crossing.longitude : null);
  if (lat != null && lng != null) return { lat, lng };
  // Resolve through the canonical port so an alias number still finds coords.
  const fallback = PORT_COORDS[id];
  return fallback || null;
}

/**
 * Find the closest crossing in `crossings` to (lat, lng). Returns the
 * crossing or null if no crossings have known coords.
 */
export function findNearestCrossing(crossings, lat, lng) {
  if (!Array.isArray(crossings) || crossings.length === 0) return null;
  let best = null;
  let bestDist = Infinity;
  for (const c of crossings) {
    const coords = getCrossingCoords(c);
    if (!coords) continue;
    const d = haversineKm(lat, lng, coords.lat, coords.lng);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

/**
 * Return the N nearest crossings (by haversine distance), excluding `self`.
 * Crossings without coords are skipped.
 *
 * @returns Array<{ crossing, distanceKm }>
 */
export function nearestCrossings(self, allCrossings, count = 2) {
  const origin = getCrossingCoords(self);
  if (!origin) return [];
  const ranked = [];
  for (const c of allCrossings || []) {
    if (!c || c.port_number === self?.port_number) continue;
    const coords = getCrossingCoords(c);
    if (!coords) continue;
    const d = haversineKm(origin.lat, origin.lng, coords.lat, coords.lng);
    if (!Number.isFinite(d)) continue;
    ranked.push({ crossing: c, distanceKm: d });
  }
  ranked.sort((a, b) => a.distanceKm - b.distanceKm);
  return ranked.slice(0, count);
}
