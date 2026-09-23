import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('public trust copy does not claim live southbound estimates', () => {
  const homepage = read('index.html');
  const footer = read('src/components/dashboard/AboutFooter.jsx');
  const seo = read('src/lib/seo.js');
  const dashboard = read('src/pages/Dashboard.jsx');

  assert.match(homepage, /southbound estimates are paused/i);
  assert.match(homepage, /official northbound data only/i);
  assert.match(footer, /Southbound estimates are paused/i);
  assert.match(footer, /official northbound CBP data only/i);
  assert.doesNotMatch(homepage, /estimates delay at major crossings using live routing/i);
  assert.doesNotMatch(footer, /Southbound delays are estimated by Border Pulse/i);
  for (const source of [homepage, seo, dashboard]) {
    assert.doesNotMatch(source, /Real-Time US-Mexico/i);
  }
});

test('embed cards reserve the Live label for fresh official data', () => {
  const embed = read('src/pages/Embed.jsx');
  assert.match(embed, /useFreshnessClock\(\)/);
  assert.match(embed, /freshnessOf\(updatedAt, freshnessNow\)/);
  assert.match(embed, /liveLabel\(freshness\.state, freshness\.age, lang\)/);
  assert.match(embed, /freshness\.state === FRESHNESS\.FRESH/);
  assert.doesNotMatch(embed, /\{lang === 'es' \? 'En vivo' : 'Live'\} · \{formatRelative\(updatedAt, lang\)\}/);
});

test('freshness labels age while a dashboard, detail page, or comparison stays open', () => {
  const dashboard = read('src/pages/Dashboard.jsx');
  const detail = read('src/pages/CrossingDetail.jsx');
  const compare = read('src/pages/Compare.jsx');
  const card = read('src/components/dashboard/BorderCrossingCard.jsx');

  for (const source of [dashboard, detail, compare]) {
    assert.match(source, /useFreshnessClock\(\)/);
  }
  assert.match(dashboard, /freshnessOf\(state\.fetchedAt, freshnessNow\)/);
  assert.match(compare, /freshnessOf\(state\.fetchedAt, freshnessNow\)/);
  assert.match(detail, /snapshotAt=\{state\.fetchedAt\}/);
  assert.match(detail, /freshnessNow=\{freshnessNow\}/);
  assert.match(card, /freshnessOf\(snapshotAt \?\? updatedAt, freshnessNow\)/);
});

test('shared wait reports carry the source snapshot freshness, not share time', () => {
  const share = read('src/components/dashboard/ShareModal.jsx');
  const dashboard = read('src/pages/Dashboard.jsx');

  assert.match(share, /freshnessOf\(snapshotAt\)/);
  assert.match(share, /liveLabel\(freshness\.state, freshness\.age, language\)/);
  assert.doesNotMatch(share, /Real-time updates/);
  assert.match(dashboard, /snapshotAt=\{state\.fetchedAt\}/);
});

test('the paid prototype is not a public offer or navigation destination', () => {
  const plus = read('src/pages/Plus.jsx');
  const layout = read('src/Layout.jsx');
  const prerender = read('scripts/prerender.mjs');
  const sitemap = read('scripts/build-sitemap.mjs');

  assert.match(plus, /The paid product is in research/);
  assert.match(plus, /not accepting sign-ups, creating accounts, sending alerts, or taking payment/);
  assert.doesNotMatch(layout, /href: '\/plus\/'/);
  assert.match(prerender, /Paid product research/);
  assert.doesNotMatch(prerender, /Proposed private beta for saved northbound crossings/);
  assert.doesNotMatch(sitemap, /\$\{BASE\}\/plus\//);
});

test('static route heads do not promise a live or current wait reading', () => {
  const prerender = read('scripts/prerender.mjs');

  assert.match(prerender, /Latest published CBP wait report/);
  assert.match(prerender, /Compare official CBP wait reports/);
  assert.match(prerender, /CBP Wait-Report Comparison/);
  assert.doesNotMatch(prerender, /Border Wait Time Today: Live CBP Data/);
  assert.doesNotMatch(prerender, /Pick the faster crossing right now/);
});

test('methodology explains the same-origin data route and static fallback', () => {
  const about = read('src/pages/About.jsx');
  const methodology = read('src/pages/Methodology.jsx');

  assert.match(about, /Where the host provides an official-data route/);
  assert.match(about, /otherwise it uses the scheduled snapshot/);
  assert.doesNotMatch(about, /the same file the dashboard reads/);
  assert.match(methodology, /same-origin, normalized official-data route/);
  assert.match(methodology, /dashboard uses that published static snapshot/);
  assert.match(methodology, /ruta de datos oficiales normalizada y del mismo/);
});
