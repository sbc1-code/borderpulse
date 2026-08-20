// Canonical port identity.
//
// CBP's /api/bwtpublicmod intermittently substitutes a DIFFERENT row for the
// same physical crossing: a different port_number AND a different port_name.
// The two rows are mutually exclusive, verified across 200 committed snapshots
// (git log public/data/crossings.json) -- they never co-occur, so this is not
// a dedupe contest. The feed simply changes what it calls a bridge.
//
// That matters because slugs are derived from names (src/lib/slugs.js), so a
// substitution moved the crossing's URL. Measured consequences before this fix:
//   - /crossing/paso-del-norte/ served a hard 404 while the sitemap advertised
//     /crossing/el-paso-paso-del-norte-pdn/
//   - ~22% of production deploys failed, because scripts/smoke-routes.mjs
//     correctly caught the resulting non-canonical compare redirect
//   - build-aggregates.mjs wipes its output dir each run, so 30 days of history
//     orphaned itself under the old filename
//   - favorites are stored by port_number in localStorage, so a favorited Naco
//     silently vanished on 25% of loads
//
// Fix: identity (port_number, name, state) comes from this table, never from
// the feed. The feed still supplies all live DATA (waits, lanes, status).
//
// Substitution rates measured over 200 snapshots:
//   240202 PDN 188 / 202401 12      240201 BOTA 188 / 240207 12
//   240104 Ysleta 199 / 240203 1    250401 San Ysidro 198 / 250407 2
//   260301 Naco 149 / 260305 51     250601 Otay Mesa 196 / 250609 4
//
// The last two entries are a different failure: 230103 "Gateway" and 230106
// "B&M Bridge" are legacy duplicate port numbers that appear in 200/200
// snapshots ALONGSIDE their real twins and have never once reported a wait.
// They are collapsed into the twin rather than shipped as permanently dead
// cards. They are also the rows with state: null, which made them disappear
// whenever a region filter was applied.

export const PINNED_PORTS = {
  // --- substitutions: canonical row is the one that carries the wait data ---
  '240202': { name: 'El Paso - Paso Del Norte (PDN)', state: 'TX', aliases: ['202401'] },
  '240201': { name: 'El Paso - Bridge of the Americas (BOTA)', state: 'TX', aliases: ['240207'] },
  '240104': { name: 'El Paso - Ysleta', state: 'TX', aliases: ['240203'] },
  '250401': { name: 'San Ysidro', state: 'CA', aliases: ['250407'] },
  '260301': { name: 'Naco', state: 'AZ', aliases: ['260305'] },
  '250601': { name: 'Otay Mesa', state: 'CA', aliases: ['250609'] },

  // --- persistent duplicates: legacy port numbers, never any wait data ---
  // `collapse` forces dedupe grouping by port number. Only these two need it:
  // the substitution pairs above already group correctly via the name rules in
  // scripts/fetch-cbp.mjs (both spellings match the same regex), so they need
  // identity pinning only. Forcing port-grouping on them would bypass those
  // name rules and orphan sibling rows (cargo lots, Cross Border Express)
  // that are supposed to merge into their parent crossing.
  '535501': { name: 'Brownsville - B&M', state: 'TX', aliases: ['230106'], collapse: true },
  '535504': { name: 'Brownsville - Gateway', state: 'TX', aliases: ['230103'], collapse: true },
};

// alias port_number -> canonical port_number
export const PORT_ALIAS_TO_CANONICAL = Object.entries(PINNED_PORTS).reduce(
  (acc, [canonical, { aliases }]) => {
    for (const alias of aliases || []) acc[alias] = canonical;
    return acc;
  },
  {}
);

/**
 * Resolve any port_number (canonical or alias) to its canonical form.
 * Unknown ports pass through unchanged, so new CBP ports keep working.
 */
export function canonicalPortNumber(portNumber) {
  const key = String(portNumber ?? '');
  return PORT_ALIAS_TO_CANONICAL[key] || key;
}

/** True when this port's family must be grouped by port number during dedupe. */
export function requiresPortCollapse(portNumber) {
  return Boolean(PINNED_PORTS[canonicalPortNumber(portNumber)]?.collapse);
}

/** True when this row is a substitute/legacy row rather than the canonical one. */
export function isAliasPort(portNumber) {
  return Boolean(PORT_ALIAS_TO_CANONICAL[String(portNumber ?? '')]);
}

/**
 * Return a copy of `crossing` with identity fields pinned. Live data fields
 * (current_wait_time, lanes, port_status, hours, ...) are left untouched.
 */
export function pinIdentity(crossing) {
  if (!crossing) return crossing;
  const canonical = canonicalPortNumber(crossing.port_number);
  const pinned = PINNED_PORTS[canonical];
  if (!pinned && canonical === String(crossing.port_number ?? '')) return crossing;
  return {
    ...crossing,
    id: canonical,
    cbp_id: canonical,
    port_number: canonical,
    name: pinned?.name ?? crossing.name,
    port_name: pinned?.name ?? crossing.port_name,
    state: pinned?.state ?? crossing.state,
  };
}
