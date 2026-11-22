import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const root = new URL('../', import.meta.url);
export const advisory = 'GHSA-fc5q-39xc-vjpf';
const installedPath = 'node_modules/picomatch';
const parser = new URL(installedPath + '/lib/parse.js', root);
const originalDigest = '4e1e05447668aa1e94366c5516a2bcd8f5fff800cc92b1d0cd7d77703b8618c4';
const patchedDigest = 'ec0e0c2419a5e9aebb52f90d2427dee391c5e3792f9dbb870680b820d60260ee';
const digest = source => createHash('sha256').update(source).digest('hex');
const start = '  const extglobOpen = (type, value) => {';
const guarded = start + `
    // BorderPulse build policy for GHSA-fc5q-39xc-vjpf.
    if (type === 'star' || type === 'plus') {
      throw new SyntaxError('Repeated extglobs are disabled in the BorderPulse build');
    }
`;

function verifyLock() {
  const lock = JSON.parse(readFileSync(new URL('package-lock.json', root)));
  const paths = Object.keys(lock.packages).filter(path => path.endsWith('/picomatch'));
  assert.deepEqual(paths, [installedPath], 'Review every picomatch installation before updating');
  assert.equal(lock.packages[installedPath].version, '4.0.7');
  assert.equal(lock.packages[installedPath].integrity,
    'sha512-qcJu88Q2IWqJsDD529JKMdwGm/dvInW4HvQnRwiH9JtihJvzGOscDtHE3x1pBKeUOTysQ8kVmLnJ2kJu7yhcGA==');
}

export function verifyInstalledGuard(nodes) {
  verifyLock();
  assert.deepEqual(nodes, [installedPath], 'Registry findings must cover exactly the guarded copy');
  assert.equal(digest(readFileSync(parser)), patchedDigest, 'picomatch guard missing or modified');
  const match = require('picomatch');
  assert.equal(match('src/**/*.js')('src/main.js'), true);
  for (const pattern of ['+(item)', '*(item)']) {
    assert.throws(() => match(pattern), /Repeated extglobs are disabled/);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyLock();
  // A production-only install legitimately omits this development dependency.
  if (!existsSync(new URL(installedPath + '/', root)) &&
      process.env.npm_config_omit?.split(/[,\s]+/).includes('dev')) process.exit(0);
  const source = readFileSync(parser, 'utf8');
  if (digest(source) !== patchedDigest) {
    assert.equal(digest(source), originalDigest, 'Unrecognized picomatch parser');
    const patched = source.replace(start, guarded);
    assert.equal(digest(patched), patchedDigest);
    writeFileSync(parser, patched);
  }
  verifyInstalledGuard([installedPath]);
}
