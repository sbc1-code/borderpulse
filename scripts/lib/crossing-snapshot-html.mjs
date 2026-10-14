import { availableLaneWait } from '../../src/lib/crossingAvailability.js';
import { crossingDisplayName } from '../../src/lib/crossingNames.js';
import { CORRIDORS } from '../../src/lib/corridors.js';
import { camerasFor, CAMERA_SOURCE } from '../../src/lib/cameras.js';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Visible, useful HTML for every visitor before the app loads, including when
// JavaScript is unavailable. createRoot replaces it with the updating app.
// The original snapshot timestamp is never rewritten into a "live" promise.
export function snapshotHtml(crossings, portToSlug, fetchedAt, single = false) {
  const heading = single
    ? `${crossingDisplayName(crossings[0])} border wait times`
    : 'US–Mexico border wait times';
  const areas = single ? '' : `<nav aria-label="Choose a crossing area"><p>Compare nearby crossings:</p>${CORRIDORS.map(c => `<a href="/?area=${esc(c.id)}" style="display:inline-block;padding:12px;margin:4px;border:1px solid #cbd5e1;border-radius:8px">${esc(c.name)}</a>`).join(' ')}</nav>`;
  const rows = crossings.map(c => {
    const slug = portToSlug[c.port_number];
    const lane = c.lanes?.passenger_standard;
    const wait = availableLaneWait(c, 'passenger_standard');
    const closed = (c.port_status || '').trim().toLowerCase() === 'closed';
    const value = closed ? 'Closed in this snapshot' : wait == null ? 'No standard-lane report' : `${wait} min`;
    return `<tr><th scope="row" style="text-align:left;padding:12px"><a href="/crossing/${esc(slug)}/">${esc(crossingDisplayName(c))}</a></th><td style="padding:12px">${esc(value)}</td><td style="padding:12px">${esc(lane?.update_time || 'CBP report time unavailable')}</td><td style="padding:12px">${esc(c.hours || 'Official hours unavailable')}</td></tr>`;
  }).join('');
  const cameraLink = single && camerasFor(crossings[0]?.port_number).length
    ? `<p><a href="${CAMERA_SOURCE}">View public bridge cameras in the official Fideicomiso directory</a>. Stream availability is controlled by the provider.</p>` : '';
  return `<main data-prerender="crossing-snapshot" style="max-width:1100px;margin:0 auto;padding:24px;color:#0f172a;background:#fff;font-family:system-ui,sans-serif">
    <h1>${esc(heading)}</h1>
    <p>Official CBP northbound reports, crossing hours, local comparisons and historical planning. English and Spanish are available in the interactive app.</p>
    <p>Published snapshot fetched: <time datetime="${esc(fetchedAt)}">${esc(fetchedAt || 'unavailable')}</time>. This is a published snapshot, not a live feed. Individual lane report times can be older. Check the interactive report or <a href="https://bwt.cbp.gov/">CBP</a> before leaving.</p>
    ${areas}
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><caption style="text-align:left;padding:12px 0">Reported standard passenger waits to the U.S.</caption><thead><tr><th scope="col">Crossing</th><th scope="col">Reported wait</th><th scope="col">CBP report clock</th><th scope="col">Posted hours</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${cameraLink}
    <p>Consider your eligible lane, extra driving and destination. These numbers do not compare total trip time. <a href="/methodology/">Data methodology</a>.</p>
  </main>`;
}

export function injectSnapshot(html, content) {
  const target = /<div id="root"><\/div>/;
  if (!target.test(html)) throw new Error('Expected one empty React root for snapshot injection');
  return html.replace(target, `<div id="root">${content}</div>`);
}
