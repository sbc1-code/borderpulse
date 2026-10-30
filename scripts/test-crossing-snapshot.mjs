import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
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
test('San Diego camera metadata and snapshots identify U.S. roads rather than the Mexico queue', () => {
  const port = { ...crossing, port_number: '250401', name: 'San Ysidro' };
  const html = snapshotHtml([port], { '250401': 'san-ysidro' }, stamp, true);
  assert.match(html, /cwwp2.dot.ca.gov/);
  assert.match(html, /U.S. road approaches, not the inspection queue/);
  assert.doesNotMatch(html, /Fideicomiso|puentesfronterizos/);
  assert.match(crossingSearchTitle(port, 'en', 'approach'), /road cameras/);
  assert.match(crossingSearchTitle(port, 'es', 'approach'), /cámaras viales/);
  assert.match(crossingSearchTitle(port, 'en', 'external'), /camera sources/);
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

test('recorded pedestrian-report disappearance preserves the same sitemap and prerender canonicals', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-capability-build-'));
  const snapshots = JSON.parse(fs.readFileSync(new URL('./fixtures/walk-drive-capability.json', import.meta.url)));
  const expected = [
    'https://borderpulse.com/walk-or-drive/progreso-progreso-international-bridge/',
    'https://borderpulse.com/walk-or-drive/santa-teresa-santa-teresa-port-of-entry/',
  ];
  try {
    for (const dir of ['src/lib', 'src/components/utils', 'src/components/blog', 'scripts/lib']) {
      fs.cpSync(path.join(root, dir), path.join(temporary, dir), { recursive: true });
    }
    for (const file of ['scripts/build-sitemap.mjs', 'scripts/prerender.mjs']) {
      fs.copyFileSync(path.join(root, file), path.join(temporary, file));
    }
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(temporary, 'node_modules'));
    fs.writeFileSync(path.join(temporary, 'package.json'), '{"type":"module"}');
    fs.mkdirSync(path.join(temporary, 'public/data'), { recursive: true });
    const unavailable = { ...snapshots[1], crossings: snapshots[1].crossings.map(c => ({ ...c, port_status: 'Closed', lanes: {} })) };
    for (const snapshot of [...snapshots, unavailable]) {
      fs.rmSync(path.join(temporary, 'dist'), { recursive: true, force: true });
      fs.mkdirSync(path.join(temporary, 'dist'));
      fs.copyFileSync(path.join(root, 'index.html'), path.join(temporary, 'dist/index.html'));
      // Donna is a different port; these two source-backed exceptions must not
      // create a pedestrian route there merely because its name says Progreso.
      const data = { ...snapshot, crossings: [...snapshot.crossings,
        { port_number: '230902', name: 'Progreso - Donna International Bridge', lanes: {} }] };
      fs.writeFileSync(path.join(temporary, 'public/data/crossings.json'), JSON.stringify(data));
      for (const script of ['scripts/build-sitemap.mjs', 'scripts/prerender.mjs']) {
        execFileSync(process.execPath, [script], { cwd: temporary, stdio: 'pipe' });
      }
      const sitemap = [...fs.readFileSync(path.join(temporary, 'public/sitemap.xml'), 'utf8')
        .matchAll(/<loc>([^<]+\/walk-or-drive\/[^<]+)<\/loc>/g)].map(m => m[1]).sort();
      assert.deepEqual(sitemap, expected, snapshot.sourceCommit);
      const generated = fs.readdirSync(path.join(temporary, 'dist/walk-or-drive')).flatMap(slug => {
        const html = fs.readFileSync(path.join(temporary, 'dist/walk-or-drive', slug, 'index.html'), 'utf8');
        if (/http-equiv="refresh"/.test(html)) return [];
        const url = `https://borderpulse.com/walk-or-drive/${slug}/`;
        assert.ok(html.includes(`<link rel="canonical" href="${url}"`), 'page keeps its own canonical');
        return [url];
      }).sort();
      assert.deepEqual(generated, expected, 'no missing, extra or leftover prerender pages');
    }
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
