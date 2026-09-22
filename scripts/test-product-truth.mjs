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

  assert.match(homepage, /paid southbound estimates are paused/i);
  assert.match(homepage, /official northbound data only/i);
  assert.match(footer, /Southbound estimates are paused/i);
  assert.match(footer, /official northbound CBP data only/i);
  assert.doesNotMatch(homepage, /estimates delay at major crossings using live routing/i);
  assert.doesNotMatch(footer, /Southbound delays are estimated by Border Pulse/i);
});
