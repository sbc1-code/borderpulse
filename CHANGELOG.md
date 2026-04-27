# CHANGELOG

Append-only log of shipped work. Date entries roughly group what landed in
a single session. Pull from `git log` if you ever need raw commit detail.

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

## Earlier sessions

Before this changelog existed. Use `git log` for archeology.
