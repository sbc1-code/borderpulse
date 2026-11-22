import { availableLaneWait } from '../../src/lib/crossingAvailability.js';
import { crossingDisplayName } from '../../src/lib/crossingNames.js';
import { CORRIDORS } from '../../src/lib/corridors.js';
import { cameraSourceFor } from '../../src/lib/cameras.js';
import { buildSlugMap } from '../../src/lib/slugs.js';

const BASE = 'https://borderpulse.com';
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const COPY = {
  en: {
    heading: 'US–Mexico border wait times',
    intro: 'Official CBP northbound reports, crossing hours, local comparisons and historical planning.',
    language: 'English and Spanish are available. The Spanish home page is separate from the in-page language control.',
    languageLink: 'Español',
    languageHref: '/es/',
    fetched: 'Published snapshot fetched:',
    disclaimer: 'This is a published snapshot, not a live feed. Individual lane report times can be older. Check the interactive report or',
    beforeLeaving: 'before leaving.',
    source: 'CBP',
    choose: 'Choose a crossing area',
    compare: 'Compare nearby crossings:',
    caption: 'Reported standard passenger waits to the U.S.',
    crossing: 'Crossing',
    wait: 'Reported wait',
    clock: 'CBP report clock',
    hours: 'Posted hours',
    closed: 'Closed in this snapshot',
    missing: 'No standard-lane report',
    unavailable: 'unavailable',
    reportUnavailable: 'CBP report time unavailable',
    hoursUnavailable: 'Official hours unavailable',
    consider: 'Consider your eligible lane, extra driving and destination. These numbers do not compare total trip time.',
    method: 'Data methodology',
    methodHref: '/methodology/',
    areaHref: id => `/?area=${id}`,
    cameraLabel: owner => `View official camera sources: ${owner}`,
    approach: 'These are U.S. road approaches, not the inspection queue from Mexico into the U.S.',
    provider: 'Camera access and availability are controlled by the provider.',
    single: name => `${name} border wait times`,
    pageTitle: 'Published snapshot | Border Pulse',
  },
  es: {
    heading: 'Tiempos de espera en la frontera EE.UU.-México',
    intro: 'Reportes oficiales de CBP hacia Estados Unidos, horarios, comparaciones locales y planificación histórica.',
    language: 'Hay una página de inicio en español. El control de idioma dentro de la página no la sustituye.',
    languageLink: 'English',
    languageHref: '/',
    fetched: 'Instantánea publicada, consultada:',
    disclaimer: 'Esta es una instantánea publicada, no un feed en vivo. La hora de cada carril puede ser anterior. Revisa el reporte interactivo o',
    beforeLeaving: 'antes de salir.',
    source: 'CBP',
    choose: 'Elige una zona de cruce',
    compare: 'Compara cruces cercanos:',
    caption: 'Esperas reportadas de auto estándar hacia EE.UU.',
    crossing: 'Cruce',
    wait: 'Espera reportada',
    clock: 'Reloj del reporte de CBP',
    hours: 'Horario publicado',
    closed: 'Cerrado en esta instantánea',
    missing: 'Sin reporte de carril estándar',
    unavailable: 'no disponible',
    reportUnavailable: 'Hora del reporte de CBP no disponible',
    hoursUnavailable: 'Horario oficial no disponible',
    consider: 'Ten en cuenta tu carril elegible, el manejo extra y el destino. Estas cifras no comparan el tiempo total del viaje.',
    method: 'Metodología de los datos',
    methodHref: '/metodologia/',
    areaHref: id => `/es/?area=${id}`,
    cameraLabel: owner => `Ver fuentes oficiales de cámaras: ${owner}`,
    approach: 'Son accesos viales de EE.UU., no la fila de inspección de México hacia EE.UU.',
    provider: 'El acceso y la disponibilidad de la cámara los controla el proveedor.',
    single: name => `Tiempos de espera en ${name}`,
    pageTitle: 'Instantánea publicada | Border Pulse',
  },
};

function link(href, text, framed, external = false) {
  const target = framed ? (external ? ' target="_blank" rel="noopener noreferrer"' : ' target="_top"') : '';
  return `<a href="${esc(href)}"${target}>${text}</a>`;
}

// Visible, useful HTML for every visitor before the app loads, including when
// JavaScript is unavailable. createRoot replaces the copy inside the React root
// with the updating app. The original snapshot timestamp is never rewritten
// into a live promise.
export function snapshotHtml(crossings, portToSlug, fetchedAt, single = false, options = {}) {
  const lang = options.lang === 'es' ? 'es' : 'en';
  const framed = Boolean(options.framed);
  const t = COPY[lang];
  const heading = single ? t.single(crossingDisplayName(crossings[0])) : t.heading;
  const areas = single ? '' : `<nav aria-label="${esc(t.choose)}"><p>${esc(t.compare)}</p>${CORRIDORS.map(c => `<span style="display:inline-block;padding:12px;margin:4px;border:1px solid #cbd5e1;border-radius:8px">${link(t.areaHref(c.id), esc(c.name), framed)}</span>`).join(' ')}</nav>`;
  const rows = crossings.map(c => {
    const slug = portToSlug[c.port_number];
    const lane = c.lanes?.passenger_standard;
    const wait = availableLaneWait(c, 'passenger_standard');
    const closed = (c.port_status || '').trim().toLowerCase() === 'closed';
    const value = closed ? t.closed : wait == null ? t.missing : `${wait} min`;
    const name = esc(crossingDisplayName(c));
    const nameCell = slug ? link(`/crossing/${slug}/`, name, framed) : name;
    return `<tr><th scope="row" style="text-align:left;padding:12px">${nameCell}</th><td style="padding:12px">${esc(value)}</td><td style="padding:12px">${esc(lane?.update_time || t.reportUnavailable)}</td><td style="padding:12px">${esc(c.hours || t.hoursUnavailable)}</td></tr>`;
  }).join('');
  const cameraSource = single && cameraSourceFor(crossings[0]?.port_number);
  const cameraLink = cameraSource
    ? `<p>${link(cameraSource.sourceUrl, esc(t.cameraLabel(cameraSource.owner)), framed, true)}. ${esc(cameraSource.kind === 'approach' ? t.approach : t.provider)}</p>` : '';
  return `<main data-prerender="crossing-snapshot" lang="${lang}" style="max-width:1100px;margin:0 auto;padding:24px;color:#0f172a;background:#fff;font-family:system-ui,sans-serif">
    <h1>${esc(heading)}</h1>
    <p>${esc(t.intro)}</p>
    <p>${esc(t.language)} ${link(t.languageHref, esc(t.languageLink), framed)}</p>
    <p>${esc(t.fetched)} <time datetime="${esc(fetchedAt)}">${esc(fetchedAt || t.unavailable)}</time>. ${esc(t.disclaimer)} ${link('https://bwt.cbp.gov/', esc(t.source), framed, true)} ${esc(t.beforeLeaving)}</p>
    ${areas}
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><caption style="text-align:left;padding:12px 0">${esc(t.caption)}</caption><thead><tr><th scope="col">${esc(t.crossing)}</th><th scope="col">${esc(t.wait)}</th><th scope="col">${esc(t.clock)}</th><th scope="col">${esc(t.hours)}</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${cameraLink}
    <p>${esc(t.consider)} ${link(t.methodHref, esc(t.method), framed)}</p>
  </main>`;
}

export function snapshotDocument(doc, { lang = 'en', framed = true } = {}) {
  const language = lang === 'es' ? 'es' : 'en';
  const crossings = doc?.crossings || [];
  const { portToSlug } = buildSlugMap(crossings);
  const path = language === 'es' ? '/snapshot/es/' : '/snapshot/';
  const canonical = `${BASE}${path}`;
  const hreflang = language === 'es' ? 'es' : 'en';
  const title = COPY[language].pageTitle;
  const body = snapshotHtml(crossings, portToSlug, doc?.fetched_at, false, { lang: language, framed });
  return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, follow" />
  <title>${esc(title)}</title>
  <link rel="canonical" href="${canonical}" />
  <link rel="alternate" hreflang="${hreflang}" href="${canonical}" />
  <link rel="alternate" hreflang="x-default" href="${canonical}" />
</head>
<body>
${body}
</body>
</html>
`;
}

export function refreshableSnapshot(content, lang = 'en') {
  const language = lang === 'es' ? 'es' : 'en';
  const src = language === 'es' ? '/snapshot/es/' : '/snapshot/';
  const title = language === 'es'
    ? 'Instantánea publicada de esperas reportadas'
    : 'Published snapshot of reported border waits';
  return `<noscript>
<style>#bp-baked-snapshot{display:none !important}</style>
<iframe src="${src}" title="${esc(title)}" style="display:block;width:100%;height:4200px;border:0;background:#fff"></iframe>
</noscript>
<div id="bp-baked-snapshot">${content}</div>`;
}

export function injectSnapshot(html, content, options = {}) {
  const target = /<div id="root"><\/div>/;
  if (!target.test(html)) throw new Error('Expected one empty React root for snapshot injection');
  const body = options.refresh ? refreshableSnapshot(content, options.lang || 'en') : content;
  return html.replace(target, `<div id="root">${body}</div>`);
}
