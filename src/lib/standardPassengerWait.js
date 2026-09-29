// Read the reported northbound standard-passenger lane, without substituting
// another lane or a crossing-wide summary when CBP has no value for it.
export function standardPassengerWait(crossing) {
  if ((crossing?.port_status || '').trim().toLowerCase() === 'closed') return null;
  const lane = crossing?.lanes?.passenger_standard;
  if (!lane || lane.status === 'Update Pending') return null;
  return typeof lane.delay_minutes === 'number' && Number.isFinite(lane.delay_minutes)
    ? lane.delay_minutes
    : null;
}
