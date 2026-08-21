# CHANGELOG

Append-only log of shipped work. Date entries roughly group what landed in
a single session. Pull from `git log` if you ever need raw commit detail.

## 2026-08-20

### Fixed
- **Trust labels no longer overstate certainty (#58).** New shared model in
  `src/lib/trustState.js` so a badge, a banner, and a summary chip cannot
  disagree about the same data.
  - **Freshness thresholds come from measured delivery, not the configured
    cron.** `fetch-cbp.yml` requests every 15 min, but GitHub throttles it:
    across 80 consecutive snapshots the gaps run p50 38, p75 45, p90 55,
    p95 63, max 102 minutes. A 15-minute-derived threshold would flag stale
    data ~68% of the time during healthy operation, which is exactly why an
    earlier time-based banner was removed as noise. Fresh <= 45 min,
    aging 45-90, stale > 90.
  - `StaleDataBanner` was offline-only and **ignored the `fetchedAt` prop it
    was already being passed**. It now reports age, timestamp, and source
    when a snapshot is genuinely old, and stays silent otherwise.
  - The card footer said **Live** unconditionally, on any age of data. It now
    shows Live only when fresh, the age when aging, and "Stale · 3 h ago" when
    stale, with the pulsing dot dropped outside the fresh state.
  - **"No wait" -> "No report"** ("Sin tiempo" -> "Sin reporte"). The old label
    read as zero minutes when it meant CBP published no reading.
  - **The headline summary is now a median, not a mean.** Measured on a live
    sample of 33 reporting ports: mean 35 min vs median 15 min, a 133%
    overstatement driven by a tail of 90-170 minute ports. Labelled
    "Median wait now" / "Espera mediana ahora". `StatsOverview` keeps its mean
    and was already labelled "Average wait", which is accurate.
  - **"Quickest option" -> "Shortest in Texas" / "Shortest border-wide".** The
    old label implied a crossing you could actually use; border-wide the
    shortest wait can be 1,500 miles away.
  - `About` hardcoded "43 crossings" and a `?? 43` fallback. Both now read the
    canonical count from `stats.json` (live value is 42).

### Added
- `scripts/test-trust-state.mjs` (9 tests) wired into `npm test`, covering
  threshold boundaries, unparseable and future timestamps, EN/ES labels, and
  the median-vs-mean skew. Includes a regression test that p90 delivery must
  not read as stale.

### Removed
- **The alerts / notifications feature, in full.** It could not do the one
  thing it promised. `notifyService.evaluate()` was only ever called from
  `Dashboard.load()`, and `Dashboard` clears the refresh interval on unmount,
  so alerts were evaluated *only* while the dashboard route was mounted in an
  open tab. Opening the Alerts page to check your alerts stopped the engine.
  Background tabs also throttle `setInterval`, so the one situation where an
  alert has value — you are not looking at the site — was exactly the
  situation where it could not fire. `sw.js` had `notificationclick` but no
  `push` and no `periodicsync`.

  None of this was disclosed anywhere in the UI. The copy said "Notifications
  fire when a crossing crosses your threshold" and "Get alerted when to
  leave", which is a CTA pointing at infrastructure that does not exist — the
  thing DECISIONS.md already says not to do. Real delivery needs Web Push plus
  a server, which the zero-backend architecture rules out.

  Removed: `/alerts` route and page, the nav entry on every page,
  `notifyService.js`, `DepartureAlertBanner.jsx`, the Notify Me CTA and
  threshold form on every crossing card, the `notificationclick` handler in
  `sw.js`, and the now-false notification line in the About privacy list.
  Entry chunk **54.67 -> 50.35 KB gzip**, CSS 15.36 -> 15.13 KB.

### Fixed
- **`/alerts/` no longer 404s on a direct load.** "Alerts" is in the nav on
  every page and `/alerts` is a real 229-line route, but `prerender.mjs` never
  emitted it, so GitHub Pages served the noindex 404 page to anyone who did
  not arrive via client-side routing: a refresh, a shared link, or Googlebot.
  Pre-existing since the nav link was added in `2dd6ba1`. Now prerendered with
  `noindex` and kept out of the sitemap, matching the embed-page precedent —
  it is a local-only tool (Notification API + localStorage) and every visitor
  sees the same empty state.
- **Route smoke tests now cover noindex functional routes.**
  `smoke-routes.mjs` built its manifest purely from `dist/sitemap.xml`, so any
  route deliberately excluded from the sitemap was invisible to it — which is
  exactly why `/alerts/` regressed unnoticed. Added `FUNCTIONAL_ROUTES`, which
  asserts the page is prerendered and then navigates it in both desktop and
  mobile profiles.

### Removed
- **Dead `/status/:id` route and `SharedStatus.jsx`.** A 27-line placeholder
  whose own copy read "coming in a future update". Nothing generated a
  `/status/` URL anywhere in the codebase. Entry chunk 54.73 -> 54.67 KB gzip.

### Security
- **Cleared all high-severity dependency advisories** (#63). `npm audit` goes
  8 -> 2: vite 6.4.2 -> 6.4.3, postcss 8.5.10 -> 8.5.26, plus transitive
  nanoid, js-yaml and @babel/core. No breaking changes; entry chunk and CSS
  byte-identical.
- **Added a CI security gate** (`scripts/check-audit.mjs`, wired into
  `npm test`). Fails on any new high or critical advisory.
- **Two moderate react-router advisories are knowingly accepted**, not
  silenced. Both need a semver-major React Router 6 -> 7 migration and neither
  is reachable here:
  - `GHSA-337j-9hxr-rhxg` (SSR `deserializeErrors`) — this app has no SSR.
    `src/main.jsx` uses `createRoot`, not `hydrateRoot`, and `prerender.mjs`
    is string templating that never executes React.
  - `GHSA-wrjc-x8rr-h8h6` (open redirect via backslash in `<Link>` /
    `useNavigate`) — there are zero `useNavigate()` calls, and all 27 dynamic
    `<Link to={...}>` targets are template literals with a hardcoded path
    prefix, so a target can never begin with the `\\` sequence the advisory
    requires.

  The gate accepts these by **advisory ID, not package name**, so a future
  high or critical in react-router still fails the build. Verified against
  three synthetic scenarios.

## 2026-08-19

<<<<<<< HEAD
### Added
- **Blueprint Border Line on the dashboard.** The border drawn as an
  architect's elevation: one line from the Pacific to the Gulf, all 42 ports
  as ticks placed by true longitude, tick length the current wait, a quiet
  dashed ghost behind each for the 30-day median. The axis flips with travel
  direction. Mobile rotates to a vertical geographic bar chart. Inline SVG,
  no new dependencies, +3.8 KB gzip.
- **The mobile card wall now collapses** to favorites + nearest + heaviest
  few behind "Show all 42", because the spine is the orientation layer.
  `BorderCrossingCard` fetches its own aggregate file, so this is not just
  scroll length: measured at 390x844, page height 17,888px -> 5,269px and
  cards rendered 42 -> 5, cutting ~37 requests off the cellular landing path.
- **Bundle budget in CI** (`scripts/check-bundle-size.mjs`, wired into
  `npm test`). There was no size check and the entry chunk had already
  drifted from a documented ~161 KB to 177 KB with nothing to catch it.

=======
>>>>>>> origin/main
### Fixed
- **Port identity is pinned; CBP renames can no longer move a URL.** CBP's feed
  intermittently substitutes a different row for the same physical crossing
  (different `port_number` and `port_name`). Verified mutually exclusive across
  200 snapshots, so dedupe was never at fault. Because slugs derive from names,
  this moved URLs: `/crossing/paso-del-norte/` was serving a hard 404 while the
  sitemap advertised the other spelling, and **9 of the last 40 deploys failed**
  (`test:routes` correctly caught the non-canonical compare redirect). Also
  orphaned 30 days of aggregate history on every flip, and silently dropped
  favorites, which are keyed by `port_number`. Six substitution pairs found:
  PDN, BOTA, Ysleta, San Ysidro, Naco (51/200, the worst), Otay Mesa. Identity
  now comes from `src/lib/portIdentity.js`; `BASE_OVERRIDES` covers all 42
  published crossings so `baseSlug(name)` is a fallback only.
- **Collapsed two permanently dead cards.** `230103` "Gateway" and `230106`
  "B&M Bridge" appear in 200/200 snapshots alongside their real twins and have
  never reported a wait. Both keep working URLs via redirects. Count 44 -> 42.
- **Region filters no longer hide crossings.** Those same two rows had
  `state: null`, so they vanished under any region filter. Regions now sum
  exactly to 42.
- **Southbound restored for Ysleta**, which was failing silently on a stale
  `240203` key in `fetch-sb.mjs`. Coordinate coverage 40/44 -> 42/42.
<<<<<<< HEAD
- **Border Line i18n and tap-target gaps caught in verification.** The SVG
  title block rendered "42 CROSSINGS · 18 CON DATOS" in Spanish (half
  translated) and the `<desc>` was English-only; both are localised now.
  Mobile tick rows measured 23 CSS px at a 375px viewport (iPhone SE/mini),
  just under the 24x24 AA floor, because the SVG scales down inside a
  narrower screen — row height raised so it clears at 375px too.
=======
>>>>>>> origin/main
- **Accessibility: single `<h1>` and WCAG 2.2 tap targets.** The sidebar brand
  was an `<h1>` inside `hidden lg:flex`, so every page had two h1s at every
  width. Controls raised to a 24x24 floor with 44x44 on primary actions, via a
  new `.tap-44` hit-area utility rather than resizing the painted controls
  (body scrollWidth at 390 has zero slack). Verified at real 360/390/1280
  viewports with Playwright; the Chrome viewport override that blocked the
  original audit still does not work.

### Added
- `src/lib/portIdentity.js` with a fail-closed duplicate-identity assert in
  `fetch-cbp.mjs`, so a future CBP collision throws instead of silently merging
  two physical crossings onto one card.

## 2026-08-18

### Fixed
- **Best-time recommendations now respect official operating hours.** Added a
  shared parser and eligibility rule for 24-hour, daytime, overnight, midnight,
  and day-specific schedules. Ambiguous schedules now show the pattern without
  publishing a potentially unusable recommendation. Aggregate, card, detail,
  share, ranking, OG, FAQ, and structured-data surfaces use the same rule.

### Added
- Added operating-hours fixtures, the Brownsville–Los Indios regression, a
  repository-wide recommendation audit, and CI coverage through `npm test`.

## 2026-08-16

### Fixed
- **Dashboard Analytics now recovers from a GitHub Pages rollout cleanly.** The
  service worker no longer caches failed static-asset responses, and its cache
  version advances to v3 so a returning visitor drops any previously cached
  404 for the lazy-loaded Analytics chunk. Route smoke tests now exercise the
  dashboard Analytics toggle at desktop and mobile sizes.

### Changed
- **BorderPulse now stands on its own.** Removed all DIGITO attribution and
  outbound catalog links from the desktop sidebar, mobile menu, and footer.

## 2026-08-06

### Fixed
- **Scheduled snapshots now reach the sole Pages deployer.** The fetch workflow
  validates a full build before committing, records whether the source snapshot
  changed, and explicitly dispatches `deploy.yml` with the exact new commit SHA.
  Unchanged cycles do not deploy. The handoff uses the minimum `actions: write`
  permission required by GitHub's workflow-dispatch endpoint.
- **The `/best-time/` hub no longer crashes.** Its heading now uses a defined
  visitor-local day while each recommendation remains port-timezone-local. The
  stale hard-coded 43-crossing metadata is generated from the live 44-crossing
  inventory, with matching BreadcrumbList and ItemList structured data.

### Added
- **A production-route browser gate.** `npm test` now opens all 175 sitemap
  canonicals and 20 generated aliases in both desktop and 390px mobile Chromium,
  failing on route HTTP errors, uncaught page errors, ErrorBoundary output,
  bad canonicals, invalid JSON-LD, or Best-time metadata/schema drift. The same
  390-navigation suite runs after every Pages build and before artifact upload.

### Changed
- **Pages deployment ownership was reduced to one workflow.** Scheduled data
  fetches no longer deploy directly; `deploy.yml` is the only workflow that
  deploys GitHub Pages. The duplicate deploy/retry path that was contending in
  `deployment_queued` was removed in `da6a23c`.
- **Best time / Mejor hora is now primary navigation.** The planning hub is no
  longer discoverable only through footer/internal links.

### Audit follow-ups
- The post-ship audit found that `GITHUB_TOKEN` data pushes do not trigger the
  push deployment workflow; [#57](https://github.com/sbc1-code/borderpulse/issues/57)
  tracks the explicit dispatch fix before the next data cycle is trusted.
- The live `/best-time/` hub throws `ReferenceError: today is not defined`;
  [#61](https://github.com/sbc1-code/borderpulse/issues/61) tracks the hotfix
  and route-smoke coverage.
- Search Console, product analytics, recommendation accuracy, mobile UX, and
  dependency findings were split into issues #58–#65 under roadmap #56.

## 2026-08-05

### Fixed
- **Search Console 404s from route-generator drift.** The crossing UI linked
  every port with a pedestrian lane to `/walk-or-drive/:slug`, but prerender
  and sitemap builds used a separate 14-port list. Both now share the same
  pedestrian-lane rule, producing 30 matching build outputs and sitemap entries,
  including Laredo Bridge I, Presidio, and Roma.
- **Legacy crossing URLs now preserve high-confidence traffic.** Added
  noindex redirects for former Presidio, Roma, San Ysidro PedWest, and Ysleta
  slugs across the relevant route families, plus the old PDN-vs-Ysleta compare
  URL and two former root paths. Spam-shaped and unrelated 404s remain 404s.
- **Spanish prerenders declared the wrong document language.** Spanish blog
  posts and `/metodologia/` now emit `<html lang="es">`; English counterparts
  emit `lang="en"`, and client-side metadata preserves the route language.
- **Client canonicals conflicted with the trailing-slash URL policy.** SPA
  canonicals, crawlable UI links, and internal blog links now use the same
  trailing-slash form as prerenders and the sitemap.

### Changed
- `/compare` seed pairs now have one source of truth in
  `src/lib/comparePairs.js`; the stale `el-paso-ysleta` seed now uses the live
  `ysleta` slug. Sitemap output is 175 unique canonical URLs.

## 2026-07-27

### Changed
- **Regenerated every figure in the 14 best-time posts** (7 EN + 7 ES) against
  the corrected aggregates. These carried the July 3 numbers, which predated
  both the shallow-clone fix and the re-bucketing, so most were wrong and some
  inverted the advice. Notable reversals: Otay Mesa was telling readers to
  prefer it over San Ysidro on Sunday evening, when Otay now runs 210 against
  San Ysidro's 170. Nogales DeConcini claimed a Friday afternoon wall peaking
  at 180; the Friday peak is now 90 and the real wall is Monday. Paso Del Norte
  sold Sunday pre-dawn as the escape hatch, but Sunday is now its heaviest day
  and Wednesday is the lightest. Tecate's Sunday afternoon was quoted at 255 to
  310, now a flat 180. Overall medians moved too: Calexico West 80 to 70,
  Nogales 60 to 45, PDN 64 to 54, Hidalgo 50 to 55.
- **Numbers now carry a recompute date and hedged sample counts.** A rolling
  30-day window means a hardcoded figure starts drifting immediately, which is
  what put these posts three weeks out of date in the first place. Each post
  now states when its figures were recomputed and notes the window moves.
  Exact snapshot counts became "about N", and the most volatile single-cell
  superlatives were softened to ranges, since an n=7 cell can swing 30 minutes
  on one new observation.
- Methodology paragraphs in those posts described the old per-cell median and,
  in some, a fallback removed earlier that day. They now describe the window.

### Added (content tooling)
- `scripts/verify-blog-claims.mjs` asserts all 172 published figures against the
  aggregate files the charts read. It caught 11 stale values on the first pass
  and is the gate to re-run before editing these posts again.

### Added (data pipeline)
- **Adaptive hour-window aggregates; confidence floor raised 2 -> 5.**
  A 7x24 grid is finer than the throttled cron can fill (raw density: median
  2 observations per cell), so only 7% of cells could support a floor of 5.
  The planned fix was pooling weekday/weekend x hour. Measured first, and it
  was wrong: within-Mon-Fri spread of day medians is 25 min, 2.5x the Sat-Sun
  spread of 10 min. San Ysidro runs Mon 160 / Tue 160 but Fri 60. Collapsing
  that to one "weekday" number misses the true day median by 25 min at p90
  and deletes the most useful advice on the page. Day-of-week is the signal.
  Widened along the hour axis instead, where autocorrelation is high, using an
  adaptive centred window (target 6 samples, cap +/-2h): dense cells keep their
  exact hourly value, only sparse cells widen. Beats both fixed alternatives:
  fixed +/-1h gives 64% coverage; fixed +/-2h gives 88% but localises the daily
  peak within an hour in only 57% of port-days; adaptive gives 88% coverage,
  +/-1h's 12 min p90 distortion, and 76% peak localisation. Density is now
  median 7/cell with 86% clearing the floor. San Ysidro renders 24/24 hours at
  n>=6 (was 16/24 at n>=2); sparse ports still decline honestly, Hidalgo/Pharr
  showing 19/24 as "not enough data". `by_hour` rows gained `window_hours` and
  `raw_samples`; the heatmap tooltip names the span behind each estimate.
- **`overall_best_hour` uses a sturdier estimator.** It pooled seven
  day-medians, so hours built from fewer days scored artificially well. At
  San Ysidro that put 1 AM (six days, no Tuesday) ahead of the genuinely
  lighter 6 AM. Now pools raw observations for the hour across all days. This
  value lands in `<title>`, meta descriptions and FAQ JSON-LD.

### Fixed
- **Document-level counts could have been inflated ~5x by pooling.**
  `sample_count` and `overall_median` now accumulate from raw observations
  rather than from the pooled cells, which reuse each observation in up to
  five neighbouring hours. `build-rankings.mjs` gates on `sample_count`, so
  this would have silently promoted thin ports into the rankings.
- **Methodology page described behaviour that no longer existed.** It still
  claimed empty cells fall back to the port's all-hours median; that fallback
  was removed earlier the same day. Rewritten in both languages to describe
  the window, why it never crosses days, and the "not enough data" state.
- **Shallow clone silently collapsed every aggregate to ~2 samples.**
  `fetch-cbp.yml` became the workflow that actually builds and deploys the
  site, but its `actions/checkout` had no `fetch-depth`, so the default
  depth-1 clone left `build-aggregates.mjs` with a single commit to walk.
  Its `git log --since` reconstruction of the 30-day window returned one
  snapshot instead of 389. Result: every `/crossing/:slug` heatmap, every
  "best time to cross", `/best-time`, `/compare` and the blog rankings
  tables were rendering from **2 observations** while the copy said
  "30 days of CBP data". `rankings.json` had fallen from 34 entries to 1.
  `deploy.yml` sets `fetch-depth: 0` correctly but is skipped for every
  `chore(data): refresh` push, so it had not run since 2026-07-04 and the
  broken builder overwrote the site every cycle. Same class of failure as
  the 2026-05-29 locale bug: the Action stayed green throughout.
  Added `fetch-depth: 0`. Rankings recovered 1 → 35.
- **Orphan aggregates were being published and outranking live pages.**
  `public/data/aggregates/` accumulated stale-slug files across CBP
  renames, and `build-rankings.mjs` reads the whole directory. That is how
  `presidio.json` (generated 2026-04-27, orphaned when the port became
  `presidio-presidio-port-of-entry`) became the *only* entry in
  `rankings.json`, pointing at a URL that 404s. `build-aggregates.mjs`
  now rebuilds the directory from scratch each run. Pruned 3 orphans.
- **A single CBP reading could be published as a recommendation.** The
  `(day, hour)` sample floor was declared separately in CrossingDetail,
  BestTime and Compare, all at 1, and the first two had fallbacks that
  re-ran the sort with the floor *removed*. Compare's also widened to
  every day of the week while keeping a "Today's lightest" label.
  San Ysidro was advertising "best time to cross today: 6 AM, 75 min" off
  one observation; it now says 12 PM / 120 min off three. Floor moved to
  a single shared `MIN_CELL_SAMPLES` in `src/lib/aggregates.js`, set to 2,
  and the floor-bypassing fallbacks are gone. Applied to the two
  additional consumers that had their own `>= 1` gates
  (BorderCrossingCard, ShareModal) and to Embed.

### Notes
- 2 is a deliberate floor, not a target. Measured against the real window
  (389 snapshots, 4,385 populated cells): per-cell density is median 2,
  mean 2.6, max 6. A 7x24 grid is finer than the throttled ~13-commits/day
  cron supports. A floor of 5 would blank 93% of the grid. Raising the
  floor is gated on re-bucketing to weekday/weekend x hour (see ROADMAP).

## 2026-07-03

### Fixed
- **Aggregate wait-time buckets are now port-local, not UTC.** The single
  biggest correctness bug found to date: `build-aggregates.mjs` bucketed
  by `getUTCDay()/getUTCHours()` while every consumer (BestTime,
  CrossingDetail heatmap, card pills, Compare, Embed, ShareModal, blog
  BestTimeChart, prerender FAQ) displayed those buckets as local clock
  time. Every published "best hour" was shifted 5 to 7 hours per port;
  the "Monday 3 AM spike" in the Calexico West posts is actually the
  Sunday 8 PM return peak. Aggregates now bucket by the port's IANA
  timezone (via exported `getPortTimezone`), carry a `timezone` field,
  and all now-vs-bucket lookups go through `nowInTz`/`nowInPortTz`.
  Mode A's sunday-spike detector 16-22h window now means real evening
  hours. FOLLOW-UP: hour claims in the pre-existing best-time/compare
  blog posts still quote the old shifted hours and need a rewrite pass.
- Legacy rebase conflict resolved: EmailCapture removal honored, alerts
  a11y fixes and corrected distribution drafts pushed (were stranded
  local-only while the repo sat 575 commits behind origin).

### Changed
- **SEO title patterns.** Crossing pages: "X Border Wait Time Today:
  Live CBP Data (2026)". Best-time: "Best Time to Cross X: Hour-by-Hour
  CBP Data (2026)". Compare: "X vs Y: Which Crossing Is Faster? (2026
  Data)". Walk-or-drive: "Walk or Drive Across X? Live Wait Comparison
  (2026)". Pattern mirrors what outranks us on these SERPs
  (border-times.com et al.): keyword first, freshness signal, year.
- **Trailing-slash URL canon.** Canonicals, sitemap, hreflang, RSS, and
  the crawlable nav all use the trailing-slash form GitHub Pages serves
  with 200 (non-trailing 301s there; Google indexed the slash form
  against non-slash canonicals).
- index.html: removed the es hreflang that pointed at the same URL,
  added WebSite JSON-LD + Organization sameAs (brand entity for the
  diluted "borderpulse" brand SERP).

### Added
- **4 bilingual blog pairs (8 posts, all from corrected port-local
  data):** summer Sunday returns (timed for July 4th weekend), best
  time Calexico East, best time back from Los Algodones/Andrade,
  Nogales DeConcini vs Mariposa.

### Removed
- 10 stale Claude worktrees and 22 dead local branches (all merged or
  superseded; Buttondown MCP branch dead since the newsletter removal).

## 2026-07-02

### Changed
- **Node 20 deprecation cleared across all four workflows.** The runner was
  annotating every run because `setup-node@v4` (and `github-script@v7`, which
  only fires on failure paths) still target the Node 20 action runtime.
  Bumped `setup-node` v4 to v6, `github-script` v7 to v9, and the workflow
  `node-version` from EOL 20 to 22 LTS in `anomaly-scan`, `deploy`,
  `fetch-cbp`, and `fetch-news`. The repo's issue-filing scripts only use
  `github.rest.issues` / `context` / `core`, so none of github-script v9's
  breaking changes (ESM-only `@actions/github`, injected `getOctokit`)
  apply. No `engines` field or `.nvmrc` constrains Node, and deploy +
  fetch-cbp + anomaly-scan verification runs came back green on Node 22.

### Fixed
- **Fetch CBP wait times workflow hardened against Pages deploy queue
  congestion.** The 16:08 UTC scheduled run failed because
  `actions/deploy-pages` sat in `deployment_queued` for the full default
  10 minute timeout and aborted (GitHub-side infra flake; the data fetch and
  commit had already succeeded). `fetch-cbp.yml` now uses the same
  `configure-pages@v6` / `deploy-pages@v5` versions as `deploy.yml` and
  retries the deploy once before failing the run, doubling queue tolerance
  to 20 minutes (the action caps its timeout input at the 10 minute
  default, so a longer timeout is not an option). Auto-filed issue #42
  closed after a green verification run.
- **Same retry hardening applied to `deploy.yml`, plus a 30s pause before
  retry in both workflows.** Follow-up: the two push-triggered deploy runs
  for the fix commits above failed with a second Pages backend flake mode,
  "Deployment failed, try again later", seconds after deployment creation.
  A controlled `workflow_dispatch` of `deploy.yml` immediately after was
  green in 49s, confirming transient infra rather than a broken workflow
  (the site itself never went stale; fetch-cbp's green deploys carried the
  same content). Both workflows now share the identical deploy pattern:
  one attempt, 30s pause on failure, one retry.
- **Pages deploy race between deploy.yml and fetch-cbp.yml eliminated.**
  Running both workflows at once produced mutual "Deployment failed, try
  again later" kills (concurrent Pages deployments supersede each other,
  and the synchronized 30s retry pauses kept them colliding in lockstep).
  Both workflows now share concurrency group `pages` with
  `cancel-in-progress: false`, so deployments queue instead of racing.
- **Anomaly-scan drafter PR step fixed: the `draft:auto-a` label it passes
  to `gh pr create` never existed in the repo.** Latent since the drafter
  shipped; only fires on workflow_dispatch runs that find anomalies. Label
  created, and the orphaned drafts branch from today's failed run opened
  manually as PR #45 (3 Sunday-spike drafts).

## 2026-06-11

### Removed
- **All newsletter signup capture, site-wide.** The footer form, the sticky
  bottom banner, and both in-post blog forms are gone, along with the
  Buttondown client (`src/lib/buttondown.js`) and the marketing components
  that mounted them (`EmailCapture`, `StickyEmailBanner`,
  `InlineAfterFirstH2`). The About page's "Newsletter and email" section is
  deleted too. Reason: no newsletter is actually being written, so the site
  was collecting addresses for something that doesn't exist. Everything is
  recoverable from git history if a newsletter ever actually launches.

## 2026-05-29

### Added
- **Busiest and fastest crossing rankings.** Added a live `rankings.json`
  build step plus a bilingual blog pair ranking U.S.-Mexico crossings by
  30-day median northbound wait. The posts use a reusable
  `<CrossingRankings />` MDX component, link into the highest-intent crossing
  and best-time pages, and get generated OG images through the existing blog
  card pipeline.

### Changed
- **Removed the public API docs page from the product surface.** The
  underlying `/data/*.json` files stay in place because the app, embeds, and
  build scripts depend on them. The visible `/api` page/nav/footer links are
  gone; old `/api` inbound links redirect to `/methodology` instead of
  hard-404ing.
- **Methodology copy no longer promises an exact 15-minute cron cadence.**
  It now describes scheduled refreshes and points to `/data/` snapshots
  directly, matching the earlier decision that GitHub Actions cron is
  throttled in practice.

### Fixed
- **CBP feed localized to Spanish: site showed 0 crossings (SIT-1).** CBP's
  `bwtpublicmod` feed began returning Spanish field values (`Frontera
  mexicana`, `Abierto`/`Cerrado`, `Sin demora`/`demora`/`Carriles cerrados`/
  `Actualización Pendiente`). `fetch-cbp.mjs` filtered only the English
  `Mexican Border`, so every scheduled run wrote `count: 0` and deployed an
  empty map, silently, because the Action still reported success. Fix:
  normalize `border`, `port_status`, and lane `operational_status` from either
  language to canonical English before processing (`Carriles cerrados` →
  `Lanes Closed`, so closed lanes null out correctly). Recovered to 43
  crossings, matching the pre-break snapshot exactly.
- **Added a nonzero-count guard to `fetch-cbp.mjs`.** It now throws (non-zero
  exit → fails the Action → opens a tracking issue) if fewer than 35
  Mexican-border crossings survive dedupe, leaving the last-good snapshot in
  place instead of overwriting it with zeros. Turns a silent data-quality
  failure into a loud, self-documenting one.

## 2026-05-26

### Changed
- **BorderPulse now has explicit Digito ecosystem links.** Added "More
  Digito tools" to the desktop sidebar and mobile menu, pointing to
  `https://digito.technology/tools`. Footer attribution now reads
  `DIGITO• product` instead of only showing the mark. This makes the
  traffic path obvious: BorderPulse visitors can discover the wider Digito
  catalog, and Digito's catalog links back to BorderPulse as the flagship
  cross-border product.

## 2026-05-25

### Fixed
- **CBP refresh + anomaly scan back online after 4-day outage.** Dependabot
  PR #29 bumped `@vitejs/plugin-react` 4.7.0 → 6.0.1. plugin-react@6 requires
  `vite@^8` but the repo pinned `vite@^6.1.0`, so every scheduled `npm ci`
  failed with `ERESOLVE`. Downgraded plugin-react to `^4.7.0`; lockfile
  regenerated; CBP fetch is green again at 17:50 PDT.

### Added
- **Auto-file dedup'd issues on workflow failure.** Added a post-job step
  to `fetch-cbp.yml`, `anomaly-scan.yml`, and `fetch-news.yml` that opens a
  GitHub issue when a run fails. Dedup'd via label so the same workflow
  doesn't open a new issue every 15 minutes — first failure files, rest
  are suppressed until the issue closes. Issues land on the Engineering
  board with labels `ops`, `ci-failure`, and the workflow slug. Replaces
  the "buried in Gmail" pattern that hid this outage for 4 days.
- New labels: `ops`, `ci-failure`, `fetch-cbp`, `anomaly-scan`, `fetch-news`.

### Changed
- **Dependabot config:** added `vite` group so `vite` + `@vitejs/*` bumps
  ship together. Ignored major bumps on `vite` and `@vitejs/plugin-react`
  until an intentional vite@8 migration sprint.
- **Brand mark: `SB•` → `DIGITO•`.** `Layout.jsx` now uses `DIGITO_MARK`
  (uppercase DIGITO + sage dot, per `personal-os/digito/BRAND.md`). Both
  sidebar and footer attribution links repoint from
  `sbc1-code.github.io/portfolio/` (personal) to `digito.technology`
  (studio). `title` attr is `A Digito product`, not `Built by SB`.
  Closes the rebrand item in `personal-os/OPEN_LOOPS.md` — BorderPulse
  now reads as a Digito product, which it is.

## 2026-05-19

### Changed
- **Dashboard analytics now ranks crossings, not hours.** The previous Peak
  hour / Lightest hour tiles asked a *time* question and tried to answer it
  with a *location*, which produces sentences like "Peak hour: Nogales" that
  parse as nonsense. Replaced with `Busiest crossing` / `Quietest crossing`:
  collapse hour-of-day, rank crossings against each other by weighted-median
  wait. Hour-of-day analytics already live on `/crossing/:slug` where there
  is one crossing in scope and the question is coherent. Requires >=3 samples
  per crossing to qualify; if only one crossing qualifies (so busiest ===
  quietest), both tiles suppress instead of showing a duplicate.

## 2026-05-18

### Fixed
- **Analytics view now scopes to the filtered crossings.** `Dashboard.jsx`
  was passing `state.crossings` (everything ever loaded), so region/search
  filters did nothing for analytics. Now passes `filteredCrossings`.

## 2026-05-16

### Added
- **Newsletter email capture wired to Buttondown.** New
  `src/components/marketing/EmailCapture.jsx` posts directly to
  `https://buttondown.com/api/emails/embed-subscribe/Digito-bp` — no API key
  in the browser, CORS is `*` so AJAX works from any origin. Three placements:
  footer strip under the site footer (every page, via `Layout.jsx`), inline
  block after the first H2 in every blog post and again at post-end (via
  `InlineAfterFirstH2` portal in `BlogPost.jsx`), and a dismissable sticky
  bottom banner with a 30-day cooldown (`StickyEmailBanner`). Bilingual EN/ES
  copy. `src/lib/buttondown.js` handles validation, posting, and draining the
  pre-existing `borderPulse_newsletterQueue_v1` localStorage queue on any
  successful signup so nothing captured pre-endpoint is lost.
- **GitHub repo secret `BUTTONDOWN_API_KEY`** set for any future server-side
  CI use (RSS-to-email automation, list ops). The web form does not need it.

### Notes
- RSS-to-email at `https://borderpulse.com/rss.xml` is a manual one-time
  toggle inside the Buttondown dashboard — no public API surface exists for
  configuring it. Do that step in the Buttondown UI once the list goes live.

## 2026-05-10

### Changed
- **Dashboard visual comprehension pass.** Added a commuter-first snapshot
  above the crossing grid with average wait, longest wait, quickest option,
  heavy-crossing count, and the same green/amber/red wait scale used across
  best-time surfaces. Reworked crossing cards so the current wait and severity
  meter are the dominant visual read instead of buried inline text.
- **Analytics view now uses semantic wait colors.** Replaced generic purple
  bars with threshold colors, added a recent-average summary, lightest/peak
  hour cards, wait-mix strip, bilingual legends, and clearer tooltip copy.
- **Mobile scanability cleanup.** Location prompt, region filters, offline-wait
  toggle row, and compact header now wrap/truncate more safely on narrow
  screens.

### Fixed
- **Snapshot + analytics hero too tall on mobile.** Commuter snapshot dropped
  from 490px to 267px on a 390px viewport (3 metric tiles now sit in a row
  with tighter typography instead of stacking column). Analytics hero dropped
  from 650px to 326px (4 KPI tiles now 2x2 instead of stacked, dark hero uses
  inline scope label and tighter padding). First crossing card now lands much
  closer to the fold for busy-commuter scanning.
- **Dashboard loading state wrapper.** Matched the post-load wrapper classes
  (`overflow-x-hidden`, `w-full max-w-[1600px]`) so the skeleton state does
  not flash a different layout before data resolves.

## 2026-05-09

QC follow-ups from issue #21 — the cleanup `bf348f8` started, finished
across the surfaces it missed. Plus a UX fix to the language toggle,
per-best-time OG cards, content + programmatic SEO expansion, and a
big chart-readability pass after lay-reader feedback.

### Changed
- **A11y on Dashboard + Blog.** Dashboard toggle buttons now carry
  `aria-pressed` state (Analytics view, direction To US/To MX,
  region filters); search input got an explicit `aria-label`. Blog
  filter tabs (All/English/Español) got `aria-pressed` + a
  `role="group"` with `aria-label="Filter posts by language"`.
  CrossingDetail and Alerts already had ARIA on their interactive
  elements (verified during the pass). ROADMAP a11y item now closed.
- **Heatmap chart readability, every surface.** The mono-red gradient
  was hard to skim — every cell looked alarming regardless of value.
  Replaced with a three-tier semantic scale matching the bar UI
  on /best-time: green = quick (under 30m), amber = typical (30-60m),
  red = heavy (60m+), slate = not enough data. Also: hour labels are
  now compact AM/PM (`12a`, `1a`, ... `12p`) instead of military time
  (`0`, `1`, ... `23`). Cell labels include unit (`30m` not `30`).
  Legend shows the value buckets and the ring meanings (Now /
  Lightest). Applies to:
  - `CrossingDetail.jsx` hourly heatmap (43 per-crossing pages)
  - `components/blog/BestTimeChart.jsx` (used in 12 blog posts)
  - 8 blog post bodies updated: caption changed from
    "Darker red means a longer typical wait" to
    "Green = quick (under 30m), amber = typical, red = heavy" (EN+ES)
- **`/best-time` index gets a "How to read this" anchor card** above
  the table so first-time visitors have a reference for what
  "lightest hour" and the median value buckets mean.
- **CrossingDetail "Compare with nearby" section now surfaces direct
  links to the dedicated /compare page** when one of the seed pairs
  matches the current crossing + a nearby one. Discovery layer for
  the new programmatic SEO pages.

### Refactored
- **Extracted `usePersistentLanguage` to `src/lib/useLanguage.js`.**
  Removed six inline copies (Dashboard, CrossingDetail, Api, About,
  BestTime, Compare). Single source of truth. ROADMAP item closed.
- **Extracted `comparePairs.js` to `src/lib/`**: `COMPARE_PAIRS`
  constant + `comparePairsFor(slug)` helper. Mirrored in
  `scripts/prerender.mjs` and `scripts/build-sitemap.mjs` (.mjs node
  context can't easily import from src; kept in three places — update
  all three when adding a pair).

### Added
- **"SENTRI renewal 2026: step by step" (EN+ES)**, third post in
  `policy-programs`. Walks the actual current TTP-portal flow:
  6-12 month renewal window, conditional approval (the part most
  people miss), interview-or-no-interview discretion, the
  re-fingerprinting at renewal that catches travelers who think
  they can skip it, common timing failures, denial reasons.
  Three official sources (CBP SENTRI, TTP DHS portal, CBP TTP hub).
  Long-tail SEO winner per the blog research dossier (SENTRI
  renewal step-by-step is in the Top 25 queries). Brings the
  blog to 26 posts.
- **"Bringing your dog back from Mexico: 2024 CDC rule" (EN+ES)**,
  second post in the `policy-programs` pillar. Plain-English breakdown
  of the August 2024 CDC change: the U.S.-vs-Mexico vaccination
  two-track system, the documentation set every dog needs at U.S.
  land ports (CDC Dog Import Form receipt, ISO microchip, U.S.-issued
  rabies certificate listing the chip number, age 6 months+), the
  ISO-microchip detail that turns dogs back, common failure modes,
  what CBP officers actually check at the booth. Three CDC/CBP
  sources. Brings the blog to 24 posts.
- **WhatsApp share now inlines today's lightest hour** per crossing.
  ShareModal lazy-fetches aggregates on open (browser cache from
  cards usually serves them) and appends "(best 7a)" / "(mejor 7a)"
  to each line of the share text. Northbound only (aggregates are
  NB-only); southbound shares stay clean. ROADMAP item closed.
- **"Bringing prescription medication back from Mexico" (EN+ES)**,
  first post in the `policy-programs` pillar. Plain-English walkthrough
  of CBP/FDA/DEA rules: the personal-use 90-day standard, FDA approval,
  prescription documentation, declaration requirement, and the
  controlled-substance category that breaks the rule (opioids,
  benzodiazepines, ADHD stimulants, sleep aids, etc.). Six official
  sources (CBP, FDA, DEA, Drugs@FDA database). Brings the blog to
  22 posts.
- **5 new `/compare` seed pairs**: SY vs Tecate, Otay vs Tecate,
  PdN vs Ysleta, Brownsville Gateway vs B&M, Brownsville Veterans
  vs Los Indios. 15 compare pages total.
- **4 new `/walk-or-drive` seed slugs**: Brownsville B&M, Nogales
  Mariposa, San Luis I, Santa Teresa. 14 walk-or-drive pages total.
- **Los Algodones border crossing guide (EN+ES)**, the first post
  in the `traveler-tips` pillar. Built from real Andrade aggregate
  data (overall median 15 min; lightest hour 5 AM at 5 min). Covers
  the 10 PM port-closure trap, documents needed both directions,
  prescription rules (CBP-sourced, not the pharmacy's), $800 duty
  exemption, $10K currency declaration, the 2024 CDC dog rule,
  Quechan parking, and snowbird-season patterns. Strictly neutral
  (no clinic affiliations) — directly answers the gap the blog
  research dossier flagged: every incumbent ranking for "Algodones
  border crossing" is clinic-owned. Links to 6 official sources
  (CBP, INM, CDC, DOS) per the source-linking policy. Brings the
  blog to 20 posts.
- **`/walk-or-drive/<slug>` decision page.** Side-by-side comparison
  of vehicle vs pedestrian wait at the same crossing, with a "Right
  now" recommendation that names the verdict (Walk / Drive / It's a
  wash) and the savings. Bakes in 20 min foot overhead for parking
  + bridge so the math is honest. Surfaces both standard pedestrian
  and Ready Lane lanes when available; gracefully falls back when
  data is missing. Includes a "Things this calculation does not
  include" list (Mexico-side parking, U.S.-side rideshare, whether
  you actually need the car). Bilingual EN/ES. Pillar #4 in the
  blog research dossier ("walk vs drive" had no dominant SERP
  ranker).
  10 prerendered seed slugs (the high-impact crossings where the
  walk-vs-drive gap matters most): San Ysidro, Otay Mesa, BOTA, PdN,
  Hidalgo, Calexico W, Calexico E, Brownsville Gateway, Nogales
  DeConcini, Tecate. Cross-link added to CrossingDetail's nearby
  section for any crossing that publishes pedestrian data.
- **"Best today" pill on every homepage card.** Shows today's
  lightest typical hour and median ("Best today: 7 AM (~20 min)")
  pulled from the same aggregate the "vs typical" line uses (no
  extra fetch). Clickable: links to /best-time/<slug>. Suppressed
  when the user is already in the lightest window (within ±1
  hour). Drives /best-time discovery from the dashboard's hot path.
  Closes the matching ROADMAP item.
- **Desktop sidebar language toggle moved to the header** (under
  the logo) so it's always visible. The previous bottom-of-sidebar
  position was below the fold on tall pages — first regression I
  introduced when I removed the Dashboard inline duplicate.
- **`/compare/<slugA>-vs-<slugB>` programmatic SEO pages.** New
  `Compare.jsx` page renders two crossings side by side: live wait,
  today's lightest hour, 30-day median, sample count, plus a
  computed "right now" callout that names the faster port and the
  delta. Bilingual EN/ES via the same `usePersistentLanguage` pattern.
  10 seed pairs prerendered + sitemap'd: san-ysidro vs otay,
  PdN vs BOTA, Hidalgo vs Pharr, Hidalgo vs Anzalduas, Nogales
  DeConcini vs Mariposa, Calexico W vs E, Eagle Pass I vs II,
  Brownsville Gateway vs Veterans, Laredo I vs II, Progreso vs Donna.
  Targets "X vs Y which is faster" search intent. To add pairs,
  update both COMPARE_PAIRS arrays in `scripts/prerender.mjs` and
  `scripts/build-sitemap.mjs`.
- **6 new bilingual best-time posts**: Tecate, Calexico West, and Hidalgo
  (3 EN + 3 ES). Each post is built from real CBP aggregate data —
  the actual lightest hour, the actual worst hour, the actual median.
  Same Data Analysis pillar / shape as the existing 4-port set
  (San Ysidro, Otay, PdN, Nogales DeConcini), so the blog index now
  covers 7 ports across both languages. Closes issue #8 (highest-priority
  content gap on the next-tier crossings). Brings blog total to 18 posts.
- **Per-best-time OG cards**. `scripts/build-og-cards.mjs` now emits a
  third pass: 43 share-preview PNGs at `/og/best-time/<slug>.png`,
  showing the lightest hour + median for that crossing
  ("8 AM · 30 min median" vs the overall median). Prerender wires them
  as `og:image` and `twitter:image` for `/best-time/<slug>` pages.
  Replaces the previous fallback to the generic per-crossing card.
  Also: per-best-time meta description now leads with the lightest
  hour + median when known, instead of generic copy.

### Fixed
- **15-min cadence claims, surfaces missed by `bf348f8`**: `Dashboard.jsx`
  meta description, `CrossingDetail.jsx` meta description + body copy +
  FAQ schema (43 per-crossing pages), `AboutFooter.jsx` (4 strings).
  All now read "refreshed regularly via a scheduled job" / "con
  regularidad mediante un job programado", matching the canonical
  phrasing from `bf348f8`.
- **Per-crossing pages had no visible language toggle on desktop**.
  `Dashboard.jsx` carried its own duplicate inline toggle (no
  `aria-label`); other pages got nothing because Layout's only toggle
  was in the `lg:hidden` mobile header. Removed the Dashboard duplicate,
  added the toggle to Layout's desktop sidebar footer (with
  `aria-label="Switch to English"` / `"Cambiar a español"`). All pages
  now have a single, consistent, a11y-labeled toggle on both mobile
  (header) and desktop (sidebar). Resolves issues 1, 2, 3, 4 in #21.
- **Dashboard.jsx language sync**: the page initialized `language` from
  localStorage but didn't subscribe to storage events, so changing
  language elsewhere didn't update it. Switched to the
  `usePersistentLanguage` pattern used by the other 4 pages.

### Followups
- Extract `usePersistentLanguage` to `src/lib/` — six inline copies now
  exist (Dashboard added the sixth). Refactor trigger long since fired,
  but kept this commit focused on #21.

## 2026-04-27

Big push day — UX/product sprint phase 1+2, embed widget, /api, /best-time,
/about, code-split, and three honesty cleanup passes.

### Added
- **Homepage rework**: live wait times above the fold, "+X min vs. typical"
  on every card, three-button row collapsed into a `···` overflow menu,
  geolocation prompt that maps to nearest state filter
- **Crossing detail**: hourly chart with day-of-week selector, current-hour
  + lightest-hour rings, sparse-hour styling, nearby crossings compare panel
- **Alerts overhaul**: new `/alerts` management page (toggle / delete each
  subscription), slim `compact` banner mode, sidebar `Bell` nav item
- **Mobile language toggle**: EN/ES button group in the mobile header, before
  the theme toggle
- **Embed widget**: `/embed/:slug` iframe-friendly view with `theme`, `lang`,
  `direction`, `compact` URL params, "Powered by Border Pulse" footer link.
  `EmbedSnippetModal` on every crossing detail page generates iframe code
- **API docs page**: `/api` documents the public JSON feeds (`/data/crossings.json`,
  `/data/aggregates/{slug}.json`, `/data/timelines/...`, `/data/blog/...`).
  Sidebar nav `<Code/>` icon, footer link, sitemap entry
- **Programmatic SEO**: `/best-time/:slug` for all 43 crossings — lightest
  hour today, hour-by-hour bar chart, 7-day breakdown, nearby comparisons
- **Best-time index hub** at `/best-time` — sortable table of all 43
  crossings ranked by lightest-hour median
- **About page** at `/about` — live stats feed (43 ports tracked, 6,700+
  samples, 30-day rolling, 12 posts), methodology, "what runs in your
  browser" section, quick-link cards
- **Public stats build script** (`scripts/build-stats.mjs`) emits
  `/data/stats.json` each prebuild
- **Sitemap**: 57 URLs → 104 URLs (best-time × 43, /api, /best-time,
  /about), sitemap regenerated each prebuild
- **Robots.txt**: explicit `Disallow: /embed/` (belt-and-suspenders on top
  of the per-page `noindex` meta)

### Fixed
- Embed widget showed misleading "Live · just now" for crossings with null
  `current_wait_time` (14 of 43 ports at any given moment) — now shows
  "No current wait reported" + "Waiting for CBP data"
- vs-typical line was hidden everywhere because the `samples >= 3` floor
  rejected sparse hour-buckets — lowered to `samples >= 1` with
  `aggregate.overall_median` fallback. Same fix applied to the detail-page
  hourly chart's `MIN_SAMPLES`
- Spanish parity sweep — `sesion → sesión`, `rapido → rápido`, accents on
  AboutFooter privacy paragraph, `pillarLabel` now bilingual via dictionary

### Performance
- Code-split leaf routes via `React.lazy` — main bundle dropped from
  324KB → 161KB. Each leaf route loads its own ~5–17KB chunk on demand.
  Embed iframe now fetches a 5.5KB chunk instead of the full app

### Honesty cleanup (multi-pass)
- Removed `hello@borderpulse.com` commercial CTA from `/api` — that
  inbox does not exist
- Removed personal-brand "Who built this" section from `/about`
- Removed false "no third-party trackers" claim — Umami runs from
  `cloud.umami.is`. Privacy section now describes what's running
  (Umami anonymous page-views, opt-in ads disabled by default,
  client-side geolocation, localStorage thresholds) without "we don't
  / never / ever" framing
- Dropped superlative tagline ("fastest, clearest, most honest")
- Updated `index.html` FAQPage JSON-LD to match honest copy

### Earlier in the day (UX/product sprint phase 1+2)
- Homepage rework, detail page, alerts overhaul, mobile lang toggle,
  Spanish parity — covered above. Ranked candidates 1–9 of 10 from
  the earlier audit. #10 trip planner deferred (needs design).

### Late-afternoon QC pass — claims hygiene
- **Stale data banner** stripped to offline-only. The time-since-fetch
  trigger fired constantly because GitHub Actions cron is throttled in
  practice (workflow scheduled `*/15` actually fires every 60–90 min on
  the free tier). The banner was noise, not signal. Each card already
  surfaces its own `updated_at`.
- **"Every 15 minutes" cadence claim removed sitewide** — meta tags,
  OG / Twitter cards, FAQPage JSON-LD, `/api` refresh-cadence card,
  `/about` stat tile (replaced with "Source of record: CBP"),
  Dashboard subtitle, `lib/seo` defaults, 6 blog posts. Anywhere we
  said "every 15 minutes" now says "refreshed regularly" or
  "scheduled cron". The actual wait-time numbers in blog data tables
  ("Sat 10 AM | 15 min") were left as-is — those are data, not
  cadence claims.

### Project-management scaffolding
- Added `CHANGELOG.md` (this file), `ROADMAP.md`, `DECISIONS.md`,
  and a project-level `CLAUDE.md` so any future Claude Code session
  in this repo auto-onboards from the docs instead of needing chat
  context. User can just say "what's new" tomorrow.

## Earlier sessions

Before this changelog existed. Use `git log` for archeology.
