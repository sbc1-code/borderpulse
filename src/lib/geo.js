// Haversine distance + nearest-crossing helpers.
//
// Coordinates are approximate US-side locations of CBP land ports of entry on
// the U.S./Mexico border (port-of-entry centroid, decimal degrees). Used for
// proximity-ranking ("nearest crossings") and the geolocation prompt — not
// for navigation, not for southbound estimates.

const PORT_COORDS = {
  // California
  '250201': { lat: 32.7270, lng: -114.6650 }, // Andrade
  '250301': { lat: 32.6735, lng: -115.3886 }, // Calexico - East
  '250302': { lat: 32.6655, lng: -115.4986 }, // Calexico - West
  '250401': { lat: 32.5436, lng: -117.0297 }, // San Ysidro
  '250501': { lat: 32.5772, lng: -116.6280 }, // Tecate
  '250601': { lat: 32.5419, lng: -116.9667 }, // Otay Mesa
  // Arizona
  '260101': { lat: 31.3445, lng: -109.5453 }, // Douglas (Raul Hector Castro)
  '260201': { lat: 31.8786, lng: -112.8156 }, // Lukeville
  '260301': { lat: 31.3343, lng: -109.9479 }, // Naco
  '260401': { lat: 31.3333, lng: -110.9425 }, // Nogales - Deconcini
  '260402': { lat: 31.3219, lng: -110.9729 }, // Nogales - Mariposa
  '260403': { lat: 31.3343, lng: -110.9408 }, // Nogales - Morley Gate
  '260801': { lat: 32.4886, lng: -114.7783 }, // San Luis - San Luis I
  '260802': { lat: 32.4886, lng: -114.7783 }, // San Luis - San Luis II
  // New Mexico
  '240601': { lat: 31.8285, lng: -107.6362 }, // Columbus
  '240801': { lat: 31.7811, lng: -106.6936 }, // Santa Teresa - Santa Teresa Port of Entry
  // Texas - El Paso area
  '240207': { lat: 31.7647, lng: -106.4528 }, // Bridge of the Americas (BOTA)
  '240221': { lat: 31.7541, lng: -106.4877 }, // El Paso (umbrella)
  '240202': { lat: 31.7547, lng: -106.4870 }, // El Paso - Paso Del Norte (PDN)
  '240203': { lat: 31.6802, lng: -106.3072 }, // El Paso - Ysleta
  '240204': { lat: 31.7641, lng: -106.4480 }, // El Paso - Stanton DCL
  '240301': { lat: 29.5611, lng: -104.3725 }, // Presidio
  '240401': { lat: 31.4172, lng: -106.0719 }, // Marcelino Serna - Tornillo
  'l24501': { lat: 31.2826, lng: -105.8511 }, // Fort Hancock
  // Texas - Eagle Pass / Del Rio / Laredo
  '230103': { lat: 25.9043, lng: -97.5021 },  // Gateway (Brownsville-area placeholder)
  '230201': { lat: 29.3271, lng: -100.9275 }, // Del Rio
  '230301': { lat: 28.7086, lng: -100.4970 }, // Eagle Pass - Bridge I
  '230302': { lat: 28.6786, lng: -100.4870 }, // Eagle Pass - Bridge II
  '230401': { lat: 27.5037, lng: -99.5078 },  // Laredo - Bridge I
  '230402': { lat: 27.5219, lng: -99.5097 },  // Laredo - Bridge II
  '230403': { lat: 27.5681, lng: -99.5894 },  // Laredo - Colombia Solidarity
  '230404': { lat: 27.6464, lng: -99.5286 },  // Laredo - World Trade Bridge
  // Texas - Rio Grande Valley
  '230501': { lat: 26.1023, lng: -98.2622 }, // Hidalgo/Pharr - Hidalgo
  '230502': { lat: 26.1561, lng: -98.1944 }, // Hidalgo/Pharr - Pharr
  '230503': { lat: 26.1129, lng: -98.3300 }, // Hidalgo/Pharr - Anzalduas
  '230701': { lat: 26.3786, lng: -98.8281 }, // Rio Grande City
  '230901': { lat: 26.0578, lng: -97.9669 }, // Progreso International
  '230902': { lat: 26.1611, lng: -98.0397 }, // Progreso - Donna
  '231001': { lat: 26.4078, lng: -99.0244 }, // Roma
  '535501': { lat: 25.9043, lng: -97.5021 }, // Brownsville - B&M
  '535502': { lat: 25.9445, lng: -97.4974 }, // Brownsville - Veterans International
  '535503': { lat: 26.0419, lng: -97.7439 }, // Brownsville - Los Indios
  '535504': { lat: 26.0269, lng: -97.4123 }, // Brownsville - Gateway
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
  const lat = typeof crossing.lat === 'number'
    ? crossing.lat
    : (typeof crossing.latitude === 'number' ? crossing.latitude : null);
  const lng = typeof crossing.lng === 'number'
    ? crossing.lng
    : (typeof crossing.longitude === 'number' ? crossing.longitude : null);
  if (lat != null && lng != null) return { lat, lng };
  const fallback = PORT_COORDS[crossing.port_number];
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
