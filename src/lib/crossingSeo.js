import { crossingDisplayName } from './crossingNames.js';

// How people actually search for a crossing (Search Console queries), used only
// in titles and descriptions. Unlisted crossings fall back to the display name.
const SEARCH_NAMES = {
  '250201': 'Andrade (Los Algodones)',
  '230503': 'Anzalduas International Bridge (Hidalgo/Pharr)',
  '230902': 'Donna International Bridge (Progreso)',
  '230901': 'Progreso International Bridge',
  '535503': 'Los Indios International Bridge (Brownsville)',
  '535502': 'Veterans International Bridge (Brownsville)',
  '535504': 'Gateway International Bridge (Brownsville)',
  '535501': 'B&M Bridge (Brownsville)',
  '230301': 'Eagle Pass International Bridge I',
  '230302': 'Eagle Pass International Bridge II',
  '240801': 'Santa Teresa Port of Entry',
  '240401': 'Tornillo Port of Entry (Marcelino Serna)',
  '240301': 'Presidio Port of Entry',
  '260401': 'Nogales DeConcini',
  '260402': 'Nogales Mariposa',
  '260403': 'Nogales Morley Gate',
};
export function crossingSearchName(crossing, language = 'en') {
  return SEARCH_NAMES[String(crossing?.port_number)] || crossingDisplayName(crossing, language);
}
const hasPlaceWord = (name) => /bridge|port of entry|puente|garita/i.test(name);

// Title mirrors the query shape: "<crossing> border wait times today".
export function crossingSearchTitle(crossing, language = 'en', hasCameras = false) {
  const name = crossingSearchName(crossing, language);
  const enCamera = hasCameras === 'approach' ? ' & road cameras' : hasCameras === 'external' ? ' & camera sources' : hasCameras ? ' & cameras' : '';
  const esCamera = hasCameras === 'approach' ? ' y cámaras viales' : hasCameras === 'external' ? ' y fuentes de cámaras' : hasCameras ? ' y cámaras' : '';
  return language === 'es'
    ? `Tiempos de espera en ${name} hoy${esCamera} | Border Pulse`
    : `${name}${hasPlaceWord(name) ? '' : ' border'} wait times today${enCamera} | Border Pulse`;
}

// One description for the prerendered page and the client, built from the
// crossing's own data: its search name, its historical quietest hour, cameras.
export function crossingSearchDescription(crossing, language = 'en', { bestHour = null, hasCameras = false } = {}) {
  const name = crossingSearchName(crossing, language);
  const hour = Number.isInteger(bestHour) ? `${bestHour % 12 || 12} ${bestHour >= 12 ? 'PM' : 'AM'}` : null;
  if (language === 'es') {
    return `Tiempo de espera actual en ${name} según CBP, por carril.${hour ? ` En los últimos 30 días, la espera típica más corta fue cerca de las ${hour}.` : ''}${hasCameras ? ' Incluye cámaras de la zona.' : ''} Horarios del puerto y tendencias históricas por hora.`;
  }
  return `Current ${name} wait time from CBP, by lane.${hour ? ` Over the last 30 days, the shortest typical wait came around ${hour}.` : ''}${hasCameras ? ' Includes nearby road cameras.' : ''} Port hours and historical trends by hour.`;
}
