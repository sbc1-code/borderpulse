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

  assert.match(homepage, /paid southbound estimates are paused/i);
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
  assert.match(embed, /freshnessOf\(updatedAt\)/);
  assert.match(embed, /liveLabel\(freshness\.state, freshness\.age, lang\)/);
  assert.match(embed, /freshness\.state === FRESHNESS\.FRESH/);
  assert.doesNotMatch(embed, /\{lang === 'es' \? 'En vivo' : 'Live'\} · \{formatRelative\(updatedAt, lang\)\}/);
});
