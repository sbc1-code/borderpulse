// Verified pedestrian capability survives missing/closed CBP lane reports.
// Progreso: TxDOT 2021 Border Crossings Guide, RGV-60 and RGV-64.
// Santa Teresa: City of El Paso, International Bridges, Santa Teresa section.
// Source URLs, snapshot identities and the deliberately limited scope are in
// docs/REFRESH-OPERATIONS.md (issue #59). This does not assert current service.
const VERIFIED_PEDESTRIAN_PORTS = new Set(['230901', '240801']);

// One rule for crossing-page links, sitemap and prerender. Other ports retain
// the existing report-based fallback until their capability is reviewed.
export function hasPedestrianLane(crossing) {
  return Boolean(
    VERIFIED_PEDESTRIAN_PORTS.has(crossing?.port_number) ||
    crossing?.lanes?.pedestrian_standard ||
    crossing?.lanes?.pedestrian_ready,
  );
}

// A port closure overrides lane numbers that CBP may retain from before it
// closed. Only a reported, open lane can support a current-trip comparison.
export function availableLaneWait(crossing, key) {
  if ((crossing?.port_status || '').trim().toLowerCase() === 'closed') return null;
  const lane = crossing?.lanes?.[key];
  const status = (lane?.status || '').trim().toLowerCase();
  if (!['delay', 'no delay'].includes(status) || lane.lanes_open === 0) return null;
  return Number.isFinite(lane.delay_minutes) && lane.delay_minutes >= 0
    ? lane.delay_minutes
    : null;
}
