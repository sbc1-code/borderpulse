# Active BorderPulse execution

## Current stage: validate free-product demand before paid infrastructure

The public site is still served from GitHub Pages. The free product remains the
near-term priority. The paid workflow is preserved in PR #87 as a later option,
not a launch commitment. Do not create providers, invite beta users, or make a
pricing promise until the PMF test in `docs/PMF-TEST.md` produces evidence.
The current business recommendation and testable offer hypotheses are in
`docs/BUSINESS-VIABILITY.md`.
Use `docs/MEASUREMENT-PLAN.md` for the exact reliability, product-use, and
commercial evidence required before resuming paid infrastructure.

## Next tasks

- [x] Repair the dependency security gate without weakening it; run the full
      release checks on the current remote `main`.
- [x] Remove the build's dependence on Git history for 30-day aggregates by
      committing an explicit, tested snapshot-history artifact.
- [x] Produce a successful preview deployment on Vercel from the verified
      artifact; no production cutover yet.
- [x] Define the proposed paid-beta data model and entitlement contract before
      adding auth or checkout UI; see `docs/PAID-BETA-CONTRACT.md`. Final offer,
      price, legal, and billing approvals remain open.
- [ ] Restore public data publication: CBP fetch runs are succeeding, but the
      GitHub Pages deploy gate on `origin/main` is failing its dependency audit.
      Do not call the data pipeline live until `borderpulse.com/data/crossings.json`
      reads a current snapshot again.
- [ ] Run a small discovery round and record repeated jobs, opt-ins, beta
      commitments, price reactions, and actual operating-cost inputs in
      `docs/PMF-TEST.md`.
- [ ] Decide whether one paid job has enough evidence to justify resuming PR
      #87, reshaping it, or leaving BorderPulse free for now.

## Parked until demand evidence

- Paid auth, Supabase, Stripe, Resend, billing operations, production Vercel
  cutover, and the existing Plus contract remain preserved but paused.
- The paid branch is not proof of product-market fit, customer demand, or a
  final price.

## Evidence required for the current stage

- Current remote commit and CI result are recorded, not inferred from local
  code.
- `npm run operator:verify` passes on the same commit intended for preview.
- Preview route smoke tests pass and the free public experience remains intact.
- No production deployment or live Stripe charge occurs during baseline work.

## Verified in this session

- Remote baseline reconciled to `12808875` before changes.
- `npm ci` installed 437 packages from the updated lockfile.
- `npm run operator:verify` passed: zero high/critical advisories, bundle
  budgets within limits, and 398 desktop/mobile route navigations passed.
- The vulnerable TOML parser was removed by replacing the unused upstream MDX
  frontmatter dependency with a small YAML-only local plugin plus a regression
  test. The two React Router moderates remain accepted by advisory ID.
- No production deployment, Stripe change, or customer communication occurred.

- `public/data/snapshot-history.json` contains 295 compact snapshots covering
  the current 30-day window; aggregate tests prove the build reads the artifact
  and not Git history.
- `docs/PAID-BETA-CONTRACT.md` defines the proposed BorderPulse Plus boundary,
  minimal tables, server invariants, and owner approval gates. Provider
  credentials, customer data, and billing state remain absent.
- The `api/` foundation contains fail-closed Vercel handlers for profile
  opt-in, entitlement readback, saved crossings, alert rules, Checkout,
  Customer Portal, and signed Stripe subscription webhooks. They require test
  configuration and have not been connected to a provider.
- The Plus UI includes saved-crossing/rule management and alert-delivery
  history. The evaluator is a protected Vercel function invoked by an optional
  15-minute GitHub Actions schedule; it skips safely until
  `BORDERPULSE_ALERT_EVALUATOR_URL` and `BORDERPULSE_CRON_SECRET` exist.
- `docs/LAUNCH-GATES.md` now records the remaining provider, legal/privacy,
  support, financial, marketing, and authenticated-QA gates. `/privacy/` and
  `/privacidad/` are draft surfaces, and account deletion is implemented but
  not provider-tested.
- The CBP fetch workflow is currently healthy: GitHub Actions run 2229
  completed successfully on 2026-09-22. Public publication is not healthy:
  Pages run 1149 failed in `npm test`, and the public JSON still reports a
  2026-09-04 snapshot. The last successful Pages deploy was run 1020 on
  2026-09-04. The isolated repair is pushed as `fix/restore-public-data` at
  `fe0e0fe5`; it passes build, zero high advisories, and 396 browser checks.
