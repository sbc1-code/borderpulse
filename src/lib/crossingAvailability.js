// Keep route generation aligned with the links shown on crossing pages.
// A lane object can legitimately be present while CBP reports "Update Pending";
// the page should still exist and explain that no current wait is available.
export function hasPedestrianLane(crossing) {
  return Boolean(
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
