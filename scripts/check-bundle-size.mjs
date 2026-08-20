#!/usr/bin/env node
/**
 * Fails the build if the eagerly-loaded entry chunk grows past its budget.
 *
 * Why this exists: the landing path is what a person on cellular data at a
 * bridge pays for. Dashboard is imported eagerly (src/App.jsx), so anything
 * added to it lands in the entry chunk. There was no size check before, and
 * the entry had already drifted from a documented ~161 KB raw to 177 KB with
 * nothing to catch it.
 *
 * Budgets are on GZIP, which is what actually crosses the wire.
 * Raise them deliberately, in a commit that says why.
 */
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const ASSETS = path.resolve(process.cwd(), 'dist', 'assets');

// entry chunk (index-*.js) and the single stylesheet
const BUDGETS = [
  { label: 'entry js', pattern: /^index-.*\.js$/, maxGzipKb: 62 },
  { label: 'css', pattern: /^index-.*\.css$/, maxGzipKb: 20 },
];

if (!fs.existsSync(ASSETS)) {
  console.error('[bundle] dist/assets not found. Run `npm run build` first.');
  process.exit(1);
}

const files = fs.readdirSync(ASSETS);
let failed = false;

for (const budget of BUDGETS) {
  const match = files.find((f) => budget.pattern.test(f));
  if (!match) {
    console.error(`[bundle] no file matched ${budget.pattern} in dist/assets`);
    failed = true;
    continue;
  }
  const raw = fs.readFileSync(path.join(ASSETS, match));
  const gzipKb = gzipSync(raw).length / 1024;
  const ok = gzipKb <= budget.maxGzipKb;
  const line =
    `[bundle] ${budget.label.padEnd(8)} ${match.padEnd(30)} ` +
    `${gzipKb.toFixed(2)} KB gzip (budget ${budget.maxGzipKb} KB)`;
  if (ok) {
    console.log(`${line}  OK`);
  } else {
    console.error(`${line}  OVER BUDGET`);
    failed = true;
  }
}

if (failed) {
  console.error(
    '\n[bundle] Entry-chunk budget exceeded. Either trim the addition, move it ' +
    'behind a React.lazy route (see src/App.jsx), or raise the budget in ' +
    'scripts/check-bundle-size.mjs with a commit message explaining why.'
  );
  process.exit(1);
}
