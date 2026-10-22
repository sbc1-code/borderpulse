# ROADMAP

What's next, what's deferred, what's shipped. Lightweight backlog so each
session starts from a synced doc, not chat memory.

Status legend: `[ ]` open · `[~]` in flight · `[x]` shipped · `[-]` won't do

---

## Product direction — 2026-09-28

BorderPulse is an independently branded product built by DIGITO. Its own domain,
codebase, operating record and product decisions stay here; DIGITO may describe
the product as proof of its work without folding the crossing experience into
the trades-focused DIGITO site.

The long-term opportunity is practical, bilingual cross-border decision support
for people who cross for work, family and everyday life. Wait times are the
first useful job, not the whole platform. This direction comes from Sebastian's
cross-border experience; it is a product hypothesis, not a claim of demand.

### Now: earn trust in the free entry point

- [x] Publish the pair-comparison retrieval guard and Vite 6.4.4 patch (PR #136).
  Production commit `f55167b6`, Actions run `39561576557`, manifest and served
  EN/ES desktop/mobile app were verified October 21. Eight moderate audit
  package entries remain; no usage or conversion increase is established.
- [x] Publish bounded browser-storage, keyboard-navigation and route-metadata
  corrections (PR #137, merge `0ec918a8`). Production run `39649211670`,
  deployment manifest and served EN/ES desktop/mobile behavior were verified
  October 21. Fresh build, 118 unit tests and 402 route navigations passed.
  Broader schema lifecycle, assistive-technology and cross-browser audits
  remain separate work, alongside the eight moderate audit entries.

- [~] QC the October 13 locality-first flow, shareable area URLs and familiar
  crossing names, with a visible inline camera entry on the homepage. Deliver
  useful visible homepage/crossing snapshots without
  JavaScript, preserving timestamps and canonical identity. Validation and
  preview evidence belong to PR #132; not published yet.
- [ ] Reconnect an existing authorized Search Console data path to measure
  query/page impressions, clicks, CTR and area-to-crossing actions after release.
  GSC Wizard reported an ended trial during QC; no subscription was started.

- [~] October 13 competitor feature batch: nine remembered local corridor
  filters, comparisons of the selected eligible lane and click-loaded public
  camera views across El Paso–Juárez, San Diego–Tijuana and Eagle Pass, with
  external official source paths for Nogales, Laredo and Pharr. Prepared on the feature branch;
  production publication is not implied. Keep raw CBP report times visible and
  exclude closed/unverifiable hours, missing reports and stale winner claims.
- [ ] Verify permissible camera sources for Calexico–Mexicali, Brownsville and
  Progreso, and real playback of the prepared viewers. Public source directories
  and road approaches do not establish inspection-queue or live-stream coverage.
- [ ] Real email threshold alerts and community crossing reports: implement
  only with a working delivery channel and shared storage. See
  `docs/CROSSING-FEATURES.md` for the concrete follow-up contract, source receipts,
  operating costs and validation requirements. No signup/report form until the
  service actually accepts and delivers it.

- [x] Correct route hreflangs and bound metadata-navigation checks (PR129/130).
  Production was verified on October 12 at `2b40cb2b`, including reciprocal
  pairs and exact served assets. Those releases are complete; preserve them.
- [x] Preserve document language through metadata cleanup, data/aggregate
  updates and navigation. Content-specific EN/ES routes keep their own language;
  implementation checks and exact publication evidence belong to the scoped PR.
- [ ] Prioritize stable pedestrian-capability curation for walk-or-drive route
  inventory. Sitemap and prerender currently share a predicate based on lane
  objects in each snapshot, so the inventory fluctuates as reports change.
  Keep this separate from document-language ownership; do not invent capability
  or expand routes without source evidence.

- [x] Separate CBP lane report times from snapshot retrieval on dashboard and
  crossing detail cards. Preserve raw report text and unknown dates; release
  verification belongs to the scoped pull request.

- [x] Approved Vercel production cutover: PR #109 merged, Actions publication
  succeeded, and IONOS apex/www DNS plus trusted HTTPS were verified. See
  issue #101 for publication evidence and exact rollback records.
- [x] Historical cutover verification: October 1 and October 2 scheduled
  Vercel production publications succeeded. These do not establish continued
  daily health; October 3-6 publication was blocked by dependency audit findings.
- [x] Implement the October 6 publication dependency repair and bounded
  generated-writer race recovery. Keep all existing release gates and the Pages
  rollback; production recovery requires a successful publication receipt.
- [ ] Verify fresh public history/FX after the repair and observe two subsequent
  scheduled publications. Keep first-week usage/cost review pending separately;
  no second monitoring automation or manual run counts as a scheduled success.
- [x] Publish Router/DOM 7.18.4 within the existing 62 KiB entry gate (PR #141,
  merge/source `5a681bad`, production run `39725320432`, matching READY deployment
  and public manifest). Both CI checks passed; served-version and EN/ES checks
  are recorded in the refresh runbook. Six moderate build-chain entries stay
  separate; parser 6.1.5 is not a Router fix. No security exception or budget change.
- [x] Keep the deferred dashboard summary within snapshot confidence (PR #143,
  source `a14654f3`, production run `39731300070`). Retain dated numbers and
  controls with neutral interpretation on stale/unknown/future/offline input;
  recover immediately on a valid response. Both final CI and native EN/ES QA
  pass; complete unmodified served-byte route suite passes 416 navigations.
- [x] Current-waits views refresh while open and on tab return/reconnection,
  including comparison, crossing, best-time, walk-or-drive and embed routes.
  Slow optional feeds no longer delay waits, and the service worker does not
  silently substitute an old response for the live API.
- [x] Remove the stale shared homepage FAQ schema, preserving visible homepage
  answers and crossing-specific FAQ generation. Bounded release checks cover
  generated metadata and client navigation; release evidence belongs in the PR.
  Broader prerender/runtime schema lifecycle work is outside this correction.
- Keep official northbound CBP data, source timestamps, honest stale states and
  the static fallback reliable. Keep the free experience supported by ads.
- Measure whether people complete a crossing decision and return. Review
  organic landing pages, search clicks, sharing, and actual ad revenue against
  operating cost before claiming an acquisition-to-revenue loop works.
- Improve one end-to-end journey from search query to crossing comparison or
  best-time decision. Avoid thin pages made only to capture more keywords.
- [~] Pilot the San Ysidro-to-Otay Mesa standard-passenger comparison. After
  release, review 30 days of `compare-open` clicks and San Ysidro page visits;
  use Search Console traffic as a guardrail, not causal proof. If Umami reports
  remain inaccessible, verify event emission and defer use claims.
  Comparison sharing and a fixed-choice usefulness prompt are prepared for the
  next release. Read `compare-share` and `compare-feedback` alongside visits;
  a feedback click is stated usefulness, not evidence of a completed crossing.
- [x] Correct the historical-pattern callout using validated weekday/hour
  evidence, sample counts and source dates (PR #139, `98930474`). Production
  run `39718320478`, public manifest and served EN/ES mobile/desktop behavior
  were verified October 22. No live claim is made from historical medians;
  malformed sources get a neutral unavailable state. Audit review is recorded
  in the existing runbook; the eight moderate entries remain separate work.
- Sebastian reports that Stripe is connected for BorderPulse. Verify the
  account, mode, product/Price, webhook and checkout state in Stripe before
  describing any paid offering or accepting a charge. The free, ad-supported
  crossing experience remains the current offer.

### Next: test one adjacent crossing job

- Interview or observe repeat crossers to find a specific unresolved decision.
  Candidates include departure timing, pedestrian-versus-driving choice,
  port-hour changes and official advisories. The existing trip-planner idea is
  a candidate, not a committed release.
- Prototype one corridor and one job with clear data sources, freshness and
  failure states. Measure use of the decision, not just page views. Only expand
  to more ports after that pilot helps people.
- Any document or program information should link to current official sources
  and state its last review date. Do not imply individualized legal or
  immigration advice.

### Later: a broader platform if use supports it

- Connect proven crossing jobs into a coherent bilingual trip experience.
- Explore business workflow products or sponsorships only with a real buyer,
  a differentiated outcome, a permissible data path and a written commitment.
  Stripe integration work can support a validated offer later; accounts,
  alerts and a database depend on the job being solved.
- Southbound timing needs a reliable, authorized source and an honest
  confidence model before it returns to the live product.

This direction does not override the current reliability and demand gates
below. The next product decision is still evidence about actual use and one
adjacent job, not a paid-stack build.

---

## Next up

Ranked roughly by leverage. Pick what fits the available time.

### Active execution queue — 2026-08-06 audit

The GitHub roadmap issue is [#56](https://github.com/sbc1-code/borderpulse/issues/56).
Work top to bottom; restore product trust before expanding the URL inventory.

- [x] **QC: `/alerts/` was a 404 on direct load** — nav link on every page, never
      prerendered. Fixed, plus `FUNCTIONAL_ROUTES` coverage in smoke-routes so
      sitemap-excluded routes cannot silently regress again. Dead `/status/:id`
      route removed.
- [x] **P0 — pin canonical port identity** — CBP substitutes whole rows for the
      same crossing, moving its URL. Was failing ~22% of deploys and serving a
      hard 404 on `/crossing/paso-del-norte/`. [#73](https://github.com/sbc1-code/borderpulse/pull/73).
- [~] **P0 — restore scheduled data deployment** — implementation shipped
      2026-08-06; keep [#57](https://github.com/sbc1-code/borderpulse/issues/57)
      open until two bot-only cycles publish their exact snapshot commits.
- [x] **P0 — fix the live `/best-time/` hub and add route smoke tests** —
      shipped 2026-08-06. The deploy gate now checks all 175 canonical and 20
      alias routes at desktop and mobile sizes (390 browser navigations).
- [x] **P1 — exclude closed hours from best-time recommendations** — shipped
      2026-08-18 in [#65](https://github.com/sbc1-code/borderpulse/issues/65).
- [x] **P1 — make freshness and missing-data states honest** — [#58](https://github.com/sbc1-code/borderpulse/issues/58) shipped 2026-08-20 in #80. Shared trust model in `src/lib/trustState.js`; thresholds measured, not assumed; headline switched from mean to median (35 → 15 min on a live sample).
- [ ] **P1 — reconcile sitemap aliases and Search Console indexing** — [#59](https://github.com/sbc1-code/borderpulse/issues/59). [#73](https://github.com/sbc1-code/borderpulse/pull/73) removes the root cause (slugs no longer move when CBP renames a port); GSC still needs a reconciliation pass.
- [ ] **P1 — improve CTR on the proven organic landing pages** — [#64](https://github.com/sbc1-code/borderpulse/issues/64).
- [ ] **P1 — instrument the core Umami decision funnel** — [#60](https://github.com/sbc1-code/borderpulse/issues/60).
- [~] **P2 — simplify first-use and mobile crossing selection** — [#62](https://github.com/sbc1-code/borderpulse/issues/62). PRs [#72](https://github.com/sbc1-code/borderpulse/pull/72) (single h1, WCAG 2.2 tap targets) and [#74](https://github.com/sbc1-code/borderpulse/pull/74) (Border Line + mobile card collapse, 17,888px -> 5,269px) cover the accessibility and scroll-length halves. Still open: the first-visit journey itself.
- [x] **P2 — clear vulnerable dependencies and add a CI gate** — [#63](https://github.com/sbc1-code/borderpulse/issues/63). All high severities cleared (8 -> 2 advisories); `scripts/check-audit.mjs` gates `npm test` on new high/critical. The 2 remaining moderates are react-router-only, need a v7 major, and were verified unreachable — accepted by advisory ID. See DECISIONS.md 2026-08-20.

- [x] **Re-bucket the aggregate grid** — shipped 2026-07-27, but NOT as
      weekday/weekend. That plan was measured and rejected: within-Mon-Fri
      spread of day medians is 25 min, 2.5x the Sat-Sun spread of 10 min
      (San Ysidro runs Mon 160 / Tue 160 / Fri 60), so pooling weekdays
      misses the true day median by 25 min at p90 and deletes the page's
      most useful advice. Day-of-week is the signal. Widened along the
      hour axis instead via an adaptive centred window (target 6 samples,
      cap +/-2h). Density median 2 -> 7, 86% of cells clear a floor of 5,
      `MIN_CELL_SAMPLES` raised 2 -> 5. "Last 30 days" copy still holds.
- [x] **Re-verify the best-time blog edits** — shipped 2026-07-27.
      All 14 posts (7 EN + 7 ES) were regenerated against the corrected
      aggregates, and `verify-blog-claims.mjs` now guards 172 figures.
- [ ] **Trip planner v0** — pick crossing + target arrival time → return
      a recommended departure window. Needs design pass first: input
      shape, confidence model, mobile UX. Flagship feature, biggest lift
      on this list.
- [x] **OG cards for `/best-time/:slug`** — shipped 2026-05-09.
      `build-og-cards.mjs` emits 43 per-slug PNGs; prerender wires them
      as og:image / twitter:image.
- [ ] **OG card for `/about`** — same idea, brand-anchored card.
- [x] **Programmatic SEO `/compare/:slugA-vs-:slugB`** — shipped
      2026-05-09. 15 seed pairs prerendered + sitemap'd. Add more
      via the single `COMPARE_PAIRS` inventory in `src/lib/comparePairs.js`.
- [ ] **Hreflang for ES variants** — currently EN/ES share the same URL
      and toggle in localStorage. For better ES SEO, consider
      `/mejor-hora/:slug` parallel routes with proper `<link
      rel="alternate" hreflang="es">` pointing.
- [ ] **Refactor: extract `useTypicalDelta` hook** — duplicated in
      `BorderCrossingCard.jsx` and `Embed.jsx`. Pull into `src/lib/`
      once a third caller emerges. Low priority, no user impact.
- [x] **Refactor: extract `usePersistentLanguage` hook** — shipped
      2026-05-09. `src/lib/useLanguage.js` is the single source; six
      inline copies removed.
- [x] **Accessibility deep-dive on older pages** — shipped
      2026-05-09. Dashboard toggle buttons carry `aria-pressed`,
      search has `aria-label`; Blog filter tabs got `aria-pressed`
      + `role="group"`; CrossingDetail and Alerts were already
      labeled. Verified live.
- [x] **Google Search Console sitemap submission** — verified 2026-08-05:
      `/sitemap.xml` is successful, was read that day, and reported 158 URLs
      before this release expanded the sitemap to 175.
- [ ] **Bing Webmaster Tools sitemap submission** — submit `/sitemap.xml`.
      (Not a code task.)
- [x] **Card "best time today" pill** — shipped 2026-05-09. Green
      pill on each homepage card linking to /best-time/<slug>.
      Suppressed when the user is already in the lightest window.

---

## Deferred / blocked on infra

- [ ] **Real `hello@borderpulse.com`** + B2B contact CTA — when the
      inbox exists, add a lightweight business contact path on `/about`
      or `/methodology`.
- [ ] **Embed analytics** — track which sites embed the widget. Needs
      a server (Cloudflare worker or similar). GitHub Pages doesn't
      expose access logs.
- [ ] **Auth tier (sync, SMS alerts, history)** — only justified if
      consumer paid tier becomes a real direction. See README/strategy
      notes.
- [ ] **Programmatic SEO `/best-time/:slug/:day`** — 7-day variants
      per crossing (≈300 EN + 300 ES = 600 pages). Hold until core
      `/best-time/:slug` ranks; then expand only for the high-traffic
      slugs.
- [x] **WhatsApp-formatted share card with best time included** —
      shipped 2026-05-09. ShareModal lazy-fetches aggregates and
      inlines "(best 7a)" per crossing. NB only.
- [ ] **Migrate CBP fetch off GH Actions cron** — only if cadence
      reliability becomes a competitive issue. Options: Cloudflare
      Workers cron, external cron service. Today the cost (worse UX,
      noisy stale banners) was paid by *removing* the cadence claim
      sitewide rather than improving the cadence itself.

---

## Won't do (for now)

- [-] **Login / account system** — no current need; complicates the
      auth/data-custodian footprint. Revisit only when sync or premium
      features actually exist.
- [-] **Targeted advertising / behavioral tracking** — out of scope.
- [-] **Personal-brand framing on `/about`** — site reads as a project,
      not as a person. Decision logged 2026-04-27.

---

## Shipped (current state)

Snapshot of features live on borderpulse.com today.

### Pages
- `/` — Dashboard with 44 wait cards, vs-typical comparison, geo prompt,
  region filters, search, direction toggle, right-rail stats + USD/MXN
- `/crossing/:slug` — Per-crossing detail with hourly chart (7-day
  selector), lightest-hour callout, recent advisories timeline,
  FAQs, nearby crossings compare, "Embed this" snippet generator
- `/best-time` — Hub table sorted by lightest-hour median across all 44
  crossings
- `/best-time/:slug` — Per-crossing landing page targeting "best time
  to cross [X]" search intent
- `/compare/:pair` — 15 hand-picked same-region crossing comparisons
- `/walk-or-drive/:slug` — 30 pedestrian-vs-vehicle decision pages
- `/blog` + `/blog/:slug` — 36 bilingual posts, 18 EN / 18 ES
- `/alerts` — Notification subscriptions management (toggle / delete
  per row)
- `/about` — Stats, methodology, "what runs in your browser"
- `/embed/:slug` — Iframe-friendly widget with theme/lang/direction
  URL params (intentionally `noindex`)
- `/status/:id` — Stub (existing, not actively used)

### Public data feeds
- `/data/crossings.json` — Live wait times, refreshed by scheduled cron
- `/data/aggregates/{slug}.json` — 30-day rolling per-crossing patterns
- `/data/timelines/index.json` + `/data/timelines/{slug}.json` —
  Curated advisories per crossing (subset)
- `/data/blog/index.json` + `/data/blog/tags.json` — Blog metadata
- `/data/stats.json` — Public aggregate stats (drives `/about`)

### Infra
- Vercel production via `.github/workflows/publish-vercel.yml`; daily prebuilt
  Actions publication plus application changes. IONOS owns domain/DNS.
- GitHub Pages deploy via `.github/workflows/deploy.yml` retained for rollback;
  recent jobs are pending/canceled, so verify a successful build before rollback.
- Scheduled CBP refresh via `.github/workflows/fetch-cbp.yml`; changed,
  validated snapshots explicitly dispatch the sole deployer with their SHA
- Sitemap (175 URLs) + RSS (36 entries) regenerated each prebuild
- Desktop/mobile browser smoke gate covers every sitemap URL and generated alias
- Code-split leaf routes (main bundle ~161 KB)
- Robots.txt allows AI crawlers, disallows `/embed/`
- Anonymous page-view analytics via Umami
- Bounded dashboard ad-slot diagnostics through existing Umami: script/DOM/
  container visibility stages only, not billed impressions or revenue. Actual
  ad-network totals still require publisher reports.
