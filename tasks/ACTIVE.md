# Active BorderPulse execution

## Current stage: free-product reliability and workflow discovery

The public site remains on GitHub Pages, whose current CBP JSON is a fallback.
The free product remains the near-term priority. The protected Vercel preview
has a tested five-minute CDN-cached official-data function, but has no
`borderpulse.com` domain or production cutover. The paid workflow is preserved
in PR #87 as a later option, not a launch commitment.

Do not create providers, invite beta users, promise a price, or publish a paid
offer. `docs/BUSINESS-VIABILITY.md` records why generic widgets, public-data
APIs, and basic alerts are not differentiated enough. Use
`docs/SAN-YSIDRO-WORKFLOW-DISCOVERY.md` for the authorized future discovery
cohort and `docs/MEASUREMENT-PLAN.md` for the evidence gates.

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
- [x] Restore public data publication. PR [#88](https://github.com/sbc1-code/borderpulse/pull/88)
      merged at `5c0798ab`; Pages run `35791687491` passed and live JSON read
      back 42 official crossings at `2026-09-22T23:06:59Z`.
- [x] Produce and verify the protected Vercel preview data path. Commit
      `7e24c67a` adds `api/public/crossings`; preview
      `dpl_GULTHFLZxvbDa4sjuwhN22DuARWa` lists it as a deployed 10-second Node
      function. It has not yet had an authorized browser/runtime check.
- [x] Complete a product-truth audit of the free app. “Live” now depends on a
      fresh source snapshot across the dashboard, comparison, detail, embed,
      share, and walk-or-drive flows; generated route heads no longer promise
      live/current readings; and `/plus/` is a non-offering research notice
      removed from public navigation and the sitemap. The preserved prototype
      and provider code remain fail-closed for a later evidence gate.
- [ ] Obtain authorized Umami and Vercel-preview access, then read the actual
      decision funnel and test the live function/CDN response before any domain
      cutover decision.
- [ ] After separate authorization, conduct the five-account San Ysidro-Tijuana
      workflow discovery cohort. Do not send outreach yet; use
      `docs/SAN-YSIDRO-WORKFLOW-DISCOVERY.md`.
- [ ] Decide only from evidence: offer one manual pilot after three independent
      repetitions of the same differentiated workflow plus a written payment
      commitment, or keep the product free and stop commercial feature work.

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

## Current verified state, 2026-09-22

- The public Pages fallback is current at the recorded live readback above, but
  successful GitHub scheduled fetches that day were separated by 2h48 to 5h27.
  Do not make a 15-minute freshness promise from the Action schedule.
- `agent/operator-control-plane` commit `7e24c67a` passed the full
  `npm run operator:verify` suite with 402 desktop/mobile browser navigations,
  its focused public-function tests, a direct official CBP writer fetch, local
  Vercel build, and two remote release checks. Commit `536e7e7f` revised the
  commercial hypothesis after the competitive check; its two remote release
  checks also passed.
- The Vercel preview is protected by existing Vercel Authentication. Anonymous
  access redirects to SSO, so its remote function response and CDN headers are
  not yet verified. No protection setting was changed.
- Vercel does contain a production-target placeholder,
  `dpl_AqCbysDcDBDu3v2ApW1moxa3qY5A`, but inspection shows no application build
  output and only a Vercel alias. Its root and data route are SSO-protected;
  it is not a public BorderPulse site or a `borderpulse.com` cutover. No custom
  domain, provider setup, database, customer data, billing action, customer
  invite, or marketing publication occurred.
- Commit `e129c473` reconciles the old $5/provider-setup handoff with the
  evidence-based commercial decision: a business pilot remains manual, and the
  preserved consumer-alert stack stays parked until its separate user-demand
  gate passes. It also makes the embed reserve “Live” for fresh official data
  and makes the parked evaluator read the current official feed rather than
  the slow static fallback. Full operator verification (402 browser
  navigations), local Vercel packaging, and two remote release checks passed.
- Commit `f5984923` is deployed as protected preview
  `dpl_6KVBdwUq3TjSTwfgg9xJMpaTfer7` at
  `https://borderpulse-5f8s3hndn-sbc1-codes-projects.vercel.app`. Vercel lists
  the updated alert evaluator as a 412.86 KB Node function. Anonymous root and
  `/api/public/crossings` requests both return the existing SSO 302; no
  protection or production target was changed.

## Historical baseline evidence

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
