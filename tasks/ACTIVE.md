# Active BorderPulse execution

## Current stage: build the test-mode paid workflow

The public site is still served from GitHub Pages. The free release baseline is
green and the paid workflow now has a test-only account/API foundation plus a
server-side alert evaluator. Do not start live billing or a production Vercel
cutover until provider, privacy, financial, and QA gates are verified.

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
- [x] Implement test-mode auth, Stripe entitlements, and email-alert mechanics behind
      explicit launch gates.
- [x] Make Stripe entitlement state monotonic across retries and out-of-order
      webhook delivery; add weekday selection to the alert rule UI and keep
      checkout hidden until billing configuration is present.
- [ ] Run product, privacy, support, financial, marketing, accessibility, and
      production QA gates; request approval before live billing or cutover.
- [ ] Resolve the owner choices in `docs/OWNER-APPROVAL.md`; only then create
      test provider resources and record their literal readback.

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
