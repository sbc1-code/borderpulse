// Published by the Fideicomiso on its official camera directory, reviewed
// 2026-10-13. View direction is camera orientation, not lane eligibility or
// travel direction. Playback/live status is controlled by the source.
export const CAMERA_SOURCE = 'https://www.puentesfronterizos.gob.mx/camaras-en-vivo.php';
const CAMERA_VIEWS = {
  '240202': [['IcvugJWPXz8', 'North to south view', 'Vista de norte a sur'], ['0Pg3S6s76IE', 'South to north view', 'Vista de sur a norte']],
  '240204': [['CYhISA_wFQ8', 'North to south view', 'Vista de norte a sur'], ['sOHFG6_3zAs', 'South to north view', 'Vista de sur a norte']],
  '240104': [['GC5RY3zipa4', 'North to south view', 'Vista de norte a sur'], ['KX-bm-Lhy3w', 'South to north view', 'Vista de sur a norte']],
  '240401': [['0gT7jvaLCkg', 'North to south view', 'Vista de norte a sur'], ['8u-hBawdG8c', 'South to north view', 'Vista de sur a norte']],
  '240201': [['mp3RS0y77tY', 'North view', 'Vista norte'], ['CZM5TpXLzE8', 'South view', 'Vista sur']],
};
export function camerasFor(port) {
  return (CAMERA_VIEWS[String(port)] || []).map(([id, en, es]) => ({ id, en, es,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
  }));
}
