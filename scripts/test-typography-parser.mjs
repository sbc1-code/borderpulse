import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Worker } from 'node:worker_threads';

// Resolve the parser used by the CSS plugin, including a nested dependency.
const require = createRequire(import.meta.url);
const typographyRequire = createRequire(require.resolve('@tailwindcss/typography/package.json'));
const parserPath = typographyRequire.resolve('postcss-selector-parser');
const version = typographyRequire('postcss-selector-parser/package.json').version;
const utils = typographyRequire('./src/utils.js');

test('Typography resolves a version patched for GHSA-rj75-hqrm-r3gf', () => {
  assert.match(version, /^\d+\.\d+\.\d+$/);
  const [major, minor, patch] = version.split('.').map(Number);
  const patched = (major === 6 && (minor > 1 || (minor === 1 && patch >= 5)))
    || major > 7 || (major === 7 && (minor > 1 || (minor === 1 && patch >= 6)));
  assert.ok(patched, 'Typography actually resolves vulnerable parser ' + version);
});

test('Typography preserves pseudo-element and selector-list transformations', () => {
  const cases = [
    ['.alpha::before', ['::before', '.alpha']],
    ['.alpha::before, .beta::before', ['::before', '.alpha, .beta']],
    ['.alpha:hover', [null, '.alpha:hover']],
    ['.alpha:not(.beta)::after', ['::after', '.alpha:not(.beta)']],
    ['[data-state="open"] > a::before', ['::before', '[data-state="open"] > a']],
    ['section > p::before, section > a::after', [null, 'section > p::before, section > a::after']],
  ];
  for (const [selector, expected] of cases) {
    assert.deepEqual(utils.commonTrailingPseudos(selector), expected);
  }
});

test('flat class/id selectors parse within a bounded worker deadline', { timeout: 8_000 }, async t => {
  // The advisory uses a flat 400KB selector: nesting guards cannot protect it.
  // Bound both time and heap; a regression stops only this test's own worker.
  const source = [
    "const { parentPort, workerData } = require('node:worker_threads');",
    "const { performance } = require('node:perf_hooks');",
    'const parser = require(workerData.parserPath);',
    "const selector = '.a#b'.repeat(100_000);",
    'const started = performance.now();',
    'const ast = parser().astSync(selector);',
    'parentPort.postMessage({ nodes: ast.first.nodes.length,',
    '  roundTrip: ast.toString() === selector, elapsedMs: performance.now() - started });',
  ].join('\n');
  const worker = new Worker(source, {
    eval: true,
    workerData: { parserPath },
    resourceLimits: { maxOldGenerationSizeMb: 256, maxYoungGenerationSizeMb: 32 },
  });
  let deadline;
  try {
    const result = await new Promise((resolve, reject) => {
      deadline = setTimeout(() => reject(new Error('Flat selector parsing exceeded the 5-second safety deadline')), 5_000);
      worker.once('message', resolve);
      worker.once('error', reject);
      worker.once('exit', code => {
        if (code !== 0) reject(new Error('Parser worker exited with code ' + code));
      });
    });
    assert.equal(result.nodes, 200_000);
    assert.equal(result.roundTrip, true);
    t.diagnostic('Parser ' + version + ': 200000 selector nodes in ' + Math.round(result.elapsedMs) + 'ms');
  } finally {
    clearTimeout(deadline);
    await worker.terminate();
  }
});
