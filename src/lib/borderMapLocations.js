// Source classes describe the location evidence, separately from CBP wait
// freshness. None of these points is a surveyed driving/pedestrian entrance.
export const LOCATION_SOURCES = {
  directory: 'https://www.tabc.texas.gov/services/texas-ports-of-entry/ports-of-entry-locations/',
  federal: 'https://public-inspection.federalregister.gov/2025-23091.pdf',
  gsa: 'https://catalog.data.gov/dataset/inventory-of-owned-and-leased-properties-iolp',
  morley: 'https://rosap.ntl.bts.gov/view/dot/53809/dot_53809_DS2.pdf',
  sanLuisII: 'https://gypa.org/san-luis-2.html',
};
export { WITHHELD_LOCATION_IDS as WITHHELD_MAP_PORTS } from './geo.js';
const DIRECTORY_TARGETS = new Set(['240204', '230502', '535504', '535502', '230902', '230302', '240301', '535503', '230401', '230402', '230901', '231001']);
const GSA_ASSETS = {
  '250201': 'CA0621', '250301': 'CA0507', '250302': 'CA0518', '250401': 'CA0335', '250501': 'CA0801', '250601': 'CA0267',
  '260101': 'AZ0611', '260201': 'AZ0670', '260301': 'AZ0681', '260401': 'AZ0551', '260402': 'AZ0334',
  '240601': 'NM8015', '240801': 'NM0560', '240201': 'TX0961', '240202': 'TX0986', '240104': 'TX0963',
  '240401': 'TX0711', 'l24501': 'TX0705', '230201': 'TX0409', '230301': 'TX0201', '230403': 'TX0306',
  '230404': 'TX0730', '230501': 'TX1782', '230503': 'TX0610', '230701': 'TX2348', '535501': 'TX0312'
};
export function mapLocationProvenance(id) {
  if (DIRECTORY_TARGETS.has(id)) return { locationKind: 'directory-target', locationSource: LOCATION_SOURCES.directory };
  if (id === '260801') return { locationKind: 'federal-facility', locationSource: LOCATION_SOURCES.federal };
  if (GSA_ASSETS[id]) return { locationKind: 'gsa-facility', locationSource: LOCATION_SOURCES.gsa, locationAsset: GSA_ASSETS[id] };
  if (id === '260403') return { locationKind: 'contextual-limited', locationSource: LOCATION_SOURCES.morley };
  return { locationKind: 'inherited-unverified', locationSource: null };
}
