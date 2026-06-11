# CHANGELOG

Append-only log of shipped work. Date entries roughly group what landed in
a single session. Pull from `git log` if you ever need raw commit detail.

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
