# CHANGELOG

Append-only log of shipped work. Date entries roughly group what landed in
a single session. Pull from `git log` if you ever need raw commit detail.

## 2026-05-09

QC follow-ups from issue #21 — the cleanup `bf348f8` started, finished
across the surfaces it missed. Plus a UX fix to the language toggle and
per-best-time OG cards for stronger share previews.

### Added
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
