// Source classes describe the location evidence, separately from CBP wait
// freshness. None of these points is a surveyed driving/pedestrian entrance.
export const LOCATION_SOURCES = {
  directory: 'https://www.tabc.texas.gov/services/texas-ports-of-entry/ports-of-entry-locations/',
  federal: 'https://public-inspection.federalregister.gov/2025-23091.pdf',
  texas: 'https://gis-txdot.opendata.arcgis.com/maps/texas-border-crossings',
  sanLuisII: 'https://gypa.org/san-luis-2.html',
};
export { WITHHELD_LOCATION_IDS as WITHHELD_MAP_PORTS } from './geo.js';
const DIRECTORY_TARGETS = new Set(['240204', '230502', '535504', '535502', '230902', '230302', '240301', '535503']);
const EARLIER_PUBLISHED_POINTS = new Set(['230401', '230402', '230403']);
export function mapLocationProvenance(id) {
  if (DIRECTORY_TARGETS.has(id)) return { locationKind: 'directory-target', locationSource: LOCATION_SOURCES.directory };
  if (id === '260801') return { locationKind: 'federal-facility', locationSource: LOCATION_SOURCES.federal };
  if (EARLIER_PUBLISHED_POINTS.has(id)) return { locationKind: 'published-limited', locationSource: LOCATION_SOURCES.texas };
  return { locationKind: 'inherited-unverified', locationSource: null };
}
