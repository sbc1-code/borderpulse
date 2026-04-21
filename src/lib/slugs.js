const BASE_OVERRIDES = {
  '240221': 'el-paso-downtown',
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
