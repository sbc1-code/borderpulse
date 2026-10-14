import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { snapshotHtml, injectSnapshot } from './lib/crossing-snapshot-html.mjs';
import { crossingDisplayName, crossingSearchTerms, crossingSearchTitle } from '../src/lib/crossingNames.js';

const crossing = { port_number: '240202', name: 'El Paso - Paso Del Norte (PDN)',
  hours: '24 hrs/day', port_status: 'Open', lanes: { passenger_standard: { status: 'No Delay', lanes_open: 1, delay_minutes: 0, update_time: 'At 6:00 pm MDT' } } };
const slugs = { '240202': 'el-paso-paso-del-norte-pdn' };
const stamp = '2026-10-13T20:00:00.000Z';

test('visible snapshot preserves zero, report clock, original retrieval and useful navigation', () => {
  const html = snapshotHtml([crossing], slugs, stamp);
  assert.match(html, /<h1>US–Mexico border wait times<\/h1>/);
  assert.match(html, /0 min/);
  assert.match(html, /At 6:00 pm MDT/);
  assert.match(html, new RegExp(stamp.replaceAll('.', '\\.')));
  assert.match(html, /published snapshot, not a live feed/);
  assert.match(html, /href="\/\?area=el-paso-juarez"/);
  assert.match(html, /href="\/crossing\/el-paso-paso-del-norte-pdn\/"/);
  assert.doesNotMatch(html, /aria-hidden|inert|left:-9999|display:none/);
});
test('closure overrides retained numbers; missing reports are not zero', () => {
  assert.match(snapshotHtml([{ ...crossing, port_status: 'Closed' }], slugs, stamp), /Closed in this snapshot/);
  assert.doesNotMatch(snapshotHtml([{ ...crossing, lanes: {} }], slugs, stamp), /0 min/);
  assert.match(snapshotHtml([{ ...crossing, lanes: {} }], slugs, stamp), /No standard-lane report/);
});
test('single-crossing snapshot has local name and an official camera path', () => {
  const html = snapshotHtml([crossing], slugs, stamp, true);
  assert.match(html, /Santa Fe · Paso del Norte border wait times/);
  assert.match(html, /puentesfronterizos.gob.mx\/camaras-en-vivo.php/);
  assert.doesNotMatch(html, /Choose a crossing area/);
});
test('feed values are escaped and cannot inject active HTML', () => {
  const html = snapshotHtml([{ ...crossing, name: '<script>bad</script>', port_number: 'unknown', hours: '<img src=x>' }], { unknown: 'safe' }, stamp, true);
  assert.doesNotMatch(html, /<script>|<img/);
  assert.match(html, /&lt;script&gt;/);
});
test('snapshot mounts in the visible React root, and rejects a non-empty target', () => {
  const html = injectSnapshot('<html><body><div id="root"></div></body></html>', '<main>Report</main>');
  assert.match(html, /<div id="root"><main>Report<\/main><\/div>/);
  assert.throws(() => injectSnapshot('<div id="root">existing</div>', ''), /empty React root/);
});
test('local naming helps search without changing official identity or canonical slug', () => {
  assert.equal(crossing.name, 'El Paso - Paso Del Norte (PDN)');
  assert.match(crossingDisplayName(crossing), /Santa Fe/);
  assert.ok(crossingSearchTerms({ port_number: '240201', name: 'BOTA' }).includes('puente libre'));
  assert.ok(crossingSearchTerms({ port_number: '240801', name: 'Santa Teresa' }).includes('san jeronimo'));
  assert.match(crossingSearchTitle(crossing, 'en', true), /CBP wait times & cameras/);
  assert.match(crossingSearchTitle(crossing, 'es', true), /esperas CBP y cámaras/);
});
test('built homepage and every crossing page contain their own useful visible snapshot', () => {
  if (!fs.existsSync('dist/index.html')) return;
  assert.match(fs.readFileSync('dist/index.html', 'utf8'), /data-prerender="crossing-snapshot"/);
  assert.match(fs.readFileSync('dist/index.html', 'utf8'), /aria-label="All border crossings" aria-hidden="true" inert/);
  const doc = JSON.parse(fs.readFileSync('public/data/crossings.json', 'utf8'));
  for (const dir of fs.readdirSync('dist/crossing')) {
    const html = fs.readFileSync(`dist/crossing/${dir}/index.html`, 'utf8');
    if (html.includes('http-equiv="refresh"')) continue;
    assert.match(html, /data-prerender="crossing-snapshot"/, dir);
    assert.match(html, new RegExp(doc.fetched_at.replaceAll('.', '\\.')), dir);
    assert.doesNotMatch(html, /<h1>US–Mexico border wait times<\/h1>/, dir);
  }
  assert.doesNotMatch(fs.readFileSync('dist/privacy/index.html', 'utf8'), /data-prerender="crossing-snapshot"/);
});
