#!/usr/bin/env node
/**
 * Security gate: fail the build on any NEW high or critical advisory.
 *
 * Threshold is `high`, not `moderate`, because two moderate react-router
 * advisories are knowingly accepted and cannot be cleared without a
 * semver-major React Router 6 -> 7 migration. Both were checked against this
 * codebase and are not reachable:
 *
 *   GHSA-337j-9hxr-rhxg  Arbitrary constructor injection via deserializeErrors()
 *                        in React Router SSR hydration. This app has no SSR.
 *                        src/main.jsx uses createRoot (not hydrateRoot), and
 *                        scripts/prerender.mjs is string templating that never
 *                        executes React. The hydration path does not exist.
 *
 *   GHSA-wrjc-x8rr-h8h6  Open redirect via backslash in <Link> / useNavigate.
 *                        There are zero useNavigate() calls in src/, and every
 *                        dynamic <Link to={...}> is a template literal with a
 *                        hardcoded path prefix (`/crossing/`, `/best-time/`,
 *                        `/blog/`, `/compare/`), so a target can never begin
 *                        with the `\\` or `/\` sequence the advisory requires.
 *
 * If either fact stops being true -- if SSR is added, or a bare
 * `to={someValue}` / `navigate(someValue)` appears -- do the v7 migration
 * instead of widening this gate.
 *
 * Re-check with: npm audit
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const THRESHOLD = ['critical', 'high'];
// Accept by ADVISORY ID, not by package name. Excusing the whole package
// would also silence a future critical in react-router, which is exactly the
// failure this gate exists to prevent.
const ACCEPTED_ADVISORIES = new Set([
  'GHSA-337j-9hxr-rhxg', // SSR deserializeErrors - no SSR in this app
  'GHSA-wrjc-x8rr-h8h6', // open redirect in Link/useNavigate - no bare targets
]);

const advisoryIds = (v) =>
  (v.via || [])
    .filter((x) => typeof x !== 'string')
    .map((x) => (x.url || '').split('/').pop())
    .filter(Boolean);

// A vulnerability is excused only when EVERY advisory behind it is accepted.
const isFullyAccepted = (v) => {
  const ids = advisoryIds(v);
  return ids.length > 0 && ids.every((id) => ACCEPTED_ADVISORIES.has(id));
};

let raw;
try {
  const { stdout } = await run('npm', ['audit', '--json'], { maxBuffer: 32 * 1024 * 1024 });
  raw = stdout;
} catch (err) {
  // npm audit exits non-zero when vulnerabilities exist; the JSON is still on stdout.
  raw = err.stdout;
  if (!raw) {
    console.error('[audit] could not run npm audit:', err.message);
    process.exit(1);
  }
}

let report;
try {
  report = JSON.parse(raw);
} catch {
  console.error('[audit] npm audit did not return parseable JSON');
  process.exit(1);
}

const counts = report.metadata?.vulnerabilities ?? {};
const vulns = Object.values(report.vulnerabilities ?? {});
const blocking = vulns.filter(
  (v) => THRESHOLD.includes(v.severity) && !isFullyAccepted(v)
);

console.log(
  `[audit] critical ${counts.critical ?? 0} · high ${counts.high ?? 0} · ` +
  `moderate ${counts.moderate ?? 0} · low ${counts.low ?? 0}`
);

if (!blocking.length) {
  console.log('[audit] no blocking (high/critical) advisories  OK');
  process.exit(0);
}

console.error(`\n[audit] ${blocking.length} blocking advisory(ies):`);
for (const v of blocking) {
  const titles = (v.via || [])
    .filter((x) => typeof x !== 'string')
    .map((x) => x.title);
  console.error(`  ${v.severity.padEnd(8)} ${v.name}`);
  for (const t of titles) console.error(`           ${t}`);
  const fix = v.fixAvailable;
  console.error(
    `           fix: ${
      fix === true
        ? 'npm audit fix'
        : fix
          ? `${fix.name}@${fix.version}${fix.isSemVerMajor ? ' (MAJOR)' : ''}`
          : 'none available'
    }`
  );
}
console.error(
  '\n[audit] Run `npm audit fix`. If the only fix is semver-major, assess ' +
  'reachability first and record the decision in this file rather than ' +
  'silently raising the threshold.'
);
process.exit(1);
