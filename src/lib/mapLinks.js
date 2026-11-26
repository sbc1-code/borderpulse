export function mapAppLinks(lat, lng, label = '') {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  const coords = `${lat},${lng}`;
  const qCoords = encodeURIComponent(coords);
  const qLabel = encodeURIComponent(label || coords);
  return [
    { id: 'google', name: 'Google Maps', href: `https://www.google.com/maps/search/?api=1&query=${qCoords}` },
    { id: 'apple', name: 'Apple Maps', href: `https://maps.apple.com/?ll=${qCoords}&q=${qLabel}` },
    { id: 'waze', name: 'Waze', href: `https://waze.com/ul?ll=${qCoords}&navigate=yes` },
  ];
}
