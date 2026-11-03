// Bilingual copy for Lane Flip Watch. Wording stays descriptive: reported
// waits, CBP clocks, and no promise that a lane will stay faster.

import { FAST_LANE_PAIRS } from './laneFlips.js';

const LABELS = {
  passenger_standard: { en: 'General', es: 'General' },
  passenger_ready: { en: 'Ready Lane', es: 'Ready Lane' },
  passenger_sentri: { en: 'SENTRI', es: 'SENTRI' },
  pedestrian_standard: { en: 'General pedestrian', es: 'Peatonal general' },
  pedestrian_ready: { en: 'Ready pedestrian', es: 'Peatonal Ready' },
};

export function laneLabel(key, language = 'en') {
  const label = LABELS[key];
  if (!label) return '';
  return language === 'es' ? label.es : label.en;
}

export function baselineLabel(generalKey, language = 'en') {
  if (generalKey === 'pedestrian_standard') {
    return language === 'es' ? 'el peatonal general' : 'general pedestrian';
  }
  return language === 'es' ? 'el general' : 'general';
}

export function formatHour(hour, language = 'en') {
  const value = ((Number(hour) % 24) + 24) % 24;
  const suffix = value >= 12
    ? (language === 'es' ? 'p. m.' : 'PM')
    : (language === 'es' ? 'a. m.' : 'AM');
  return `${value % 12 || 12} ${suffix}`;
}

export function indexTitle(language = 'en') {
  return language === 'es'
    ? 'Ready y SENTRI frente al carril general | Border Pulse'
    : 'Lane Flip Watch: when Ready or SENTRI is reported slower | Border Pulse';
}

export function indexDescription(language = 'en') {
  return language === 'es'
    ? 'Compara las esperas reportadas del carril general, Ready Lane, SENTRI y peatonal. Mira cuándo el carril rápido aparece más lento y cuántas veces pasó en el archivo conservado.'
    : 'Compare reported general, Ready Lane, SENTRI and pedestrian waits. See when a faster lane is reported slower, and how often that happened in the retained archive.';
}

export function detailTitle(name, language = 'en') {
  return language === 'es'
    ? `Ready y SENTRI frente al carril general en ${name} | Border Pulse`
    : `Lane Flip Watch at ${name} | Border Pulse`;
}

export function detailDescription(name, language = 'en') {
  return language === 'es'
    ? `Esperas reportadas del general, Ready Lane y SENTRI en ${name}, lado a lado, y cuántas veces el carril rápido se reportó más lento en el archivo conservado. Revisa CBP antes de salir.`
    : `Reported general, Ready Lane and SENTRI waits at ${name}, side by side, plus how often the faster lane was reported slower in the retained archive. Check CBP before leaving.`;
}

export function checkNote(language = 'en') {
  return language === 'es'
    ? 'Solo esperas reportadas. Revisa CBP antes de salir.'
    : 'Reported waits only. Check CBP before leaving.';
}

export function closedSentence(language = 'en') {
  return language === 'es'
    ? 'CBP marca este cruce como cerrado. Las cifras anteriores de los carriles no son una comparación actual.'
    : 'CBP marks this crossing closed. Earlier lane numbers are not a current comparison.';
}

export function verdictSentence(row, language = 'en', usable = false) {
  const name = laneLabel(row.key, language);
  const baseline = baselineLabel(row.general, language);
  const es = language === 'es';
  const when = usable
    ? (es ? 'En la última consulta' : 'In the latest fetch')
    : (es ? 'En el último reporte' : 'In the latest report');
  const gap = Math.abs(row.gap || 0);
  if (row.state === 'slower') {
    return es
      ? `${when}, ${name} se reporta ${gap} min más lento que ${baseline}.`
      : `${when}, ${name} is reported ${gap} min slower than ${baseline}.`;
  }
  if (row.state === 'faster') {
    return es
      ? `${when}, ${name} se reporta ${gap} min más rápido que ${baseline}.`
      : `${when}, ${name} is reported ${gap} min faster than ${baseline}.`;
  }
  if (row.state === 'same') {
    return es
      ? `${when}, ${name} y ${baseline} se reportan con la misma espera.`
      : `${when}, ${name} and ${baseline} are reported at the same wait.`;
  }
  if (row.state === 'closed') return closedSentence(language);
  if (row.state === 'no-open') {
    return es
      ? `${name} no tiene carriles abiertos en este reporte, así que su espera no se compara.`
      : `${name} has no open lanes in this report, so its wait is not compared.`;
  }
  if (row.state === 'general-missing') {
    return es
      ? `CBP no trae una espera actual de ${baseline}, así que no hay comparación lado a lado con ${name}.`
      : `CBP has no current ${baseline} wait, so there is no side-by-side comparison with ${name}.`;
  }
  if (row.state === 'both-missing') {
    return es
      ? `CBP no trae una espera actual de ${name} ni de ${baseline} para comparar.`
      : `CBP has no current ${name} or ${baseline} wait to compare.`;
  }
  return es
    ? `CBP no trae una espera actual de ${name}, así que no hay comparación lado a lado con ${baseline}.`
    : `CBP has no current ${name} wait, so there is no side-by-side comparison with ${baseline}.`;
}

export function periodSentence(row, stats, language = 'en') {
  const paired = stats?.paired || 0;
  if (!paired) {
    return language === 'es'
      ? `No hay consultas con datos de ambos carriles de ${laneLabel(row.key, language)} y ${baselineLabel(row.general, language)} en el archivo conservado.`
      : `No paired ${laneLabel(row.key, language)} and ${baselineLabel(row.general, language)} reports in the retained archive.`;
  }
  const name = laneLabel(row.key, language);
  const baseline = baselineLabel(row.general, language);
  return language === 'es'
    ? `En el archivo conservado, ${name} se reportó más lento que ${baseline} en ${stats.slower} de ${paired} consultas con datos de ambos carriles (${Math.round(100 * stats.slower / paired)}%).`
    : `In the retained archive, ${name} was reported slower than ${baseline} in ${stats.slower} of ${paired} fetches with both lane values (${Math.round(100 * stats.slower / paired)}%).`;
}

export function hourDetail(row, stats, hour, language = 'en') {
  const clock = formatHour(hour, language);
  const paired = stats?.paired || 0;
  const name = laneLabel(row.key, language);
  const baseline = baselineLabel(row.general, language);
  if (!paired) {
    return language === 'es'
      ? `No hay consultas con datos de ambos carriles a las ${clock} en el archivo conservado.`
      : `No fetches with both lane values at ${clock} in the retained archive.`;
  }
  const counts = language === 'es'
    ? `${stats.slower} más lento, ${stats.faster} más rápido y ${stats.same} igual, de ${paired} consultas con datos de ambos carriles.`
    : `${stats.slower} slower, ${stats.faster} faster, and ${stats.same} the same, out of ${paired} fetches with both lane values.`;
  const lead = language === 'es'
    ? `A las ${clock}, ${name} se reportó más lento que ${baseline} en ${stats.slower} de ${paired}.`
    : `At ${clock}, ${name} was reported slower than ${baseline} in ${stats.slower} of ${paired}.`;
  return `${lead} ${counts}`;
}

export function methodParagraph(language = 'en') {
  return language === 'es'
    ? 'Cada consulta cuenta una vez si ambos carriles tienen una espera numérica, estado demora o sin demora y no reportan cero casetas abiertas. Se excluyen cierres, N/A y actualizaciones pendientes; un dato ausente no es cero. Ready y SENTRI se comparan con el general de autos; Ready peatonal con el peatonal general. Las horas agrupan la hora local de consulta, no los relojes de los carriles. Consultas repetidas pueden contener el mismo reporte de CBP: no son observaciones independientes, días ni probabilidades. Los porcentajes describen solo las consultas guardadas, no un pronóstico.'
    : 'Each fetch counts once when both lanes have numeric waits, delay or no-delay status and no reported zero open booths. Closures, N/A and pending updates are excluded; missing is not zero. Ready and SENTRI compare with general passenger; Ready pedestrian with general pedestrian. Hours group local retrieval time, not lane report clocks. Repeated fetches may contain the same CBP report: they are not independent observations, days or probabilities. Percentages describe only retained fetches, not a forecast.';
}

export function methodTitle(language = 'en') {
  return language === 'es' ? 'Cómo se cuenta el archivo' : 'How the archive count works';
}

export function flipsHeading(language = 'en', usable = false) {
  if (language === 'es') return 'Más lentos que el general en la última consulta';
  return 'Slower than general in the latest fetch';
}

export function emptyFlips(language = 'en') {
  return language === 'es'
    ? 'En el último reporte, ninguna espera de Ready Lane, SENTRI o peatonal Ready es mayor que la de su carril general.'
    : 'In the latest report, no Ready Lane, SENTRI, or Ready pedestrian wait is higher than its general lane.';
}

export function historyUnavailable(language = 'en') {
  return language === 'es'
    ? 'Los conteos históricos no están disponibles en este momento. Las esperas de arriba siguen siendo el último reporte.'
    : 'The archive counts are unavailable right now. The waits above are still the latest report.';
}

export function historyLoading(language = 'en') {
  return language === 'es' ? 'Cargando el archivo…' : 'Loading the archive…';
}

export function shareText({ language = 'en', name, rows = [], notes = [], url }) {
  const es = language === 'es';
  const lines = (rows || []).map(row => {
    const label = laneLabel(row.key, language);
    if (row.minutes == null) {
      return es ? `${label}: sin espera reportada.` : `${label}: no reported wait.`;
    }
    const clock = row.reportTime
      ? (es ? ` Reporte CBP: ${row.reportTime}.` : ` CBP reported: ${row.reportTime}.`)
      : (es ? ' Hora del reporte CBP no disponible.' : ' CBP report time unavailable.');
    return es
      ? `${label}: ${row.minutes} min reportados.${clock}`
      : `${label}: reported ${row.minutes} min.${clock}`;
  });
  const intro = es
    ? `Ready y SENTRI frente al carril general: ${name}.`
    : `Lane Flip Watch at ${name}.`;
  const clockCaution = es
    ? 'Una consulta puede incluir horas de reporte distintas; no confirma condiciones actuales ni simultáneas.'
    : 'One fetch may include different report times; it does not establish current or simultaneous conditions.';
  return [intro, ...lines, ...(notes || []), clockCaution, eligibilityNote(language), checkNote(language), url].filter(Boolean).join('\n');
}

export function heatLegend(language = 'en') {
  if (language === 'es') {
    return [
      { level: 'none', label: 'Sin consultas con datos de ambos carriles' },
      { level: 'none-slower', label: '0% más lento en las consultas guardadas' },
      { level: 'low', label: 'Más lento en menos del 25%' },
      { level: 'mixed', label: 'Más lento en 25% a menos de 50%' },
      { level: 'often', label: 'Más lento en 50% o más' },
    ];
  }
  return [
    { level: 'none', label: 'No fetches with both lane values' },
    { level: 'none-slower', label: '0% slower in retained fetches' },
    { level: 'low', label: 'Slower in under 25%' },
    { level: 'mixed', label: 'Slower in 25% to under 50%' },
    { level: 'often', label: 'Slower in 50% or more' },
  ];
}

export function pairFor(key) {
  return FAST_LANE_PAIRS.find(pair => pair.key === key) || null;
}

export function pairClocks(row, language = 'en') {
  return [row.generalReport, row.fast].map(report => {
    const clock = report?.reportTime || (language === 'es' ? 'hora CBP no disponible' : 'CBP time unavailable');
    const source = report?.sourceUpdatedAt ? ` (${report.sourceUpdatedAt})` : '';
    return `${laneLabel(report?.key, language)}: ${clock}${source}`;
  }).join(' · ');
}

export function historyCoverage(artifact, now = Date.now()) {
  const start = Date.parse(artifact?.window_start);
  const end = Date.parse(artifact?.window_end);
  const valid = Number.isFinite(start) && Number.isFinite(end) && start <= end && end <= now + 60_000;
  return { valid, stale: valid && now - end > 24 * 60 * 60 * 1000 };
}

export function historyNotice(artifact, now, language = 'en') {
  const es = language === 'es';
  const coverage = historyCoverage(artifact, now);
  const prefix = coverage.stale ? (es ? 'Archivo desactualizado. ' : 'Stale archive. ') : '';
  const interval = coverage.valid
    ? `${artifact.window_start} / ${artifact.window_end} (${artifact.snapshot_count} ${es ? 'consultas guardadas' : 'retained fetches'}).`
    : (es ? 'Periodo del archivo no disponible.' : 'Archive interval unavailable.');
  return `${prefix}${es ? 'Periodo conservado: ' : 'Retained interval: '}${interval}`;
}

export function archiveCaveat(language = 'en') {
  return language === 'es'
    ? 'Archivo de instantáneas normalizadas, sin reconstrucción de los datos originales. La normalización anterior podía perder carriles al combinar filas duplicadas. Estos conteos pueden estar incompletos; no representan todos los reportes de CBP.'
    : 'Archive of normalized snapshots, without reconstruction from raw source data. Earlier duplicate-row normalization could lose lane values. These counts may be incomplete; they do not represent all CBP reports.';
}

export function eligibilityNote(language = 'en') {
  return language === 'es'
    ? 'Ready y SENTRI tienen requisitos de elegibilidad. Una diferencia de espera no autoriza el uso de un carril; verifica los requisitos de CBP.'
    : 'Ready and SENTRI have eligibility requirements. A wait difference does not authorize lane use; check CBP requirements.';
}
