// Autonomous publication is restricted to this closed reporting grammar.
// Remote prose, RSS text and model output never become executable MDX.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';

export const VERSION = 'cbp-matched-week-v1';
export const DAY = 86_400_000;
export const PORTS = {
  '250401': { name: 'San Ysidro', slug: 'san-ysidro' },
  '250601': { name: 'Otay Mesa', slug: 'otay-mesa' },
  '250501': { name: 'Tecate', slug: 'tecate' },
  '250301': { name: 'Calexico East', slug: 'calexico-east' },
  '250302': { name: 'Calexico West', slug: 'calexico-west' },
  '260401': { name: 'Nogales DeConcini', slug: 'nogales-deconcini' },
  '260402': { name: 'Nogales Mariposa', slug: 'nogales-mariposa' },
  '240202': { name: 'El Paso Paso Del Norte', slug: 'el-paso-paso-del-norte-pdn' },
  '240104': { name: 'Ysleta', slug: 'ysleta' },
};
const requireValue = (value, message) => { if (!value) throw new Error(message); };
const iso = value => new Date(value).toISOString();
const date = value => iso(value).slice(0, 10);
export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function median(values) {
  const a = [...values].sort((x, y) => x - y);
  return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
}
const quantile = (values, fraction) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * fraction)];
const isIso = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && iso(Date.parse(value)) === value;
const finiteWait = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1440;

export function validateInputs({ crossings, history, sourceCommit }, now) {
  requireValue(/^[a-f0-9]{40}$/.test(sourceCommit), 'Missing immutable source commit');
  for (const [label, timestamp] of [['snapshot', crossings?.fetched_at], ['history', history?.generated_at]]) {
    const t = Date.parse(timestamp);
    requireValue(isIso(timestamp) && t <= now && now - t <= 90 * 60_000, `${label} missing, stale or future-dated`);
  }
  requireValue(crossings.source_url === 'https://bwt.cbp.gov/api/bwtpublicmod', 'Unapproved primary source');
  requireValue(Array.isArray(crossings.crossings) && crossings.crossings.length >= 30, 'Missing/truncated crossings');
  requireValue(new Set(crossings.crossings.map(c => c.port_number)).size === crossings.crossings.length, 'Duplicate current port');
  requireValue(history?.lookback_days === 30 && Array.isArray(history.snapshots), 'Missing 30-day history');
  let previous = -Infinity;
  for (const s of history.snapshots) {
    const t = Date.parse(s.fetched_at);
    requireValue(isIso(s.fetched_at) && t > previous && t <= now && Array.isArray(s.crossings), 'Invalid, duplicate or unordered history');
    requireValue(new Set(s.crossings.map(c => c.port_number)).size === s.crossings.length, 'Duplicate historical port');
    previous = t;
  }
  requireValue(previous === Date.parse(crossings.fetched_at), 'History does not include latest snapshot');
}

// Medians of hourly medians prevent uneven collector cadence from overweighting
// hours. Daily medians then give each complete UTC day equal weight.
export function summarize(observations, publishedAt) {
  const end = Date.parse(date(publishedAt) + 'T00:00:00.000Z');
  const start = end - 14 * DAY;
  const hours = new Map();
  let previous = -Infinity;
  for (const row of observations) {
    const t = Date.parse(row.at);
    requireValue(isIso(row.at) && t > previous && t >= start && t < end && finiteWait(row.minutes), 'Invalid evidence observation');
    requireValue(/^commit:[a-f0-9]{40}$/.test(row.source), 'Evidence lacks archived source commit');
    previous = t;
    const hour = iso(t).slice(0, 13);
    if (!hours.has(hour)) hours.set(hour, []);
    hours.get(hour).push(row.minutes);
  }
  const days = Array(14);
  for (let d = 0; d < 7; d++) {
    const earlier = date(start + d * DAY), later = date(start + (d + 7) * DAY);
    const priorValues = [], recentValues = [], matchedHours = [];
    let priorSamples = 0, recentSamples = 0;
    for (let hour = 0; hour < 24; hour++) {
      const key = String(hour).padStart(2, '0');
      const a = hours.get(`${earlier}T${key}`) || [];
      const b = hours.get(`${later}T${key}`) || [];
      if (a.length < 3 || b.length < 3) continue;
      matchedHours.push(hour);
      priorValues.push(median(a)); recentValues.push(median(b));
      priorSamples += a.length; recentSamples += b.length;
    }
    // Require at least half of a UTC day in each of all seven weekday pairs.
    // Both weeks use exactly the same eligible hours within each pair.
    if (matchedHours.length < 12) return null;
    days[d] = { date: earlier, median: median(priorValues), samples: priorSamples, hours: matchedHours };
    days[d + 7] = { date: later, median: median(recentValues), samples: recentSamples, hours: matchedHours };
  }
  const prior = days.slice(0, 7).map(d => d.median);
  const recent = days.slice(7).map(d => d.median);
  const oldMedian = median(prior), newMedian = median(recent);
  const change = newMedian - oldMedian;
  if (Math.abs(change) < 15 || oldMedian <= 0 || Math.abs(change) / oldMedian < 0.25) return null;
  if (change > 0 ? quantile(recent, 0.25) <= quantile(prior, 0.75) : quantile(prior, 0.25) <= quantile(recent, 0.75)) return null;
  const sameDirectionDays = recent.filter((v, i) => change > 0 ? v > prior[i] : v < prior[i]).length;
  if (sameDirectionDays < 6) return null;
  return { days, priorMedian: oldMedian, recentMedian: newMedian, change, sameDirectionDays,
    priorStart: days[0].date, priorEnd: days[6].date, recentStart: days[7].date, recentEnd: days[13].date,
    observations: days.reduce((sum, day) => sum + day.samples, 0) };
}

export function selectReport(inputs, existing, now = Date.now()) {
  validateInputs(inputs, now);
  const publicationDate = date(now);
  if (existing.some(p => ['daily-pilot', 'ai-editorial'].includes(p.source) && p.date === publicationDate)) return { status: 'skip', reason: 'already-published-today' };
  const end = Date.parse(publicationDate + 'T00:00:00Z'), start = end - 14 * DAY;
  const candidates = [];
  for (const [port, meta] of Object.entries(PORTS)) {
    if (existing.some(p => p.relatedCrossings?.includes(port) && Date.parse(p.date) >= now - 7 * DAY)) continue;
    const current = inputs.crossings.crossings.find(c => c.port_number === port);
    if (!finiteWait(current?.current_wait_time) || current?.lanes?.passenger_standard?.delay_minutes !== current.current_wait_time) continue;
    const observations = [];
    for (const s of inputs.history.snapshots) {
      const t = Date.parse(s.fetched_at);
      if (t < start || t >= end) continue;
      const row = s.crossings.find(c => c.port_number === port);
      if (!finiteWait(row?.current_wait_time)) continue; // Missing never becomes zero.
      observations.push({ at: s.fetched_at, minutes: row.current_wait_time, source: s.source });
    }
    const summary = summarize(observations, now);
    if (summary) candidates.push({ port, ...meta, observations, summary });
  }
  candidates.sort((a, b) => Math.abs(b.summary.change) - Math.abs(a.summary.change) || a.port.localeCompare(b.port));
  if (!candidates.length) return { status: 'skip', reason: 'no-material-well-covered-change' };
  const selected = candidates[0];
  const fingerprint = digest({ port: selected.port, prior: selected.summary.priorMedian, recent: selected.summary.recentMedian, direction: Math.sign(selected.summary.change) });
  if (existing.some(p => p.evidenceFingerprint === fingerprint)) return { status: 'skip', reason: 'duplicate-finding' };
  const receipt = { version: VERSION, category: 'historical-operational-report', publishedAt: iso(now), publicationDate,
    sourceCommit: inputs.sourceCommit, sourceUrl: inputs.crossings.source_url, fetchedAt: inputs.crossings.fetched_at,
    historyGeneratedAt: inputs.history.generated_at, port: selected.port, fingerprint,
    observations: selected.observations, summary: selected.summary };
  return { status: 'publish', receipt };
}

export const evidenceName = receipt => `observed-waits-${receipt.publicationDate}`;
export function renderPost(receipt, lang) {
  const meta = typeof receipt.port === 'string' && Object.hasOwn(PORTS, receipt.port) ? PORTS[receipt.port] : null;
  requireValue(meta && ['en', 'es'].includes(lang), 'Unsupported report identity or language');
  const s = receipt.summary, es = lang === 'es', base = evidenceName(receipt);
  const slug = base + (es ? '-es' : '');
  const evidenceUrl = `https://borderpulse.com/data/blog-evidence/${base}.json`;
  const sourceUrl = `https://github.com/sbc1-code/borderpulse/blob/${receipt.sourceCommit}/public/data/snapshot-history.json`;
  const fm = {
    title: es ? `${meta.name}: cambio en las esperas registradas` : `${meta.name}: a shift in recorded waits`,
    description: es
      ? 'Comparamos dos semanas completas de reportes de CBP con cobertura por hora. Consulta las fechas, el método y la evidencia antes de interpretar el cambio.'
      : 'Two complete weeks of retained CBP reports show a material change. Read the dated evidence, coverage and method before interpreting the shift.',
    slug, date: receipt.publicationDate, author: 'borderpulse-automated', pillar: 'data-analysis', lang,
    tags: ['cbp', 'historical-data'], translationKey: base, relatedCrossings: [receipt.port],
    officialSources: [{ label: 'CBP Border Wait Times', url: 'https://bwt.cbp.gov/' }],
    draft: false, source: 'daily-pilot', humanEdited: false, evidenceReceipt: `${base}.json`, evidenceFingerprint: receipt.fingerprint,
  };
  const table = s.days.map(d => es ? `- **${d.date}:** ${d.median} min; ${d.samples} reportes retenidos; horas UTC: ${d.hours.join(", ")}.` : `- **${d.date}:** ${d.median} min; ${d.samples} retained reports; UTC hours: ${d.hours.join(", ")}.`).join('\n');
  const body = es ? `En ${meta.name}, la mediana de los resúmenes diarios de espera reportada para vehículos particulares en carriles Standard hacia EE. UU. pasó de **${s.priorMedian} min** (${s.priorStart} a ${s.priorEnd}) a **${s.recentMedian} min** (${s.recentStart} a ${s.recentEnd}). Son periodos completos en UTC, comparados solo en las horas coincidentes con suficientes reportes de cada par de días. Es una comparación histórica de reportes retenidos, no una espera actual ni una predicción.

## Qué muestran los datos

La diferencia entre las medianas es de **${Math.abs(s.change)} min**, ${s.change > 0 ? 'más' : 'menos'} en el periodo reciente. Al comparar cada día con el mismo día de la semana anterior, ${s.sameDirectionDays} de los siete días cambiaron en esa dirección. Esto describe el archivo observado; no demuestra la causa del cambio.

**Resúmenes diarios por fecha UTC:**
${table}

## Método y límites

Usamos ${s.observations} observaciones retenidas. Cada hora incluida tiene al menos tres observaciones en ambas semanas. Cada par de días de la semana comparte al menos 12 horas UTC. Calculamos la mediana de cada hora, la mediana de las horas coincidentes de cada día y después la mediana de los siete resúmenes diarios de cada periodo. Así, una hora con más consultas no pesa más. Los reportes repetidos pueden reflejar el mismo dato de CBP; no son mediciones independientes de viajeros.

El filtro de publicación exige un cambio de al menos 15 minutos y 25%, separación entre los rangos centrales de los resúmenes diarios y coincidencia de dirección en al menos seis pares de días. No es una prueba de significación estadística. Los datos faltantes se excluyen; cero solo cuenta cuando la fuente registra cero. Los pares de días pueden cubrir horas distintas, indicadas arriba; son resúmenes de horas coincidentes, no estimaciones de todo el día. No cubre Ready, SENTRI, peatones, vehículos comerciales ni el cruce hacia México. Las fechas UTC pueden abarcar partes de dos días locales.

## Cómo usar este informe

El cambio sirve como contexto para planear, pero no permite garantizar una hora de llegada, un tiempo total de viaje ni el resultado de una inspección. [Consulta el reporte actual de CBP en BorderPulse](https://borderpulse.com/crossing/${meta.slug}/) y confirma su fecha antes de salir. Este informe no establece requisitos de entrada, salud o inmigración.

## Fuentes y fechas

- [CBP Border Wait Times](https://bwt.cbp.gov/): fuente primaria. Última consulta del archivo: ${receipt.fetchedAt}.
- [Archivo histórico en la revisión utilizada](${sourceUrl}). Archivo generado: ${receipt.historyGeneratedAt}.
- [Evidencia de este informe, observaciones y cálculos](${evidenceUrl}). Preparado para publicación automatizada: ${receipt.publishedAt}.
` : `At ${meta.name}, the median of daily summaries of reported northbound Standard passenger-vehicle waits changed from **${s.priorMedian} min** (${s.priorStart} to ${s.priorEnd}) to **${s.recentMedian} min** (${s.recentStart} to ${s.recentEnd}). Both are complete UTC periods, compared only at matching well-sampled hours within each weekday pair. This compares retained historical reports; it is not a current wait or a forecast.

## What the records show

The difference between period medians is **${Math.abs(s.change)} min**, ${s.change > 0 ? 'higher' : 'lower'} in the recent period. Comparing each day with the same weekday one week earlier, ${s.sameDirectionDays} of seven days moved in that direction. This describes the observed archive; it does not establish why the change happened.

**Daily summaries by UTC date:**
${table}

## Method and limits

We used ${s.observations} retained observations. Each included hour has at least three observations in both weeks. Every weekday pair shares at least 12 UTC hours. We take each hour's median, the median of the matching hours for each day, then the median of the seven daily summaries in each period. Hours with more collection requests therefore receive no extra weight. Repeated reports can reflect the same CBP reading; they are not independent measurements from travelers.

The publication filter requires a change of at least 15 minutes and 25%, separation between the central ranges of daily summaries and matching direction in at least six weekday pairs. This is not a statistical significance test. Missing values are excluded; zero counts only when the source records zero. Different weekday pairs can cover different hours, as listed above; these are matched-hour summaries, not full-day estimates. Coverage excludes Ready, SENTRI, pedestrians, commercial vehicles and southbound travel. UTC dates can include parts of two local days.

## Using this report

The change provides planning context, but cannot guarantee an arrival time, total travel time or inspection outcome. [Check the current CBP report on BorderPulse](https://borderpulse.com/crossing/${meta.slug}/) and its timestamp before leaving. This report does not establish entry, health or immigration requirements.

## Sources and dates

- [CBP Border Wait Times](https://bwt.cbp.gov/): primary source. Latest archive retrieval: ${receipt.fetchedAt}.
- [Historical archive at the revision used](${sourceUrl}). Archive generated: ${receipt.historyGeneratedAt}.
- [Report evidence, observations and calculations](${evidenceUrl}). Prepared for automated publication: ${receipt.publishedAt}.
`;
  return '---\n' + Object.entries(fm).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n') + '\n---\n\n' + body;
}

export function validateReceipt(receipt) {
  requireValue(receipt.version === VERSION && receipt.category === 'historical-operational-report', 'Unsupported autonomous report category');
  requireValue(typeof receipt.port === 'string' && Object.hasOwn(PORTS, receipt.port) && isIso(receipt.publishedAt) && receipt.publicationDate === date(receipt.publishedAt), 'Invalid receipt identity/date');
  requireValue(/^[a-f0-9]{40}$/.test(receipt.sourceCommit) && receipt.sourceUrl === 'https://bwt.cbp.gov/api/bwtpublicmod', 'Invalid source provenance');
  for (const timestamp of [receipt.fetchedAt, receipt.historyGeneratedAt]) {
    const age = Date.parse(receipt.publishedAt) - Date.parse(timestamp);
    requireValue(isIso(timestamp) && Number.isFinite(age) && age >= 0 && age <= 90 * 60_000, 'Report was not fresh at publication');
  }
  const summary = summarize(receipt.observations, Date.parse(receipt.publishedAt));
  requireValue(summary && JSON.stringify(summary) === JSON.stringify(receipt.summary), 'Report calculations do not reproduce');
  requireValue(receipt.fingerprint === digest({ port: receipt.port, prior: summary.priorMedian, recent: summary.recentMedian, direction: Math.sign(summary.change) }), 'Evidence fingerprint mismatch');
}

export function validateAutonomousPosts(root) {
  const dir = path.join(root, 'src/content/blog');
  const groups = new Map();
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.mdx'))) {
    const raw = fs.readFileSync(path.join(dir, file), 'utf8'), { data: fm } = matter(raw);
    if (fm.source !== 'daily-pilot') {
      requireValue(!fm.evidenceReceipt && !fm.evidenceFingerprint, 'Receipt metadata requires daily-pilot source');
      continue;
    }
    requireValue(/^[a-z0-9-]+\.json$/.test(fm.evidenceReceipt), 'Unsafe/missing evidence receipt path');
    const receipt = JSON.parse(fs.readFileSync(path.join(root, 'public/data/blog-evidence', fm.evidenceReceipt), 'utf8'));
    validateReceipt(receipt);
    requireValue(raw === renderPost(receipt, fm.lang) && file === matter(raw).data.slug + '.mdx', `Autonomous content changed outside validated grammar: ${file}`);
    if (!groups.has(fm.translationKey)) groups.set(fm.translationKey, []);
    groups.get(fm.translationKey).push(fm.lang);
  }
  for (const [key, langs] of groups) requireValue(langs.sort().join(',') === 'en,es', `Missing/inconsistent translation pair: ${key}`);
  return groups.size;
}
