// Keep route generation aligned with the links shown on crossing pages.
// A lane object can legitimately be present while CBP reports "Update Pending";
// the page should still exist and explain that no current wait is available.
export function hasPedestrianLane(crossing) {
  return Boolean(
    crossing?.lanes?.pedestrian_standard ||
    crossing?.lanes?.pedestrian_ready,
  );
}
