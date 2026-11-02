// Bilingual copy for Lane Flip Watch. Wording stays descriptive: reported
// waits, CBP clocks, and no promise that a lane will stay faster.

import { FAST_LANE_PAIRS, usuallyFaster, usuallySlower } from './laneFlips.js';

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
    ? '¿Hoy conviene el carril rápido? Esperas reportadas de Ready y SENTRI | Border Pulse'
    : 'Lane Flip Watch: when Ready or SENTRI is reported slower | Border Pulse';
}

export function indexDescription(language = 'en') {
  return language === 'es'
    ? 'Compara las esperas reportadas del carril general, Ready Lane, SENTRI y peatonal. Mira cuándo el carril rápido aparece más lento y cuántas veces pasó en los últimos 30 días.'
    : 'Compare reported general, Ready Lane, SENTRI and pedestrian waits. See when a faster lane is reported slower, and how often that happened in the last 30 days.';
}

export function detailTitle(name, language = 'en') {
  return language === 'es'
    ? `¿Hoy conviene el carril rápido en ${name}? Esperas reportadas | Border Pulse`
    : `Lane Flip Watch at ${name} | Border Pulse`;
}

export function detailDescription(name, language = 'en') {
  return language === 'es'
    ? `Esperas reportadas del general, Ready Lane y SENTRI en ${name}, lado a lado, y cuántas veces el carril rápido se reportó más lento en los últimos 30 días. Revisa CBP antes de salir.`
    : `Reported general, Ready Lane and SENTRI waits at ${name}, side by side, plus how often the faster lane was reported slower in the last 30 days. Check CBP before leaving.`;
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
    ? (es ? 'Ahora mismo' : 'Right now')
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
      ? `No hay reportes emparejados de ${laneLabel(row.key, language)} y ${baselineLabel(row.general, language)} en los últimos 30 días.`
      : `No paired ${laneLabel(row.key, language)} and ${baselineLabel(row.general, language)} reports in the last 30 days.`;
  }
  const name = laneLabel(row.key, language);
  const baseline = baselineLabel(row.general, language);
  return language === 'es'
    ? `En los últimos 30 días, ${name} se reportó más lento que ${baseline} en ${stats.slower} de ${paired} reportes emparejados.`
    : `Over the last 30 days, ${name} was reported slower than ${baseline} in ${stats.slower} of ${paired} paired reports.`;
}

export function hourDetail(row, stats, hour, language = 'en') {
  const clock = formatHour(hour, language);
  const paired = stats?.paired || 0;
  const name = laneLabel(row.key, language);
  const baseline = baselineLabel(row.general, language);
  if (!paired) {
    return language === 'es'
      ? `No hay reportes emparejados a las ${clock} en los últimos 30 días.`
      : `No paired reports at ${clock} in the last 30 days.`;
  }
  const counts = language === 'es'
    ? `${stats.slower} más lento, ${stats.faster} más rápido y ${stats.same} igual, de ${paired} reportes emparejados.`
    : `${stats.slower} slower, ${stats.faster} faster, and ${stats.same} the same, out of ${paired} paired reports.`;
  const lead = language === 'es'
    ? `A las ${clock}, ${name} se reportó más lento que ${baseline} en ${stats.slower} de ${paired}.`
    : `At ${clock}, ${name} was reported slower than ${baseline} in ${stats.slower} of ${paired}.`;
  let usual = '';
  if (usuallyFaster(stats)) {
    usual = language === 'es'
      ? ` A esta hora, ${name} suele reportarse más rápido que ${baseline}.`
      : ` ${name} is usually reported faster at this hour.`;
  } else if (usuallySlower(stats)) {
    usual = language === 'es'
      ? ` A esta hora, ${name} suele reportarse más lento que ${baseline}.`
      : ` ${name} is usually reported slower at this hour.`;
  }
  return `${lead} ${counts}${usual}`;
}

export function methodParagraph(language = 'en') {
  return language === 'es'
    ? 'Un reporte emparejado es una consulta en la que ambos carriles traen una espera numérica, el carril está abierto y el estado es demora o sin demora. Quedan fuera los cruces cerrados, las actualizaciones pendientes y los carriles sin casetas abiertas. Eso no se cuenta como espera cero. Hay un giro cuando la espera reportada del carril rápido es mayor que la de su carril general en esa misma consulta. Ready Lane y SENTRI se comparan con el general de autos. El peatonal Ready se compara con el peatonal general. Las horas son la hora local del cruce cuando Border Pulse obtuvo el reporte, no el reloj impreso en la línea de CBP. El conteo usa los últimos 30 días de consultas guardadas, no un pronóstico. Cada consulta cuenta una vez: si el carril sigue más lento por varias horas, entra en cada consulta. El porcentaje es una parte de los reportes, no de los días. "Suele" solo aparece con 8 reportes emparejados o más en esa hora, cuando un resultado reúne al menos 60% y el otro queda bajo 40%.'
    : 'A paired report is one fetch where both lanes have a numeric wait, the lane is open, and the status is delay or no delay. Closed crossings, pending updates, and lanes with no open booths are left out. They are not counted as a zero wait. A flip means the fast lane\'s reported wait is higher than its general lane in that same fetch. Ready Lane and SENTRI are compared with general passenger. Ready pedestrian is compared with general pedestrian. Hours are the crossing\'s local time when Border Pulse fetched the report, not the clock printed on the CBP lane line. The count uses the last 30 days of stored fetches, not a forecast. Each fetch counts once: a lane that stays slower across several hours is counted in each fetch. The percentage is a share of reports, not of days. "Usually" appears only with 8 or more paired reports at that hour, when one result is at least 60% and the other is under 40%.';
}

export function methodTitle(language = 'en') {
  return language === 'es' ? 'Cómo se cuenta el periodo de 30 días' : 'How the 30-day count works';
}

export function flipsHeading(language = 'en', usable = false) {
  if (language === 'es') return usable ? 'Más lentos que el general ahora' : 'Más lentos que el general en el último reporte';
  return usable ? 'Slower than general right now' : 'Slower than general in the latest report';
}

export function emptyFlips(language = 'en') {
  return language === 'es'
    ? 'En el último reporte, ninguna espera de Ready Lane, SENTRI o peatonal Ready es mayor que la de su carril general.'
    : 'In the latest report, no Ready Lane, SENTRI, or Ready pedestrian wait is higher than its general lane.';
}

export function historyUnavailable(language = 'en') {
  return language === 'es'
    ? 'Los conteos de 30 días no están disponibles en este momento. Las esperas de arriba siguen siendo el último reporte.'
    : 'The 30-day counts are unavailable right now. The waits above are still the latest report.';
}

export function historyLoading(language = 'en') {
  return language === 'es' ? 'Cargando los conteos de 30 días…' : 'Loading the 30-day counts…';
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
    ? `¿Hoy conviene el carril rápido? ${name}.`
    : `Lane Flip Watch at ${name}.`;
  return [intro, ...lines, ...(notes || []), checkNote(language), url].filter(Boolean).join('\n');
}

export function heatLegend(language = 'en') {
  if (language === 'es') {
    return [
      { level: 'none', label: 'Sin reportes emparejados' },
      { level: 'none-slower', label: 'Nunca más lento en esa hora' },
      { level: 'low', label: 'Más lento en menos del 25%' },
      { level: 'mixed', label: 'Más lento en 25% a menos de 50%' },
      { level: 'often', label: 'Más lento en 50% o más' },
    ];
  }
  return [
    { level: 'none', label: 'No paired reports' },
    { level: 'none-slower', label: 'Not slower at that hour' },
    { level: 'low', label: 'Slower in under 25%' },
    { level: 'mixed', label: 'Slower in 25% to under 50%' },
    { level: 'often', label: 'Slower in 50% or more' },
  ];
}

export function pairFor(key) {
  return FAST_LANE_PAIRS.find(pair => pair.key === key) || null;
}
