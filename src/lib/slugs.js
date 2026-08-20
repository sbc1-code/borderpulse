// Slug is pinned per port_number, not derived from the feed name.
//
// baseSlug(name) is retained as a fallback for genuinely new ports, but every
// crossing that has a published URL is listed here so a CBP rename can never
// move it again. This repo has been bitten twice: the orphaned `presidio`
// aggregate (see scripts/build-aggregates.mjs) and the Paso Del Norte 404 that
// was failing ~22% of deploys. See src/lib/portIdentity.js for the mechanism.
//
// Generated from the majority name per canonical port across 200 committed
// snapshots, cross-checked against the live sitemap. 42 canonical ports, no
// slug collisions.
const BASE_OVERRIDES = {
  '230201': 'del-rio',                              // Del Rio
  '230301': 'eagle-pass-bridge-i',                  // Eagle Pass - Bridge I
  '230302': 'eagle-pass-bridge-ii',                 // Eagle Pass - Bridge II
  '230401': 'laredo-bridge-i',                      // Laredo - Bridge I
  '230402': 'laredo-bridge-ii',                     // Laredo - Bridge II
  '230403': 'laredo-colombia-solidarity',           // Laredo - Colombia Solidarity
  '230404': 'laredo-world-trade-bridge',            // Laredo - World Trade Bridge
  '230501': 'hidalgo-pharr-hidalgo',                // Hidalgo/Pharr - Hidalgo
  '230502': 'hidalgo-pharr-pharr',                  // Hidalgo/Pharr - Pharr
  '230503': 'hidalgo-pharr-anzalduas-international-bridge',// Hidalgo/Pharr - Anzalduas International Bridge
  '230701': 'rio-grande-city',                      // Rio Grande City
  '230901': 'progreso-progreso-international-bridge',// Progreso - Progreso International Bridge
  '230902': 'progreso-donna-international-bridge',  // Progreso - Donna International Bridge
  '231001': 'roma',                                 // Roma
  '240104': 'ysleta',                               // YSLETA
  '240201': 'el-paso-bridge-of-the-americas-bota',  // El Paso - Bridge of the Americas (BOTA)
  '240202': 'el-paso-paso-del-norte-pdn',           // El Paso - Paso Del Norte (PDN)
  '240204': 'el-paso-stanton-dcl',                  // El Paso - Stanton DCL
  '240221': 'el-paso-downtown',                     // El Paso
  '240301': 'presidio-presidio-port-of-entry',      // Presidio - PRESIDIO PORT OF ENTRY
  '240401': 'marcelino-serna-tornillo',             // Marcelino Serna - Tornillo
  '240601': 'columbus',                             // Columbus
  '240801': 'santa-teresa-santa-teresa-port-of-entry',// Santa Teresa - Santa Teresa Port of Entry
  '250201': 'andrade',                              // Andrade
  '250301': 'calexico-east',                        // Calexico - East
  '250302': 'calexico-west',                        // Calexico - West
  '250401': 'san-ysidro',                           // San Ysidro
  '250501': 'tecate',                               // Tecate
  '250601': 'otay-mesa',                            // Otay Mesa
  '260101': 'douglas-raul-hector-castro',           // Douglas (Raul Hector Castro)
  '260201': 'lukeville',                            // Lukeville
  '260301': 'naco',                                 // Naco
  '260401': 'nogales-deconcini',                    // Nogales - Deconcini
  '260402': 'nogales-mariposa',                     // Nogales - Mariposa
  '260403': 'nogales-morley-gate',                  // Nogales - Morley Gate
  '260801': 'san-luis-san-luis-i',                  // San Luis - San Luis I
  '260802': 'san-luis-san-luis-ii',                 // San Luis - San Luis II
  '535501': 'brownsville-b-and-m',                  // Brownsville - B&M
  '535502': 'brownsville-veterans-international',   // Brownsville - Veterans International
  '535503': 'brownsville-los-indios',               // Brownsville - Los Indios
  '535504': 'brownsville-gateway',                  // Brownsville - Gateway
  'l24501': 'fort-hancock',                         // Fort Hancock
};

// Historical URLs that must keep resolving. The first five predate this file
// and were added symptomatically, one CBP rename at a time; the last three
// close the gaps that were still live.
export const SLUG_ALIASES = {
  'bridge-of-the-americas-port-of-entry': '240201',
  'el-paso-ysleta': '240104',
  'presidio': '240301',
  'roma-texas': '231001',
  'san-ysidro-pedwest': '250401',
  'paso-del-norte': '240202',   // was a hard 404 whenever CBP sent port 202401
  'gateway': '535504',          // legacy port 230103, now collapsed
  'b-and-m-bridge': '535501',   // legacy port 230106, now collapsed
};

function baseSlug(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[\(\)]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

export function buildSlugMap(crossings) {
  const counts = {};
  for (const c of crossings) {
    const b = BASE_OVERRIDES[c.port_number] || baseSlug(c.name);
    counts[b] = (counts[b] || 0) + 1;
  }
  const slugToPort = {};
  const portToSlug = {};
  for (const c of crossings) {
    const b = BASE_OVERRIDES[c.port_number] || baseSlug(c.name);
    const slug = counts[b] > 1 ? `${b}-${c.port_number}` : b;
    slugToPort[slug] = c.port_number;
    portToSlug[c.port_number] = slug;
  }
  for (const [alias, port] of Object.entries(SLUG_ALIASES)) {
    if (portToSlug[port]) slugToPort[alias] = port;
  }
  return { slugToPort, portToSlug };
}

export function slugForCrossing(crossing, allCrossings) {
  const { portToSlug } = buildSlugMap(allCrossings);
  return portToSlug[crossing.port_number] || null;
}

export function crossingForSlug(slug, allCrossings) {
  const { slugToPort } = buildSlugMap(allCrossings);
  const port = slugToPort[slug];
  if (!port) return null;
  return allCrossings.find((c) => c.port_number === port) || null;
}
