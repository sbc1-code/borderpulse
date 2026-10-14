// Familiar names help people recognize a crossing. Identity, slugs, data and
// timezones still use the canonical CBP record; these are display/search aliases.
const LOCAL_NAMES = {
  '240202': { en: 'Santa Fe · Paso del Norte', es: 'Santa Fe · Paso del Norte', terms: 'Santa Fe Centro Paso del Norte PDN' },
  '240201': { en: 'Puente Libre · Bridge of the Americas', es: 'Puente Libre · Córdova-Américas', terms: 'Puente Libre Cordova Córdova Americas Américas BOTA' },
  '240104': { en: 'Zaragoza · Ysleta', es: 'Zaragoza · Ysleta', terms: 'Zaragoza Ysleta Waterfill' },
  '240204': { en: 'Lerdo · Stanton', es: 'Lerdo · Stanton', terms: 'Lerdo Stanton DCL Linea Expres Línea Exprés' },
  '240401': { en: 'Tornillo · Guadalupe', es: 'Tornillo · Guadalupe', terms: 'Tornillo Guadalupe Marcelino Serna' },
  '240801': { en: 'Santa Teresa · San Jerónimo', es: 'Santa Teresa · San Jerónimo', terms: 'Santa Teresa San Jeronimo San Jerónimo' },
};
export function crossingDisplayName(crossing, language = 'en') {
  return LOCAL_NAMES[String(crossing?.port_number)]?.[language] || crossing?.name || '';
}
export function crossingSearchTerms(crossing) {
  return [crossing?.name, crossing?.port_name, crossing?.crossing_name, crossing?.state,
    LOCAL_NAMES[String(crossing?.port_number)]?.terms].filter(Boolean).join(' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function crossingSearchTitle(crossing, language = 'en', hasCameras = false) {
  const name = crossingDisplayName(crossing, language);
  const enCamera = hasCameras === 'approach' ? ' & road cameras' : hasCameras === 'external' ? ' & camera sources' : hasCameras ? ' & cameras' : '';
  const esCamera = hasCameras === 'approach' ? ' y cámaras viales' : hasCameras === 'external' ? ' y fuentes de cámaras' : hasCameras ? ' y cámaras' : '';
  return language === 'es'
    ? `${name}: esperas CBP${esCamera} | Border Pulse`
    : `${name}: CBP wait times${enCamera} | Border Pulse`;
}
