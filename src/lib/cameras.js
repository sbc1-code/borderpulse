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
const CALTRANS_SOURCE = 'https://cwwp2.dot.ca.gov/vm/streamlist.htm';
const EAGLE_SOURCE = 'https://www.eaglepasstx.gov/335/International-Bridge-2-Cameras';
const NOGALES_SOURCE = 'https://heroicanogales.gob.mx/webcams-garitas';
const LAREDO_SOURCE = 'https://www.cityoflaredo.com/services/bridge-cameras';
const CHIHUAHUA = { owner: 'Fideicomiso de Puentes Fronterizos de Chihuahua', provider: 'YouTube', sourceUrl: CAMERA_SOURCE, kind: 'crossing' };
const CALTRANS = { owner: 'Caltrans', provider: 'Caltrans', sourceUrl: CALTRANS_SOURCE, kind: 'approach' };
const EAGLE = { owner: 'City of Eagle Pass', provider: 'IPCamLive', sourceUrl: EAGLE_SOURCE, kind: 'crossing' };
const external = (owner, sourceUrl) => ({ owner, provider: owner, sourceUrl, kind: 'external' });
const SOURCE_BY_PORT = {
  ...Object.fromEntries(Object.keys(CAMERA_VIEWS).map(port => [port, CHIHUAHUA])),
  '250401': CALTRANS, '250601': CALTRANS,
  '230302': EAGLE,
  '260401': external('Gobierno Municipal de Nogales', NOGALES_SOURCE),
  '260402': external('Gobierno Municipal de Nogales', NOGALES_SOURCE),
  '230401': external('City of Laredo', LAREDO_SOURCE),
  '230402': external('City of Laredo', LAREDO_SOURCE),
  '230502': external('City of Pharr', 'https://bridge.pharr-tx.gov/'),
};
const CALTRANS_VIEWS = {
  '250401': [['c214', 'I-5 · Via de San Ysidro (U.S. road)', 'I-5 · Via de San Ysidro (lado EE. UU.)', 'c214sb5viadesanysidro']],
  '250601': [['c100', 'SR-905 · Siempre Viva (U.S. road)', 'SR-905 · Siempre Viva (lado EE. UU.)', 'c100i905siemprevivat']],
};
export function cameraSourceFor(port) { return SOURCE_BY_PORT[String(port)] || null; }
export function camerasFor(port) {
  const key = String(port);
  const source = cameraSourceFor(key);
  if (!source) return [];
  if (source.kind === 'external') return [{ id: key, en: 'Open official camera source', es: 'Abrir fuente oficial de cámaras', watchUrl: source.sourceUrl, kind: 'external' }];
  if (CALTRANS_VIEWS[key]) return CALTRANS_VIEWS[key].map(([id, en, es, slug]) => ({ id, en, es, kind: 'approach', imageUrl: `https://cwwp2.dot.ca.gov/data/d11/cctv/image/${slug}/${slug}.jpg`, embedUrl: `https://cwwp2.dot.ca.gov/vm/loc/d11/${slug}.htm`, watchUrl: `https://cwwp2.dot.ca.gov/vm/loc/d11/${slug}.htm` }));
  if (key === '230302') return ['67231a475ead1', '639ba5d96b3f6', '639ba81bb4b49', '68f3f8b846277'].map((id, i) => ({ id, en: `Bridge II view ${i + 1}`, es: `Vista ${i + 1} del Puente II`, kind: 'crossing', embedUrl: `https://g1.ipcamlive.com/player/player.php?alias=${id}`, watchUrl: `https://g1.ipcamlive.com/player/player.php?alias=${id}` }));
  return (CAMERA_VIEWS[key] || []).map(([id, en, es]) => ({ id, en, es, kind: 'crossing', embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0`, watchUrl: `https://www.youtube.com/watch?v=${id}` }));
}
