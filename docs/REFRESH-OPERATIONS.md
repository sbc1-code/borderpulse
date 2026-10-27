# Public data refresh

## Reliability continuation — 2026-10-27 UTC (local, unreleased)

- Release continuation: the owner explicitly approved the scoped Zod 4
  upgrade and freshness repairs on October 27, conditional on final review
  and exact-commit checks. This does not authorize cancelling or approving
  the obsolete Pages run. The existing Vercel publisher remains the release
  path after a passing guarded merge; do not duplicate-dispatch it.
- Existing PR #150 was fast-forwarded to public-metadata candidate
  `cb414c5d63feb5d3fde68a8877bdcff6638bc188`. Initial private-email pushes
  were rejected without changing the remote; metadata-only copies using the
  verified GitHub noreply identity preserve identical tested file trees and
  all original local branches. No email-privacy setting was changed.
- Both exact-head CI jobs passed source tests and security audit, then failed
  the unchanged size gate: the same entry compressed to 62.15 KiB on CI's
  Node 22 versus 61.96 KiB on the earlier local Node 25. Keep the 62 KiB gate.
  The follow-up moves directional history enumeration into the already lazy
  Analytics view, reuses safe storage helpers and validates stored history
  in one pass without sorting corrupted ordering. Snapshot writes remain
  synchronous, and invalid/future/expired/duplicate/older samples still fail
  closed. Remove redundant dashboard error wrapping; shared listener and
  storage boundaries continue to isolate failures. Official temporary Node
  22/24 runtimes are now used for final size verification. Fresh final-head
  CI and customer-path checks remain required before merge.
- Ownership: the canonical checkout and the earlier October 20 worktree have
  unrelated changes. This continuation uses the isolated clone
  `task-6/borderpulse-candidate`, branch `fix/reliability-candidate-20261027`.
  Merge `5abae6ad06c8ed1fd732be2da78dc02a1de9c536` preserves PR #150 head
  `1a7433f8c9e1605d20e739d0973f058e064a440f` and collector main
  `5f7693a74fb214708a9fd6c7e22c50a12b066d28`. The original branches and
  dirty worktrees are unchanged. Source repair is
  `07b114e6a1f9950926c92aec2511041af4cd5771`.
- Why this is additional work: PR #150 patches validation dependencies; it
  does not repair browser refresh state or browser-history timestamps. A
  successful waits request, failed next request and late optional FX response
  reproducibly emitted success again for the earlier reading. Cache each
  notification's outcome so late enrichment cannot erase failure and a new
  subscriber receives the actual last outcome. Valid recovery still works.
- The dashboard also recorded the viewing clock for each successful refresh,
  including an old static fallback. Record the supplied snapshot retrieval
  time and reject repeated/older, missing, invalid, future or expired samples.
  Zero remains a valid wait; missing and closed waits do not become zero.
  Version 2 history deliberately starts without reusing version 1's
  unverifiable viewing timestamps. The legacy raw value is retained unchanged.
  Source retrieval time still does not establish an individual lane report's
  date; existing raw CBP report labels and freshness thresholds are unchanged.
- Public evidence at 02:46 UTC: `/api/public/crossings` returned HTTP 200,
  42 crossings and `fetched_at=2026-10-27T02:46:39.503Z`. The publication
  manifest still identifies `d214944c11d9b7da0935e4dde2d47b02f2c02e64` and
  bundled CBP/history/FX retrievals from October 23 at approximately 17:22 UTC,
  about 81.4 hours earlier. Collector success is therefore distinct from
  bundled publication freshness. Vercel scheduled run `40346639406` failed
  its unchanged audit (one high Zod and two moderate entries); upload was
  skipped. At the later 02:59 UTC check, Pages run `40439591945` had been
  cancelled without starting a job, successor `40440984634` was pending and
  collector `40440913247` had succeeded. Main had advanced to data-only
  `6ff010bc172e581a032a6ff5d771bff77888d976`; the local candidate retains
  its explicitly tested earlier snapshot. No run was retried or cancelled here.
- A further read-only check found Pages run `36763480106`, dispatched September
  30 at source `9f6197138ffa7b6de4327ff518a12f423726c2f0`, still waiting at
  `github-pages` with no steps. Its exact historical workflow and today's
  workflow both use concurrency group `pages`. This supports a queue-blocker
  diagnosis; GitHub does not expose a definitive pending-reason field here.
  Pending-deployment readback reports no reviewer or timer and
  `current_user_can_approve=false`; no in-progress run was reported. Do not
  approve that obsolete source. Any separately authorized cancellation must
  account for queued Pages publication being able to proceed afterward, and
  retain environment/access policy and every release gate.
- Clean locked install, normal and Vercel-mode builds, full `npm test` with
  156 source/unit checks and 402 isolated headless browser navigations pass.
  The initial addition exceeded the
  62 KiB entry gate by 19 bytes; reusing the existing safe-storage writer and
  consolidating cache notification state brought it to 61.96 KiB in the normal
  build and 61.93 KiB in Vercel mode without a budget change. Current registry
  audit reports zero findings and the
  unchanged gate passes; separate synthetic high/unavailable reports both
  correctly fail. This later registry result does not lift the dependency
  review or publication hold. Audit, bundle and workflow policies are intact.
- Local preview is `http://127.0.0.1:3426/`; shell readback verifies its
  San Ysidro canonical, useful visible snapshot and 42-crossing input retrieved
  at `2026-10-27T02:37:52.699Z`. It is a localhost artifact, not a hosted
  preview or production release. Full route verification used only isolated
  headless contexts after parent coordination; EN/ES desktop/mobile covers
  retrieval aging, expiry, zero/missing/closed reports, interrupted refresh,
  recovery, keyboard menus, Back/Forward, history, no-JavaScript reports and
  metadata. Independent targeted browser checks also pass 25 flow groups:
  EN/ES at 1440/390px plus denied-storage recovery, actual rendered zero/trend
  states, source-dated history, preserved v1 data, repeated/enriched/older
  snapshots, failed refresh followed by delayed FX, and keyboard/remount paths.
  All 71 live endpoint requests were intercepted and no uncaught page errors
  occurred. Eight final screenshots were captured and representative desktop/
  mobile pixels inspected. Synthetic fixtures are local test evidence, not
  measured crossing conditions. Native Safari, VoiceOver and physical devices
  remain unrun.
- No push, duplicate PR, merge to main, preview/production deployment,
  credential, service, account/access setting, audit exception or monitor.
  The scoped release decision above supersedes the earlier hold; passing
  final exact-head CI remains mandatory before merging or invoking the
  existing production publisher.
  Fresh public manifest/history/FX readback and two subsequent scheduled runs
  must then establish publication recovery. No revenue result is measured.

## Combined validation security review — 2026-10-24 UTC (unreleased)

- Isolated integration base main `f5d7a2f1dc4b6a8dbf9fe5da75838f0ec6a2c70a`.
  Retains the original PR #149 commit `81e6069b` and Zod candidate
  `27b4d1d3` as ancestors; neither source branch is rewritten. The only
  integration conflict was adjacent test commands, resolved by keeping both.
  Snapshot updates remain from current main. The dated standalone notes below
  describe their earlier local passes, not a production receipt.
- Every discovered frontmatter consumer now has CLI regression coverage in
  temporary fixtures: the blog index builder, both anomaly templates and the
  LLM drafter. Real SDK 0.98.0 runs against an intercepted fetch with a dummy
  key and no inherited credentials. No external LLM request is made.
  Mocked EN/ES tool responses preserve forced draft/human-review flags;
  invalid fields and missing tool responses report failures without a draft.
  Template failures preserve field diagnostics and continue to valid entries.
  The index still excludes drafts and rejects unreviewed auto analysis.
- The major-version review covers the SDK's declared `^3.25.0 || ^4.0.0`
  peer range, actual request/response handling, defaults, URL/string/enum
  validation, field diagnostics and generated-frontmatter serialization.
  No production schema, generator or client implementation changes are needed.
  Package/lock changes remain limited to Zod and the scoped parser backport.
- Clean integrated install/build and full npm test pass: **148 unit tests and
  416 browser navigations**, including EN/ES mobile/desktop regressions. All
  25 JS/CSS assets and normalized metadata for 36 posts match the baseline.
  Local entry **61.81/62 KiB** gzip; no budget change. Remote CI still required.
- The upstream parser advisory-range discrepancy remains visible as two
  moderate entries. No alert dismissal, accepted-advisory addition, threshold,
  account/security setting or credential change. Unbounded collection parsing
  is unchanged by the Zod fix; mocks do not validate real provider behavior.
  Review and exact integrated CI are required before any later release.
  This continuation permits a draft review PR, not merge or deployment.

## Zod validation candidate — 2026-10-24 UTC (local, unreleased)

- Separate from PR #149; base main `3e803b6ef6e13f2e4ec213c1233821859f3d0cbe`.
  Replace only Zod **3.25.76 → 4.6.7** and its declared range. Official npm
  lists no stable 3.x release beyond 3.25.76. The
  [reviewed advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)
  lists 4.6.6 as patched; the [maintainer fix](https://github.com/colinhacks/zod/pull/6652)
  rejects oversized bounded collections before parsing their elements.
  [4.6.7](https://github.com/colinhacks/zod/releases/tag/v4.6.7) is the next
  published patch. This is an investigated major change, not a same-major fix.
- Inspected application use is `src/lib/blog-schema.js`, consumed by the blog
  index builder and both draft generators, including an LLM tool response.
  No browser/API validation consumer was found. The installed Anthropic SDK
  0.98.0 declares peer support for `^3.25.0 || ^4.0.0`; it resolves the same
  new Zod version without changing the SDK or any other locked package.
  The SDK module import was checked without making an API call or using a key.
- Reviewed the [migration guide](https://zod.dev/v4/changelog), especially
  defaults and error formatting. All 36 checked-in posts retain identical
  normalized metadata. Defaults, explicit draft values, EN/ES, invalid-field
  diagnostics and the existing six-tag boundary have focused regression tests.
  On 10,000 invalid tags, the old version returned 10,001 issues; the candidate
  returns only the size issue. The controlled case does not exhaust memory.
- Clean baseline/candidate installs and builds pass. All 25 generated JS/CSS
  assets are byte-identical; no visitor-payload increase or budget change.
  Candidate audit removes the Zod finding, reports zero high/critical and
  zero omit-dev entries, and passes the unchanged audit gate. The two existing
  Typography/parser moderate entries remain; PR #149 is still separate.
- Full local npm test passes: **138 unit tests and 416 browser navigations**,
  including existing EN/ES mobile/desktop fixtures. Entry JS **61.81/62 KiB**
  gzip and CSS **19.09/20 KiB**; budgets and audit policy are unchanged.
- Unbounded collections are unchanged by the upstream fix. This review does
  not establish zero resource-exhaustion risk or complete application security.
  Before publication, require review of this major dependency change and fresh
  final integration/CI. No push, merge, deployment, alert dismissal, exception,
  credential, account/security-setting or paid-service change in this pass.

## Walk-or-drive inventory candidate — 2026-10-22 UTC (issue #59, unreleased)

- Review base: `a10706b5eb5ae48468e32c5fc21c657d63bd8153`, rebased cleanly
  from initial base `42ca1fee`; incoming changes were collector inputs only.
  Inspected current main,
  existing worktrees, the updated issue and runbook before editing; no overlapping
  open capability PR found. Preserve original 18 changed paths, prior worktrees
  and newer collector inputs. The initial local stage performed no publication.
  Review continuation authorizes one branch push and PR/CI, but no merge/deploy.
- Recorded `public/data/crossings.json` inputs, both 42 canonical crossings:
  `e0bac72fd4d978dfbbec7f3c68d804025d3ac45c`, retrieved 03:52:35.415Z,
  blob `3f6ea59a17f8edc620605c93fa3c7335cfc119e9`, versus
  `5a681bad045eb4153830928021350844069cef98`, retrieved 04:52:36.981Z.
  Real sitemap/prerender generators agree within each input, but pedestrian
  canonicals drop **28 → 26**. Only `/walk-or-drive/progreso-progreso-international-bridge/`
  and `/walk-or-drive/santa-teresa-santa-teresa-port-of-entry/` disappear when
  their lane objects become null. Collector mapping of absent/N/A/closed reports
  to null is not evidence of absent pedestrian infrastructure.
- Source review October 22 supports exactly two persistent positive exceptions,
  by port number, without asserting current opening or changing waits:
  **Progreso 230901**, [TxDOT 2021 guide, RGV-60/PDF194 and RGV-64/PDF198](https://ftp.txdot.gov/pub/txdot/move-texas-freight/studies/texas-mexico-border-crossings-guide-2021.pdf)
  describes pedestrian infrastructure and northbound pedestrian processing;
  the [bridge operator](https://texasmexicobridges.com/) also describes pedestrian
  passage. **Santa Teresa 240801**, [City of El Paso, International Bridges,
  Santa Teresa section](https://www.elpasotexas.gov/international-bridges),
  explicitly includes pedestrians. These sources do not establish Donna 230902
  or neighboring ports' capability. No source hours are encoded as current status.
- Exact identity cross-check: [official CBP public feed](https://bwt.cbp.gov/api/bwtpublicmod)
  returned HTTP200 at 20:13:25.210Z: 230901 = Progreso International Bridge,
  230902 = Donna International Bridge, 240801 = Santa Teresa Port of Entry.
  These rows corroborate identity only; the dated capability sources do not
  establish current operating hours, open lanes or wait availability.
- The shared predicate serves detail links, sitemap, prerender and legacy
  aliases. Both recorded inputs now generate **28 canonicals**, identical across
  sitemap/prerender. Missing reports still show unavailable; a real zero restores
  comparison; closure overrides retained numbers. No wait parser, collector,
  freshness threshold or generator implementation changes.
- Broader curation remains open. Six sampled snapshots show other report-based
  differences, including Eagle Pass I, Stanton, Pharr, Anzalduas, Lukeville,
  Donna, Rio Grande City and San Luis II. No new claim or removal for those ports.
  Obtain official port-specific/directional evidence before adding positive or
  negative entries. Missing reports alone cannot establish lack of pedestrian
  service. #59 stays open; Search Console reconciliation is separately unverified.
- Initial local verification before rebase: fresh build PASS; entry **61.73 KiB**, CSS 19.09 KiB;
  full npm test PASS (**133 unit tests, 402 browser navigations**), including both viewports and
  EN/ES keyboard entry, canonical identity, missing/deleted reports, true zero,
  closure and recovery. Regression runs real generators on recorded inputs in
  temporary directories; source snapshots in this worktree are not overwritten.
  No budget/audit gate or assertion was removed.
- Publication gates: review the two-port patch; integrate current main while
  preserving collector inputs; require fresh build/full suite and exact-head CI
  under unchanged **62 KiB**; obtain release authorization for this candidate
  (the review/CI continuation still forbids merge/deploy); use the existing workflow once, then verify
  manifest/source, both sitemap/prerender pages and EN/ES mobile/desktop links,
  missing/zero/closure recovery on served assets. No new dependency, security/
  account setting, credential, ad, service, monitor or cost.

## Summary confidence release — 2026-10-22 UTC (PR #143)

- Reviewed head **84da4c8d29bc77940736fc6851962585d4f7e56c**, merged/source
  **a14654f32e0b83b11008a978d1fb085ff83db059**. Final [push CI 39730765971](https://github.com/sbc1-code/borderpulse/actions/runs/39730765971)
  and [PR CI 39730769822](https://github.com/sbc1-code/borderpulse/actions/runs/39730769822)
  SUCCESS, including the unchanged 62 KiB gate and all regressions. The merge
  adds only collector inputs to the reviewed source; no concurrent code was lost.
- [Existing production run 39731300070](https://github.com/sbc1-code/borderpulse/actions/runs/39731300070)
  SUCCESS, with no second dispatch. Vercel **dpl_8VJ9dSkAucq3E27fjCiDJiiH4CJN**,
  [exact deployment](https://borderpulse-mlvhdt1fc-sbc1-codes-projects.vercel.app),
  READY, aliases include borderpulse.com/www. Public manifest source matches;
  prepared 06:01:11.958Z, CBP/history latest 05:52:31.070Z, 2,471 snapshots,
  FX 05:52:31.351Z. Public API separately returned HTTP200/42 crossings at
  06:07:13.861Z; these are separate current-data and bundled-history paths.
- Served entry `/assets/index-B0bOZyNq.js`, SHA256
  `4cc4961f31f07d3b419c5db5f2cd452708528718f50a28078a8a5a4ddad0c9da`,
  recompresses to 63,152 bytes with local Node25. Served summary
  `/assets/DashboardSummary-4wzsRQOR.js`, SHA256
  `ddd0c468ab74fbdd6847cda0b43b00c69167d1d6c9c68a931e8e5f41dce7cb9e`,
  is 6,520 gzip bytes and contains the confidence notice. Router 7.18.4 remains.
  CI measures entry 61.88 KiB; no budget/config/dependency change. Before/after
  paired full-initial JS measurement is +3 bytes; opening adds the existing small
  shared guard in parallel. No production speed/conversion gain is established.
- Real production captures and synthetic native-host fixtures pass EN/ES at
  1440x900/390x844: module load/failure/reload recovery, keyboard/menu/filter,
  expiry during download and after mounting without a new response, offline/
  online, stale/unknown/future dates, retained values/dates and zero recovery.
  Synthetic input is not a statement that the public feed was malfunctioning.
- The complete route suite also passed **416 navigations** in a task-owned
  localhost preview serving unchanged production bytes, so the existing local-only
  language fixture guard remains intact. Rechecked all **24 asset hashes** and
  manifest at the end; preview and headless contexts closed. Local old-input
  inventory was 420; CI/served clean inventory is 416 (data-derived routes/aliases,
  no manual exclusions). Original storage, sharing/feedback, historical/Compare,
  report-time, language/metadata, no-JS and alias checks all pass.
- Retain the first failed PR CI 39729934526 as evidence: only the history test's
  generic h1 wait matched the prior crossing during navigation. The final head
  checks target canonical identity before the unchanged no-inherited-pattern
  assertion, and passed the full suite again plus six owned pages at 4x CPU.
- Product rollback: make a new branch from current main, apply the inverse of
  this PR's four src files and added summary checks with git apply --index, then
  build/test/CI/merge and verify production. The prepared inverse was checked
  against the published merge using a temporary index and was not applied.
  Keep the independent historical canonical-wait test fix, Router mitigation,
  collector snapshots, budget/audit gates and release records. No whole-site
  rollback to an old data bundle was performed.
- All eight previous worktrees and the original 18 changes match their captured
  HEAD/status readback. No accounts/security settings, credentials, ads, paid
  services or new tools/monitors changed. Six moderate build-chain audit entries,
  narrow bundle headroom and first-open network cost remain. This is Chrome
  headless/DOM QA, not physical-device, assistive-technology or total security
  certification, nor independent validation of CBP observation timestamps.

## Expanded-summary confidence follow-up — 2026-10-22 UTC

- Reproduced against the served PR141 app, using synthetic input only: 120-minute
  and future snapshots still rendered Moving well / Median wait now and colored
  chart ticks after opening the deferred summary. The top-level old-data warning
  did not alter the opened summary. This is not evidence of a failing live feed.
- Scope: pass existing fetchedAt into DashboardSummary, reuse walkDriveFreshness
  (45/90 minutes plus invalid/future guard), and track browser connectivity and
  per-minute rerenders inside the existing optional chunk. Evaluate Date.now on
  each render so an import or new response is not judged against an old timer.
- Untrusted retrievals/offline views keep raw wait values and valid recorded fetch
  dates, chart ticks, keyboard selection and filters. Current-condition labels,
  categorical colors and legends become neutral reference readings; accessible
  SVG descriptions also stop claiming current conditions. A stable status region
  announces confidence changes; the changing age/date line is not a live region.
- Missing/invalid timestamps are rejected upstream by the existing dataService
  validator, so a cold load correctly has no rows/map rather than invented
  history. The summary still explains unknown fetch time and missing readings.
  Tests preserve that guard and prove a corrected zero-valued feed restores the
  actual summary immediately. This change does not independently validate CBP
  observation clocks, lane statistics or the numerical truth of the source.
- Local verification: fresh build and 130 unit tests PASS; full npm test PASS,
  420 navigations for its 181 canonical/28-alias input-derived inventory. Existing
  loader failure/reload recovery, storage, sharing/feedback, keyboard/menu,
  metadata and freshness fixtures pass. New independent-clock/context fixtures
  cover expiry during held chunk download and after mounting without a new
  response, offline/online, stale/missing/invalid/future times, dated numbers,
  missing rows and genuine-zero recovery in EN/ES desktop/mobile.
- Entry remains 61.69 KiB under the unchanged 62 KiB gate. Paired full initially
  required JS is 280,511 → 280,514 gzip bytes (+3). The summary own chunk grows
  5,861 → 6,520 bytes; the existing shared retrieval helper adds a small parallel
  request when opening. No vendor chunk or mandatory payload is excluded from
  measurement, and no budget/build/audit configuration changed. Simulated
  150ms/200KiB/s cold opening was about 0.30–1.32s; samples are diagnostic, not
  evidence of production speed or conversion improvement.
- The first PR CI (39729934526) failed only at the existing historical-pattern
  navigation assertion, while push CI passed. Its generic h1 wait could match
  the old crossing during React's transition after the URL changed. The fixture
  now waits for the target canonical before checking the same no-inherited-card
  assertion. Preserve the failed log; no product crossing-page code or check was
  removed. Rerun the complete local suite and both CI on the final test head.
- Release only after remote CI passes on the reviewed head and concurrent
  source changes are rechecked; use the existing production workflow once.
  Check the exact source/manifest, EN/ES rendered states and unchanged served
  assets in a supported localhost preview for the language fixture. Roll back
  only this scoped src/script diff through a normal tested PR, retaining collector
  inputs, earlier Router mitigation, existing budgets and release history.

## Router release — 2026-10-22 UTC (PR #141)

- Reviewed head `e0bac72fd4d978dfbbec7f3c68d804025d3ac45c`, dependency-only
  commit `9c2d30d7`, merged at **5a681bad045eb4153830928021350844069cef98**.
  [Push CI 39724848656](https://github.com/sbc1-code/borderpulse/actions/runs/39724848656)
  and [PR CI 39724931617](https://github.com/sbc1-code/borderpulse/actions/runs/39724931617)
  succeeded. The merge adds only newer collector inputs to the reviewed branch;
  code, dependency and regression trees match the tested head.
- [Production workflow 39725320432](https://github.com/sbc1-code/borderpulse/actions/runs/39725320432)
  succeeded with no second dispatch. Vercel **dpl_45Wzsdoe5TwfipVhvHdLMqczfgfC**,
  [exact deployment](https://borderpulse-g8ke3wl14-sbc1-codes-projects.vercel.app),
  is READY and aliases include borderpulse.com/www. Manifest commit matches;
  prepared 04:58:38.116Z, CBP/history latest 04:52:36.981Z, history 2,467 rows,
  FX 04:52:37.345Z. Public API HTTP200/42 crossings was separately read back.
- Served `/assets/index-BZeUcSFr.js` contains the 7.18.4 version marker and the
  localized summary loader. SHA256:
  `d56a13f84be9e21af9f0df53b4f9f3a5347e171fab992395e5453cb19f502054`.
  It is 63,146 gzip bytes when recompressed with local Node25. All four initial
  served JS chunks total 280,481 gzip bytes by the same calculation. CI's own
  runtime reports 61.88 KiB entry, under the unchanged 62 KiB gate. The Vercel
  build has its own asset hash; it is not claimed byte-identical to local Vite.
  Provenance, version/code, exact served hashes and rendered behavior were checked.
- Real production EN/ES desktop/mobile report/chart captures passed. The full
  route suite passed **398 navigations** against unchanged published assets in
  the task-owned localhost preview, including the existing guarded language
  fixture, Router/summary loading/failure/recovery, keyboard, filters, storage,
  sharing/feedback, history, metadata and aliases. All 24 fetched asset hashes
  and the publication manifest were checked again; the local server was closed.
- Route counts follow the data-derived inventory. The older local snapshot
  generated 171 canonical/29 aliases (402 navigations); clean merge and CI have
  169/29 (398). The only additional older paths are walk-or-drive Progreso and
  Santa Teresa; their generation uses the existing capability test against the
  snapshot. No paths were manually excluded, and no feed/capability rule changed.
- Direct-host QA initially completed the inventory and functional fixtures but
  exited nonzero only because the existing document-language fixture explicitly
  requires localhost (two viewport guard failures). That failed harness log is
  retained; it is not reported as a full PASS. A task-owned GET-only local preview
  then serves unchanged public production bytes, forwarding no visitor headers,
  cookies, authorization or bodies and blocking external providers/service workers.
  It keeps that fixture guard intact, checks asset hashes again and requires the
  same manifest before/after. No app/test guard or security configuration changed.
- The short post-deploy Vercel grouped-error read returned no runtime clusters;
  this is a bounded observation, not an uptime or complete security claim.
  Six moderate build-chain entries remain. Tests cover headless Chrome EN/ES at
  1440x900 and 390x844; no physical-device, Safari/Firefox or screen-reader certification.
- Rollback: create an isolated branch from current main, prepare the inverse of
  `git diff 5a681bad 5a681bad^1 -- src scripts package.json package-lock.json`,
  apply it with `git apply --index`, record the reason in these existing docs,
  and build/test/merge through the normal gates. The inverse was checked using
  a temporary index, not applied. Preserve collector inputs and release history;
  do not restore an old Vercel data bundle. No rollback was executed.

## Router follow-up — 2026-10-22 UTC (local release checks passed)

The earlier candidate checkpoint below records the original failed gate. The
same isolated branch now passes the complete local suite without changing
Vite configuration, the bundle/audit scripts, exceptions or any security setting.
Dependency-only commit `9c2d30d7` remains separate from navigation regressions
and this performance follow-up. Version 6.1.5 is the CSS parser, not Router.

- Profile the exact same installed graph before/after. Direct Router imports,
  production deep-entry aliases and pure call annotations alone did not solve
  the gate; none of those experiments changed the app/config. Do not patch
  upstream Router code or strip its navigation validation.
- The native dashboard disclosure remains closed by default. Its existing
  summary/map now loads once on first opening, retains mounted state across
  close/reopen, and follows current filters/data. An asset failure produces a
  localized status and leaves the report list and route navigation operational;
  reloading after network recovery restores the section. No data/feed/threshold
  or permissions change. Unused dropdown wrappers retain their API and names,
  but their construction can be tree-shaken as a pure factory.
- Exact entry gzip: **63,169 bytes / 61.68848 KiB**, below the unchanged 62 KiB
  cap by 319 bytes. The original candidate was 68,623 bytes. Counting **all four
  initially required JS chunks**, before is 285,958 and after 280,504 bytes:
  **5,454 bytes actually removed from initial loading**. First opening adds one
  5,861-byte gzip summary chunk; no new vendor waterfall. Across all routes JS
  totals 427,793 versus 427,367 gzip bytes (+426 bytes of splitting/handling).
  Neither total nor navigation cost is concealed by the entry-only gate.
- Cold headless EN/ES desktop/mobile samples with simulated 150ms latency,
  200KiB/s download and 80KiB/s upload: usable reports 2.00–2.05s after versus
  2.02–2.11s before; first chart opening 0.30–1.34s versus 0.02–0.05s. Small
  samples are diagnostic, not a production latency/usage/conversion claim.
  Loading is visible/announced and list interaction works even while the asset
  is deliberately held. This request cost is confined to formerly hidden work.
- Fresh build and **full npm test PASS**, with 130 standalone unit tests and
  402 existing navigations. New tests cover both languages and both viewports:
  no chart work/request before opening, cold held asset, list filtering while
  loading, map keyboard selection, close/reopen identity and cache reuse,
  changed filters, menu lane toggle/route actions/Escape focus, asset failure
  without ErrorBoundary and successful reload recovery. Existing snapshot aging,
  history, sharing/feedback, browser resilience, SEO and alias checks pass.
- Publication: await remote CI on the exact reviewed head, check concurrent
  changes again, then use the existing single production workflow after merge.
  No second deployment dispatch or new tool/monitor. Preserve newer collector
  inputs. Rollback through a normal inverse/revert PR of this scoped code and
  dependency diff, keeping collector data; do not roll the whole data bundle back.

## Router candidate review — 2026-10-22 UTC (not published)

- Exact targets: **react-router-dom 6.30.6 → 7.18.4**, resolving **react-router
  7.18.4**. Both advisories name react-router, not the CSS selector parser.
  [GHSA-wrjc-x8rr-h8h6](https://github.com/remix-run/react-router/security/advisories/GHSA-wrjc-x8rr-h8h6)
  affects >=6.0.0,<7.18.0; [GHSA-337j-9hxr-rhxg](https://github.com/remix-run/react-router/security/advisories/GHSA-337j-9hxr-rhxg)
  affects >=6.4.0,<7.18.0. Both list fixes at 7.18.0+. Official npm's latest
  stable 6.x is 6.30.6; parser 6.1.5 does not mitigate either Router advisory.
- [Versioned official upgrade guide](https://reactrouter.com/7.18.4/upgrading/v6)
  requires Node20+/React18+/ReactDOM18+. Current React/DOM 18.3.1, local Node25,
  verification Node22 and publisher Node24 satisfy those baselines. The guide's
  no-breaking statement is conditional on future flags, not a blanket promise.
  This app has only single-segment '*' fallbacks, absolute internal links,
  module-level lazy declarations and declarative BrowserRouter; unused data
  router/fetcher/hydration changes were not introduced. No app API/import,
  React/Vite, security-setting or future-flag change was needed for the candidate.
- Minimal dependency diff: root Router DOM range, the two Router entries,
  removal of their unused @remix-run/router, and required cookie/set-cookie-parser.
  Six unrelated optional WASI lock additions from npm were excluded. Other
  resolved packages are identical. No override or new audit exception.
- Raw candidate audit: **six moderate, zero high/critical**, with both Router
  entries absent. Four new library regressions check normalized separators,
  external-navigation rejection, internal query/hash/replace/Back/Forward and
  encoded separators inside internal parameters. Before/after library behavior
  was captured; these tests do not imply the old public app exposed raw URLs.
- Build and 130 unit tests pass. Full npm test **fails at test:bundle**:
  68,623 bytes / **67.01465 KiB** initial JS against 62 KiB. Baseline is 62,151
  bytes / 60.69434 KiB: **+6,472 bytes**. CSS remains 19.08 KiB under 20 KiB.
  The budget and audit scripts are unchanged. No successful full-suite claim.
- Standalone route diagnostics subsequently passed **402 navigations**, existing
  freshness/history/share/feedback/language regressions, and added EN/ES
  desktop/mobile nested navigation, unknown/encoded-path fallback and checks
  against external main-frame navigation. These diagnostic results do not
  bypass the failed release gate or authorize publication. Visual headless QA
  passed in both languages and widths. SSR/hydration exploit execution was not
  tested because the app does not use that mode; package mitigation is supported
  by maintainer ranges and the raw audit, not a complete security certification.
- Candidate stays local, with dependency-only and regression/documentation
  commits separated. No remote candidate branch, CI, PR or deployment. Live
  production remains 98930474 from PR #139. Rollback is local-only: revert the
  candidate's support commit then dependency commit in its isolated branch;
  preserve other worktrees and collector inputs. No production rollback needed.
- Next: reduce actual initial bytes without raising/evading the gate, rerun
  complete checks, then obtain passing remote CI and verify production under
  the existing authorization. Do not mix in the separate parser/build-chain work.

## Historical pattern release — 2026-10-22 UTC

- [PR #139](https://github.com/sbc1-code/borderpulse/pull/139) merged reviewed
  head `4ac65c1ffc92f72a0118f0e4ab2d1f34d5c39db5` at
  `9893047411d8545df8298eb196a8f585258b1598`. Push and PR CI passed; original
  operator edits and other worktrees were preserved. This is one data-confidence
  correction, separate from the already published PRs #136–138.
- Existing [production run 39718320478](https://github.com/sbc1-code/borderpulse/actions/runs/39718320478)
  succeeded, including 402 navigations and the unchanged audit/freshness gates.
  Vercel `dpl_2ZwQiEBevGVAGAguBVvB1Jv5ATxR` was READY at
  `borderpulse-26xrkjobg-sbc1-codes-projects.vercel.app`, with existing apex/www
  aliases and matching commit. Public manifest prepared 03:42:56.043Z; live API
  HTTP 200 with 42 crossings. No second workflow dispatch was used.
- Production EN/ES at 1440×900 and 390×844 showed the real dated historical
  card. Separate synthetic fixtures against the served bundle passed weekday
  scope, zero, malformed/future timing/evidence, recovery, dark mode and port
  navigation, using isolated headless contexts with a different visitor
  timezone. Shared Chrome tabs were untouched and headless processes closed.
- Fresh local build, 126 unit tests and 402 route navigations passed. The new
  fixture initially leaked a simulated clock; it was moved into independent
  browser contexts and the entire suite rerun successfully before publication.
  Existing freshness, sharing, feedback, favorites, language and metadata
  regressions passed. The eight moderate audit entries reviewed below remain.
- The consumer validates data shape and UTC timing, not the underlying CBP
  observations or statistical methodology. Legacy generated summaries remain
  in the feed for other consumers; no detector, threshold, feed or API changed.
  This does not certify complete security/accessibility or imply conversion gain.
- Revert only this release's runtime/source/test diff in a new branch and PR,
  keeping release history and newer collector data. The inverse patch is
  `git diff 98930474 98930474^1 --binary -- src scripts package.json`;
  apply it with `git apply --index`, record the rollback in these docs, then
  build/test/merge through the existing gates and verify the new deployment.
  An inverse-patch check against main passed with a temporary index; no rollback
  was executed. Avoid rolling the whole site back to an older data bundle.

## Local Typography parser backport candidate — 2026-10-23 UTC

This local candidate scopes an npm override to `@tailwindcss/typography` only:
its parser changes from 6.0.10 to **6.1.5**. Typography stays at 0.5.19; no other
package or dependency edge changes. npm hoists the replacement from the nested
Typography directory to `node_modules/postcss-selector-parser`. This is a local
review candidate, not a production publication receipt.

The [maintainer advisory](https://github.com/postcss/postcss-selector-parser/security/advisories/GHSA-rj75-hqrm-r3gf)
and [6.1.5 release](https://github.com/postcss/postcss-selector-parser/releases/tag/6.1.5)
identify the security backport for the 6.x line. The separate
[reviewed advisory range](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)
still says `<7.1.6`, so npm may keep reporting the two moderate package entries.
Keep those findings visible: no advisory exception, audit threshold change,
forced downgrade, or unrelated 7.x migration is part of this candidate.

The inspected consumer is the CSS build plugin in `src/index.css`, parsing
repository sources. No browser/API import or visitor-controlled selector
parsing endpoint was found. That limited review does not establish zero risk
for future consumers or other dependencies.

`npm run test:css-parser` resolves the parser through Typography itself, checks
the patched version and pseudo-element transformations, and parses a flat
400KB class/id selector in a heap-limited worker with a five-second deadline.
The old parser fails that bounded control; the backport completes it. The test
stops only its own worker if parsing regresses, without leaving a blocked test
process. It is also part of the full `npm test` gate.

For review or a future parent upgrade, perform a clean `npm ci`, build and full
test suite; compare generated CSS against the same source/data input before
the override. Recheck the actual Typography resolution and advisory metadata.
Remove this override only when the parent itself supplies a patched compatible
parser, then repeat the output and route checks. Preserve the existing JS/CSS
budgets and the dated historical review below.

## Bounded dependency review — 2026-10-22 UTC

Official npm audit reports **eight moderate package entries**, zero high or
critical, from four distinct advisories across three dependency chains. This
is a reachability review of the existing app, not a complete security audit.
No dependency, lockfile, exception, permission or security setting changed.

| Installed chain | Scope and observed reachability | Compatible repair assessment |
| --- | --- | --- |
| @tailwindcss/typography 0.5.19 → postcss-selector-parser 6.0.10 (2 entries) | CSS build plugin in src/index.css, parsing repository CSS. Neither package renders in browser chunks or is imported by the public API. No visitor-supplied CSS parsing endpoint was found. | Maintainer advisory lists fixed **6.1.5** as well as 7.1.6; official npm confirms 6.1.5 exists with the same dependency names/engine as 6.0.10. Typography 0.5.20 still pins 6.0.10. A same-major backport is a candidate for a scoped override and CSS-output regression review; it is not automatically installed by a compatible parent update. npm's advisory range still broadly flags <7.1.6, unlike the maintainer's backport range. Do not suppress the advisory to conceal that discrepancy. |
| gray-matter 4.0.3 → js-yaml 3.15.2 → argparse 1.0.10 → sprintf-js 1.0.3 (4 entries) | Frontmatter build/prerender tools only; absent from rendered browser chunks. The vulnerable format-string path is argparse CLI help; js-yaml's argparse import is in bin/js-yaml.js, while repo code uses the YAML/frontmatter library API. No public request accepts such a format string. | sprintf-js latest is 1.1.3 and the advisory lists no patched release. npm suggests gray-matter 2.0.1, a major downgrade; do not treat that as a compatible fix or apply audit fix --force. |
| react-router-dom 6.30.6 → react-router 6.30.6 (2 entries, 2 advisories) | Present in browser chunks. App uses BrowserRouter declarative mode and createRoot, with no SSR/hydration path. Reviewed navigation values are constants or controlled internal path builders; no bare attacker-supplied destination was found. This limits the reviewed paths, not all future usage. | Latest published 6.x is 6.30.6. Maintainer fixes are 7.18.0+, requiring a major migration; do not mix that migration into the data-confidence correction. |

The Vite 6.4.4 rendered module graph independently confirmed zero rendered
modules for the six build-chain packages and one each for react-router and
react-router-dom. The public API imports the CBP parser, not these build tools.
Package classification alone was not used as proof of runtime reachability.
The current historical-pattern misrepresentation was selected as the one
user-facing correction; the parser backport remains an explicitly untested
separate candidate. Existing dependency PRs were inspected and left intact.

Primary references: [parser maintainer advisory](https://github.com/postcss/postcss-selector-parser/security/advisories/GHSA-rj75-hqrm-r3gf),
[sprintf-js disclosure](https://github.com/alexei/sprintf.js/issues/237),
[router redirect advisory](https://github.com/remix-run/react-router/security/advisories/GHSA-wrjc-x8rr-h8h6),
[router SSR advisory](https://github.com/remix-run/react-router/security/advisories/GHSA-337j-9hxr-rhxg).
Versions/chains were read from the unchanged lockfile and official npm registry;
these dated results do not imply zero exploitability or complete security.

## Browser resilience release — 2026-10-21 UTC

- After the owner approved the precise follow-up batch, its single authorized
  push retry succeeded. [PR #137](https://github.com/sbc1-code/borderpulse/pull/137)
  merged approved head `2c9c8bde2ac75f03926da7c16b63a92745597fe8` at
  `0ec918a897ee356d643afbd86c8957d84369c809`. Both CI checks passed.
- Existing production [run 39649211670](https://github.com/sbc1-code/borderpulse/actions/runs/39649211670)
  succeeded without another dispatch. Vercel deployment
  `dpl_5NcpUBPmGWf1KsBs4gGqwP13cV4b`,
  `borderpulse-rep22mxmn-sbc1-codes-projects.vercel.app`, was READY with the
  same source and existing apex/www aliases. Public publication.json matched,
  prepared `2026-10-21T18:03:30.542Z`, with 42 crossings and 2,422 historical
  observations. The separate live API returned HTTP 200 with 42 crossings.
- Native EN/ES desktop/mobile readback confirmed the coordinate disclosure,
  comparison route and viewport fit. Isolated synthetic browser fixtures
  against the served bundle passed blocked reads/quota, malformed favorites,
  successful/failed persistence, retained language, keyboard skip/Escape and
  route metadata cleanup. Fixtures did not modify the public feed or use the
  owner's browser profile, location or other task tabs. The shared browser
  remains available; the task-owned headless process closed after checks.
- Fresh local build and 118 unit tests passed. Full local and production npm
  test each passed 402 navigations with the current snapshot's 171 canonical
  routes and 29 aliases. Route capability rules did not change. The eight
  moderate audit entries remain, with zero high/critical and no gate bypass.
- CI also annotated actions/upload-artifact@v4's Node.js 20 runtime deprecation
  and the ubuntu-latest image migration. No workflow, credential, permission,
  security setting, ad or paid-service change was made. Preserve the existing
  dependency follow-ups; limited checks do not certify complete security or
  accessibility or establish SEO/conversion improvement.
- The original operator checkout's 18 changed paths, generated files and newer
  duplicate local files were preserved. Release evidence is this runbook,
  PR #137 and the existing Drive Current Focus checkpoint, not a new tracker.

## Compare and Vite release — 2026-10-21 UTC

- [PR #136](https://github.com/sbc1-code/borderpulse/pull/136) merged at
  `f55167b6994c7b3e6532529566507352a7ff478d`. Its separate commits guard
  untrusted pair-comparison snapshots and patch Vite 6.4.3 to 6.4.4.
- Both CI runs passed. The existing production
  [Actions run 39561576557](https://github.com/sbc1-code/borderpulse/actions/runs/39561576557)
  succeeded. Vercel deployment `dpl_3fkPhCsCiPdpq62RhzNPfCU1b4yg`,
  `borderpulse-1byel2036-sbc1-codes-projects.vercel.app`, was READY with that
  commit and the existing borderpulse.com/www aliases. No hosting migration,
  account, permission, security setting or paid-service change was needed.
- Public `https://borderpulse.com/data/publication.json` matched the merge
  commit, prepared at `2026-10-21T07:23:29.976Z`; its 42-crossing snapshot,
  2,379-entry history and FX input matched their published timestamps.
  Separate real-feed readback and synthetic fresh/stale/future tests against
  the served app passed in EN/ES on desktop/mobile. This is a release receipt,
  not a claim that the live feed failed or that future publications are healthy.
- Fresh local build/full npm test passed with 416 route navigations. The
  release had 114 unit tests; the subsequent bounded audit follow-up has 118.
  Audit reports zero high/critical and eight moderate package entries outside
  this patch. Limited browser/code checks do not establish complete security,
  accessibility, provider playback, search performance or conversion lift.
- Existing collector, Vercel publication path, Pages rollback, paused product
  automation and advertising configuration remain as previously recorded.
  Preserve the original operator checkout's 18 unrelated changed paths.

## AdSense preparation — 2026-10-17 UTC

BorderPulse and DIGITO are separate site entries under the existing publisher
`pub-7889422382615234`. A domain migration is unnecessary for shared account
management; preserve BorderPulse's own domain, brand and audience.

- After Sebastian approved PR #134 publication and submission, it merged at
  `365343210ed06e844e51aa0403614ce27d1bea74`; production run `39062790807`
  succeeded and the live publication manifest matched. Google accepted the
  review request. BorderPulse and DIGITO each show **Getting ready / Review
  requested**. Neither has a verified **Ready** result. The September evidence
  below is historical; this October submission is separately verified.
- Live `https://borderpulse.com/ads.txt` returns HTTP 200, `text/plain`, with
  `google.com, pub-7889422382615234, DIRECT, f08c47fec0942fa0`. HTTP and www
  redirect to it. The ownership meta tag matches; robots permits the site and
  file. Google's separate ads.txt dashboard still says **Not found**. Retain
  the correct public file while Google recrawls; do not rotate publisher IDs.
- Google Auto ads is **OFF**. Auto optimize was changed from **ON** to **OFF**
  and read back, leaving both sites without automatic Google placements or
  experiments. Existing dashboard-only Adsterra code is preserved.
- This patch adds conditional Google cookie/personalization disclosures and
  opt-out links in EN/ES. It describes Google ads and site consent controls as
  inactive. Existing Adsterra, analytics, storage and camera disclosures are
  preserved. Both privacy routes now deliver the notice visibly before
  JavaScript, sharing paragraph text with React.
- Dormant manual integration now uses BorderPulse's own display unit
  **BorderPulse dashboard footer | manual**, slot `2612112583`, read back from
  Google's code generator. `src/lib/googleAds.js` keeps `GOOGLE_ADS_ENABLED`
  **false**. The dashboard still uses the existing automatic Adsterra placement
  unchanged. Future owner-approved activation switches that one bottom slot
  to Google, without stacking providers. It loads no Google code while off;
  preview hosts, crossing pages, embeds and other routes cannot request ads.
  One SDK per document and one request per mounted slot prevent effect-replay
  refreshes. Reserved space and blocked/unfilled handling preserve content.
  No overlays, interstitials or ad-dependent access are introduced.
- The existing unpublished European and US message drafts now include both
  sites, named **DIGITO + BorderPulse | European privacy choices** and
  **DIGITO + BorderPulse | US privacy choices**. Both were read back as
  **Draft**, two sites, Publish **OFF**. European language/refusal/optimization
  settings and US language/targeting settings were preserved. BorderPulse's
  display name and `https://borderpulse.com/privacy/` were saved; site-name
  substitution remains dynamic. Google-native advertising and analytics
  consent-mode interpretation plus RTB partner-consent checking are enabled.
  The 198 common partners, legitimate-interest defaults and maximum-message
  coverage remain enabled; special feature 2 and own-use purposes remain off.
  These are preparation settings, not active consent coverage.
- Google's tag will deliver the published CMP. The prepared European
  withdrawal button appears when Google's TCF API reports European rules
  apply; calls go through Google's supported callback queue. Keep Google's
  automatic US Do Not Sell or Share link. No custom consent record, Adsterra
  opt-in, analytics change or global blocking is added.
- After Google approves, verify account onboarding and BorderPulse **Ready**,
  obtain owner rollout approval, publish the existing Google drafts and change
  the flag to true. Update conditional EN/ES privacy wording to the active
  provider. Use Google's documented `fc=alwaysshow&fctype=gdpr` / `fctype=usnat`
  previews on production for language, mobile/desktop, refusal, withdrawal,
  US opt-out and GPC checks. Mocked checks cannot prove live CMP behavior.
  Keep Auto ads/Auto optimize off and verify one provider, placement separation
  and actual serving in Google reports. Restore the flag to false to return
  to the existing Adsterra placement.
- No publisher account, personal/payment information, declarations, terms,
  spending or live-ad interaction was changed. Google drafts remain unpublished.

Google references: [site management](https://support.google.com/adsense/answer/12131223),
[privacy disclosures](https://support.google.com/adsense/answer/1348695), and
[European consent requirements](https://support.google.com/adsense/answer/13554116).

## Ads and sharing closeout — 2026-09-27 Pacific

- Sebastian confirmed the public platform is supported by automatically served
  ads. This supersedes the earlier opt-in placement decision below.
- [PR #94](https://github.com/sbc1-code/borderpulse/pull/94), merge
  `da03e980383fa7504c574dd2796de17aba976a27`, removed the ad opt-in and
  published English/Spanish privacy and advertising disclosures.
  [Pages run 36370712116](https://github.com/sbc1-code/borderpulse/actions/runs/36370712116)
  passed; the dashboard and both privacy routes returned HTTP 200.
- [PR #95](https://github.com/sbc1-code/borderpulse/pull/95), merge
  `91843791d53ea4bf2c73496ff4a75032dd23db0a`, added bilingual native-share,
  WhatsApp, and copy-link controls on crossing pages, descriptive wait-time
  headings, and a link to historical planning. Shared messages use the
  canonical crossing URL without a cached wait-time claim.
  [Pages run 36374113003](https://github.com/sbc1-code/borderpulse/actions/runs/36374113003)
  passed. Live San Ysidro readback confirmed HTTP 200, the new heading and
  WhatsApp URL, and no horizontal overflow at 375px.
- Verification: production build, full test suite (404 desktop/mobile
  navigations), EN/ES copy and share fallback, desktop native-share payload
  and event, and historical planning navigation passed. No new dependency
  or service was added. Existing unrelated local edits were preserved.
- Measurement is instrumented through `crossing-share` with crossing slug
  and method. Real analytics ingestion, traffic lift, and ad revenue have
  not been established by these checks. Next: measure search clicks,
  crossing-page visits, shares, and ad revenue over the first 30 days;
  continue observing refresh cadence and check AdSense review status.
  No external promotion or outreach was sent in this session.
- Retain the December 26 Scheduler-token renewal requirement below.

## Verified closeout — 2026-09-27 Pacific

- PR #89 restored the Adsterra placement code and added AdSense ownership
  verification. AdSense ownership and ads.txt are verified; review was
  requested and remains pending approval. Adult ads are disabled in Adsterra;
  the existing opt-in placement remains active.
- PR #90 (`cd5ffb65`) deployed successfully in Pages run `36363887817`.
  Both release checks passed. This repaired dashboard background updates,
  retained last-good data on failure, and made fetch freshness visible.
- Cloud Scheduler's automatic 17:52 Pacific execution succeeded. Its GitHub
  fetch run `36363785834` succeeded, and the public JSON readback confirmed
  `fetched_at: 2026-09-28T00:52:28.201Z`, with 42 crossings.
- PR #91 (`c816b7a8`) deployed successfully in Pages run `36364313380`.
  Both release checks passed; mobile search placement and EN/ES control
  labels were checked at 390px, and the final controls were read back live.
- Expected incremental recurring cost is $0 within the current free
  allowance. Google Maps remains disabled. Ad revenue and long-term cadence
  still require measurement; one successful scheduled delivery is not an
  uptime guarantee.
- Next operational requirement: renew the restricted scheduler token before
  **December 26, 2026**, and update its Authorization header. Check AdSense's
  review result before enabling Google ad serving.

## Configuration (2026-09-27)

- Google Cloud project: `borderpulse-493414`.
- Cloud Scheduler job: `us-central1/borderpulse-refresh`.
- Schedule: `7,22,37,52 * * * *`, timezone `Etc/UTC`.
- HTTPS POST to the GitHub `fetch-cbp.yml` workflow dispatch endpoint;
  body `{"ref":"main"}`. The existing writer validates and commits the CBP
  snapshot, then explicitly dispatches the Pages deployer.
- Existing GitHub cron remains a fallback, not evidence of timely delivery.
- Fine-grained GitHub token: `borderpulse-cloud-scheduler`, restricted to
  `sbc1-code/borderpulse`, Actions read/write and required Metadata read.
  Expires **2026-12-26**. Renew before that date and replace the Scheduler
  Authorization header. Never commit or paste the token into project docs.
- One Scheduler job uses the billing account's three-job free allowance;
  check account-wide allocation before adding more jobs. GitHub standard
  runners are free for this public repository. Maps remains disabled.

## Verify the full path

1. Scheduler's last execution succeeds on a scheduled quarter-hour.
2. A corresponding GitHub `workflow_dispatch` fetch run succeeds.
3. Its explicitly dispatched Pages deployment succeeds.
4. `https://borderpulse.com/data/crossings.json` has the new `fetched_at`
   and nonempty crossing data. A successful dispatch alone is insufficient.

The dashboard subscribes to snapshot changes, checks every five minutes,
and checks again when its tab becomes visible. Connection failures retain
the last successful snapshot with its original timestamp. The source's
individual lane update times can be older than the site's fetch time.

## Recovery and costs

If refresh stops, inspect Scheduler delivery errors, token expiry, the
fetch run, and the Pages deployment in that order. A manual workflow dispatch
can restore a snapshot while the trigger is repaired. Pause this Scheduler
job to stop its dispatches; the existing GitHub schedule remains available.

Do not reactivate paid Maps or add recurring services until revenue supports
them and Sebastian authorizes the expense.

## Vercel daily publication — prepared, not activated

Public hosting remains Pages until an explicit production/domain decision.
Keep PR #87's paid/account stack separate. The release in #106 can ship on
Pages before this hosting work.

`publish-vercel.yml` runs daily at **08:17 UTC**, on app changes to `main`,
or by manual dispatch. It ignores data, generated OG, sitemap/RSS, docs and
draft-only pushes. Keep Vercel's project disconnected from automatic Git
deployments. The collector still runs every 15 minutes and dispatches the sole
Pages deployer. Both hosts build the same Vite app; only Vercel enables
`VITE_PUBLIC_CBP_API=true`.

### Activate preview only after credential approval

1. Merge the reviewed hosting changes after the independent product release.
   Wait for one successful collector run on `main` so its current crossings
   and materialized history match; validate those inputs before activation.
   Review the workflow and passing release checks. Store an approved Vercel
   access token as the repository Actions secret `VERCEL_TOKEN`, scoped to
   the existing team with the narrowest deployment permissions the account
   supports. Document expiry privately and rotate before expiry. Never paste
   a token into an issue, chat, source file or log. No secret is committed here.
2. Set repository variables `VERCEL_PUBLISH_TARGET=preview` and
   `VERCEL_PUBLISH_ENABLED=true`. The workflow accepts only the `main` ref;
   it snapshots latest `main` at job start to avoid queued pushes publishing
   older data. Its concurrency group serializes deployments.
3. Dispatch `publish-vercel.yml`. It uses Node 24 and the existing Vercel CLI
   version 61.1.0, validates inputs, pulls preview settings, runs `vercel build`
   in Actions, runs `npm test`, rechecks freshness, and uploads with
   `vercel deploy --prebuilt`. It performs no remote Vercel build.
4. Read the deployed `/data/publication.json` and compare it with the Actions
   summary and retained artifact. Verify live `/api/public/crossings`, current
   dashboard timestamps, history, FX, EN/ES deep links and automatic Adsterra.
   Existing preview authentication stays enabled.
5. Observe two scheduled daily publications. The manifest must advance its
   history and FX timestamps; intervening collector commits must produce no
   Vercel deployments. A manual run is not proof of the daily schedule.

No new service or credential is needed to test a local prebuilt preview with
the existing CLI login. The unattended Actions credential is a separate gate.

### Verified candidate preview

The authenticated [candidate preview](https://borderpulse-1aclctmdc-sbc1-codes-projects.vercel.app)
is ready at deployment `dpl_4dt2z2rNsmkrEsTw3VJv1WX8WTLx`; it has no production
alias. Its log confirms prebuilt artifacts, with no remote application build.
The artifact manifest records runtime source `ba320b18` and 403 historical
snapshots. Deployment metadata records `b65c6f89`, which adds only documentation
and the audit-report validation fix after the local build.

Authenticated browser readback confirmed 42 live crossings fetched at
`2026-09-30T05:02:02.700Z`, newer than the bundled `04:22:28.572Z` snapshot;
the dashboard displayed the same live timestamp. Comparison history, canonical
sharing controls, USD/MXN and automatic Adsterra creatives loaded. The unknown
route rendered the prepared 404 page; the packaged route configuration returns
status 404. Local verification passed 406 route navigations, EN/ES desktop and
mobile growth interactions, 18 publication/function tests and four refresh
tests. GitHub release checks passed for both #106 and hosting head `b65c6f89`.

The immediate post-deployment usage readback remained $0.27 for BorderPulse and
$2.46 of the team's $20 credit. The page warns of up to one hour of reporting
delay; this unchanged rounded reading does not prove zero deployment cost.
Daily automation, two scheduled observations and production cost validation
remain pending. No production release or DNS change has occurred.

### Data and failure contract

- Current CBP and generated history must be no more than 90 minutes old at
  validation, matching the existing stale threshold. Reject timestamps more
  than five minutes in the future and fewer than the collector's 35-port floor.
- Require ordered unique snapshots, at least 27 days of historical reach,
  and a final observation matching current waits. The 27-day gate detects
  catastrophic history truncation, not continuous coverage. The aggregate
  builder filters observations to its exact 30-day window; sparse cells keep
  existing availability labels. Historical entries get a one-day boundary
  allowance because the collector artifact precedes publication.
- Require a positive USD/MXN quote fetched within 48 hours. This verifies
  retrieval time, not an invented FX-market observation timestamp.
- `/data/publication.json` reports commit SHA, preparation time, current-data
  timestamp, first/last historical observations, snapshot count and FX fetch
  time. This additive diagnostic file does not replace source timestamps.
- Bad data, failed checks or a failed upload stop publication. A deduplicated
  GitHub operations issue reports failure/recovery. Inspect before retrying;
  do not weaken the gates. A missed daily publish can make history/FX old while
  current waits continue via the independent live function. If the live source
  fails, the UI labels the actual bundled fallback age or retains a newer
  browser reading; no fresh timestamp is synthesized.

### Cost baseline and production gate

Read from Vercel Usage at approximately 21:41 PDT on September 29, before this
candidate's deployment (usage can lag by up to one hour): Sep 13–Oct 13 team
cycle **$2.46 / $20 credit**, including **$2.28 build CPU**; invoice total $20
after usage credits. BorderPulse **$0.27**, mostly **$0.26 build CPU**, 784 CDN
requests and 3 MB transfer. These are preview measurements, not production
capacity or revenue evidence.

Measure again after the prebuilt preview and the two scheduled publications:
project build CPU, function invocations/CPU/memory, deployment storage, transfer,
and shared-team remaining credit. Build logs must show local/prebuilt uploads,
not Vercel remote builds. Record representative request counts with the billing
window and rounding/delay limits; do not manufacture ad impressions to simulate
traffic. Calculate 31 daily publications plus observed code releases separately
from traffic. Hold cutover if incremental spend cannot be bounded within the
remaining shared credit. Maximum authorized new monthly/on-demand spend: $0.
Do not change the team's $200 alert/Pause Off setting or enable a team-wide
pause that could affect DIGITO without a separate decision.

### Cutover and rollback packet

Before requesting the final decision, record the tested commit/deployment URL,
two daily-run manifests, actual usage deltas, exact Vercel project-specific DNS
targets and a recent successful Pages deployment. Keep the current IONOS
nameservers, mail/TXT records and `borderpulse.com` canonical origin.

Captured rollback DNS (recheck at approval):

| Host | Type | Value | TTL |
| --- | --- | --- | --- |
| @ | A | 185.199.108.153 | 3600 |
| @ | A | 185.199.109.153 | 3600 |
| @ | A | 185.199.110.153 | 3600 |
| @ | A | 185.199.111.153 | 3600 |
| www | CNAME | sbc1-code.github.io | 3600 |

Read-only Vercel domain-configuration API lookup for project
`prj_ftFsRRgb2QcOKUmhG3If4rWRWI8e` returned these rank-1 targets on September 29:

| Host | Type | Proposed value | TTL |
| --- | --- | --- | --- |
| @ | A | 216.150.1.1 | 3600 |
| @ | A | 216.150.16.1 | 3600 |
| www | CNAME | 84c88a1a10d2756f.vercel-dns-016.com | 3600 |

Replace the four Pages apex A records with the two recommended Vercel A records
and replace the `www` CNAME only after approval. Vercel has no attached
`borderpulse.com` domain yet; the read-only recommendation does not attach it.
Public DNS showed no apex AAAA or CAA records. The `www` IPv6 answers currently
come from its Pages CNAME, not a separate `www` AAAA record. Re-read all records
and Vercel recommendations at cutover, including any ownership TXT challenge.
Set `www` to redirect to `https://borderpulse.com` in the project domain setup.
Leave IONOS nameservers and unrelated records intact. Allow the current
3600-second TTL when evaluating propagation and rollback.

After approval: build for production (`vercel pull --environment=production`,
`vercel build --prod`), run checks, upload `vercel deploy --prebuilt --prod`,
attach the reviewed apex/www domain configuration, and replace only the
reviewed website DNS records. Set `VERCEL_PUBLISH_TARGET=production` only as
part of this approved cutover. Verify anonymous HTTPS, apex/www canonical
redirects, deep links, true unknown-route 404s, live waits, fallback, history,
FX and ads before describing the move as complete.

Keep Pages and its collector publishing for the first week. The cutover
approval should also authorize restoring the captured DNS if Vercel-specific
availability, freshness or cost failures require rollback. On rollback, set
`VERCEL_PUBLISH_ENABLED=false`, restore the Pages DNS records, verify HTTPS and
fresh Pages data, and record the reason in #101 and Current Focus. A shared CBP
upstream outage alone is not evidence that a host rollback will fix the feed.
