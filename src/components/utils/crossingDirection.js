export function getWaitMinutes(crossing, direction = 'northbound') {
  if (direction === 'southbound') {
    return typeof crossing.southbound_wait_time === 'number' ? crossing.southbound_wait_time : null;
  }
  if (typeof crossing.northbound_wait_time === 'number') return crossing.northbound_wait_time;
  return typeof crossing.current_wait_time === 'number' ? crossing.current_wait_time : null;
}

export function getStatusForWait(wait) {
  if (wait == null) return 'unknown';
  if (wait < 15) return 'good';
  if (wait < 45) return 'moderate';
  return 'heavy';
}

export function getStatusForDirection(crossing, direction = 'northbound') {
  if (direction === 'southbound') {
    return crossing.southbound_status || getStatusForWait(getWaitMinutes(crossing, direction));
  }
  return crossing.status || getStatusForWait(getWaitMinutes(crossing, direction));
}

export function getUpdatedAtForDirection(crossing, direction = 'northbound') {
  if (direction === 'southbound') {
    return crossing.southbound_updated_at || null;
  }
  return crossing.updated_at || null;
}

export function getStorageKey(id, direction = 'northbound') {
  if (!id) return null;
  return direction === 'southbound' ? `${id}:sb` : String(id);
}
