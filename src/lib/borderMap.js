import { getCrossingCoords } from './geo.js';
import { canonicalPortNumber } from './portIdentity.js';
import { availableLaneWait } from './crossingAvailability.js';
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 520;
export const WHOLE_BORDER = {
  x: 0,
  y: 0,
  width: MAP_WIDTH,
  height: MAP_HEIGHT
};
// Region/centroid locations, never navigation or approach coordinates. The
// aggregate El Paso record is not a separate physical crossing. San Luis II's
// duplicated legacy point is withheld pending an authoritative numeric fix.
const MAP_LOCATION_OVERRIDES = {
  '250601': {
    lat: 32.550602,
    lng: -116.938187
  },
  '230401': {
    lat: 27.499,
    lng: -99.507
  },
  '230402': {
    lat: 27.501,
    lng: -99.503
  },
  '230403': {
    lat: 27.700,
    lng: -99.746
  }
};
const UNLOCATED = new Set(['240221', '260802']);
export const LOCATION_SOURCES = {
  texas: 'https://gis-txdot.opendata.arcgis.com/maps/texas-border-crossings',
  arizona: 'https://azdot.gov/sites/default/files/2023-05/ADOT-Freight-Plan-Final.pdf',
  otay: 'https://ops.fhwa.dot.gov/publications/fhwahop10051/chap_3.htm'
};
const mercator = lat => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) * 180 / Math.PI;
const north = mercator(34),
  south = mercator(24.6);
const scale = Math.min(MAP_WIDTH / 22.5, MAP_HEIGHT / (north - south));
const offsetY = (MAP_HEIGHT - (north - south) * scale) / 2;
export function projectBorderPoint(lng, lat) {
  return {
    x: (lng + 118.5) * scale,
    y: offsetY + (north - mercator(lat)) * scale
  };
}
export function crossingMapLocation(crossing) {
  const id = canonicalPortNumber(crossing?.port_number);
  if (UNLOCATED.has(id)) return null;
  const point = MAP_LOCATION_OVERRIDES[id] || getCrossingCoords(crossing);
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng) || point.lat < 24 || point.lat > 34 || point.lng < -119 || point.lng > -96) return null;
  return {
    ...point,
    approximate: true
  };
}
export function fitBorderPoints(points) {
  if (!points.length) return WHOLE_BORDER;
  const x = points.map(p => p.x),
    y = points.map(p => p.y);
  const width = Math.min(MAP_WIDTH, Math.max(points.length === 1 ? 8 : .3, (Math.max(...x) - Math.min(...x)) * 1.7, (Math.max(...y) - Math.min(...y)) * 1.7 * MAP_WIDTH / MAP_HEIGHT));
  const height = width * MAP_HEIGHT / MAP_WIDTH;
  return {
    x: (Math.min(...x) + Math.max(...x) - width) / 2,
    y: (Math.min(...y) + Math.max(...y) - height) / 2,
    width,
    height
  };
}
export function cameraPoint(point, camera) {
  const zoom = MAP_WIDTH / camera.width;
  return {
    x: (point.x - camera.x) * zoom,
    y: (point.y - camera.y) * zoom
  };
}
export function clusterBorderRows(rows, camera, cssScale) {
  const clusters = [];
  for (const row of rows.filter(r => r.point).sort((a, b) => a.point.x - b.point.x)) {
    const display = cameraPoint(row.point, camera);
    if (display.x < -35 || display.x > MAP_WIDTH + 35 || display.y < -35 || display.y > MAP_HEIGHT + 35) continue;
    const group = clusters.find(c => Math.hypot(c.display.x - display.x, c.display.y - display.y) * cssScale < 40);
    if (group) {
      group.rows.push(row);
      group.point = {
        x: group.rows.reduce((n, r) => n + r.point.x, 0) / group.rows.length,
        y: group.rows.reduce((n, r) => n + r.point.y, 0) / group.rows.length
      };
      group.display = cameraPoint(group.point, camera);
    } else clusters.push({
      rows: [row],
      point: row.point,
      display
    });
  }
  return clusters;
}
export function borderReportRows(crossings, lane, snapshot = null) {
  return crossings.map(crossing => {
    const id = canonicalPortNumber(crossing.port_number),
      location = crossingMapLocation(crossing);
    const matches = snapshot?.crossings?.filter(r => canonicalPortNumber(r.port_number) === id) || [];
    const value = matches.length === 1 ? matches[0].current_wait_time : null;
    const wait = snapshot ? lane === 'passenger_standard' && Number.isFinite(value) && value >= 0 ? value : null : availableLaneWait(crossing, lane);
    const sourceLane = crossing.lanes?.[lane];
    const reason = snapshot ? lane !== 'passenger_standard' ? 'not_retained' : wait == null ? 'no_report' : null : crossing.port_status?.trim().toLowerCase() === 'closed' ? 'port_closed' : sourceLane?.lanes_open === 0 ? 'lane_closed' : wait == null ? 'no_report' : null;
    return {
      id,
      crossing,
      location,
      point: location ? projectBorderPoint(location.lng, location.lat) : null,
      wait,
      reason,
      report: snapshot ? null : typeof sourceLane?.update_time === 'string' ? sourceLane.update_time : null
    };
  });
}
// Only fields really retained in the collector archive are exposed. Preserve
// all-missing retrievals and explicit zero; never invent lane clocks/counts.
export function borderHistorySnapshots(document, now = Date.now()) {
  const byTime = new Map();
  for (const snapshot of (Array.isArray(document?.snapshots) ? document.snapshots : []).slice(-10000)) {
    if (typeof snapshot?.fetched_at !== 'string' || !Array.isArray(snapshot.crossings)) continue;
    const time = Date.parse(snapshot.fetched_at);
    if (!Number.isFinite(time) || time > now) continue;
    byTime.set(time, {
      fetched_at: snapshot.fetched_at,
      source: typeof snapshot.source === 'string' && /^commit:[a-f0-9]{40}$/.test(snapshot.source) ? snapshot.source : null,
      crossings: snapshot.crossings.map(r => ({
        port_number: String(r.port_number),
        current_wait_time: typeof r.current_wait_time === 'number' && Number.isFinite(r.current_wait_time) && r.current_wait_time >= 0 ? r.current_wait_time : null
      }))
    });
  }
  return [...byTime.entries()].sort(([a], [b]) => a - b).slice(-18).map(([, row]) => row);
}
