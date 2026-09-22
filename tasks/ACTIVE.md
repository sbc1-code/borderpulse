# Active BorderPulse execution

## Current stage: restore release truth

The public site is still served from GitHub Pages. The current remote deploy
builds, but its test gate fails on four high-severity dependency advisories.
Do not start live billing or a production Vercel cutover until this baseline is
green and the deployed artifact is verified.

## Next tasks

- [x] Repair the dependency security gate without weakening it; run the full
      release checks on the current remote `main`.
- [x] Remove the build's dependence on Git history for 30-day aggregates by
      committing an explicit, tested snapshot-history artifact.
- [ ] Produce a successful preview deployment on Vercel from the verified
      artifact; no production cutover yet.
- [x] Define the proposed paid-beta data model and entitlement contract before
      adding auth or checkout UI; see `docs/PAID-BETA-CONTRACT.md`. Final offer,
      price, legal, and billing approvals remain open.
- [ ] Implement test-mode auth, Stripe entitlements, and email alerts behind
      explicit launch gates.
- [ ] Run product, privacy, support, financial, marketing, accessibility, and
      production QA gates; request approval before live billing or cutover.

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
  minimal tables, server invariants, and owner approval gates. No auth, Stripe,
  email provider, or customer data has been added.
