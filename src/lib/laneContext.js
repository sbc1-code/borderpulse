// URL-backed choice; never infer a different lane from a missing report.
export const DEFAULT_LANE = 'passenger_standard';
export const LOCAL_LANES = [
  { key: DEFAULT_LANE, en: 'Standard passenger', es: 'Auto estándar' },
  { key: 'passenger_ready', en: 'Ready Lane', es: 'Ready Lane' },
  { key: 'passenger_sentri', en: 'SENTRI', es: 'SENTRI' },
  { key: 'pedestrian_standard', en: 'Pedestrian', es: 'Peatones' },
];
export function normalizeLane(value) {
  return LOCAL_LANES.some(lane => lane.key === value) ? value : DEFAULT_LANE;
}
export function laneLabel(value, language = 'en') {
  const lane = LOCAL_LANES.find(lane => lane.key === normalizeLane(value));
  return language === 'es' ? lane.es : lane.en;
}
export function withLane(path, value) {
  const url = new URL(path, 'https://borderpulse.com');
  const lane = normalizeLane(value);
  if (lane === DEFAULT_LANE) url.searchParams.delete('lane');
  else url.searchParams.set('lane', lane);
  return `${url.pathname}${url.search}${url.hash}`;
}
