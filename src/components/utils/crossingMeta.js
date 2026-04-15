export function getPortStatus(crossing) {
  const raw = (crossing?.port_status || '').trim().toLowerCase();
  if (raw === 'open') return 'open';
  if (raw === 'closed') return 'closed';
  return 'unknown';
}

export function hasOperationalAdvisory(crossing) {
  return getPortStatus(crossing) === 'closed' || Boolean((crossing?.construction_notice || '').trim());
}

export function getOperationalNotice(crossing) {
  const note = (crossing?.construction_notice || '').replace(/\s+/g, ' ').trim();
  return note || null;
}

export function getAdvisoryType(crossing) {
  if (getPortStatus(crossing) === 'closed') return 'closure';

  const note = getOperationalNotice(crossing);
  if (!note) return null;

  if (/construct|construction|work|lane reduction|delay/i.test(note)) return 'construction';
  if (/closed|closure|saturday|sunday|hours|midnight|daily/i.test(note)) return 'hours';
  if (/ready lane|sentri|fast|pedestrian|cargo|commercial/i.test(note)) return 'lane';
  return 'notice';
}
