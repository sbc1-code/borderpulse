// Single source of truth for the seed /compare pairs. Mirrored in
// scripts/prerender.mjs and scripts/build-sitemap.mjs (they can't import
// this directly because they run with .mjs node — kept as plain JS arrays
// in both surfaces; update all three when adding a pair).

export const COMPARE_PAIRS = [
  ['san-ysidro', 'otay-mesa'],
  ['san-ysidro', 'tecate'],
  ['otay-mesa', 'tecate'],
  ['el-paso-paso-del-norte-pdn', 'el-paso-bridge-of-the-americas-bota'],
  ['el-paso-paso-del-norte-pdn', 'el-paso-ysleta'],
  ['hidalgo-pharr-hidalgo', 'hidalgo-pharr-pharr'],
  ['hidalgo-pharr-hidalgo', 'hidalgo-pharr-anzalduas-international-bridge'],
  ['nogales-deconcini', 'nogales-mariposa'],
  ['calexico-west', 'calexico-east'],
  ['eagle-pass-bridge-i', 'eagle-pass-bridge-ii'],
  ['brownsville-gateway', 'brownsville-veterans-international'],
  ['brownsville-gateway', 'brownsville-b-and-m'],
  ['brownsville-veterans-international', 'brownsville-los-indios'],
  ['laredo-bridge-i', 'laredo-bridge-ii'],
  ['progreso-progreso-international-bridge', 'progreso-donna-international-bridge'],
];

// Return the canonical /compare URL path for two crossing slugs, or null
// if no seed pair exists for them. Order-insensitive: callers don't have
// to know which slug is "first" in the seed list.
export function findComparePath(slugA, slugB) {
  if (!slugA || !slugB || slugA === slugB) return null;
  for (const [a, b] of COMPARE_PAIRS) {
    if ((a === slugA && b === slugB) || (a === slugB && b === slugA)) {
      return `/compare/${a}-vs-${b}`;
    }
  }
  return null;
}

// Return all seed compare paths involving `slug`, with the other slug
// included so callers can render labels.
export function comparePairsFor(slug) {
  if (!slug) return [];
  const out = [];
  for (const [a, b] of COMPARE_PAIRS) {
    if (a === slug) out.push({ otherSlug: b, path: `/compare/${a}-vs-${b}` });
    else if (b === slug) out.push({ otherSlug: a, path: `/compare/${a}-vs-${b}` });
  }
  return out;
}
