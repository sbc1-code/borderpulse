# ROADMAP

What's next, what's deferred, what's shipped. Lightweight backlog so each
session starts from a synced doc, not chat memory.

Status legend: `[ ]` open · `[~]` in flight · `[x]` shipped · `[-]` won't do

---

## Next up

Ranked roughly by leverage. Pick what fits the available time.

### Active execution queue — 2026-08-06 audit

The GitHub roadmap issue is [#56](https://github.com/sbc1-code/borderpulse/issues/56).
Work top to bottom; restore product trust before expanding the URL inventory.

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
- [ ] **P1 — make freshness and missing-data states honest** — [#58](https://github.com/sbc1-code/borderpulse/issues/58).
- [ ] **P1 — reconcile sitemap aliases and Search Console indexing** — [#59](https://github.com/sbc1-code/borderpulse/issues/59). [#73](https://github.com/sbc1-code/borderpulse/pull/73) removes the root cause (slugs no longer move when CBP renames a port); GSC still needs a reconciliation pass.
- [ ] **P1 — improve CTR on the proven organic landing pages** — [#64](https://github.com/sbc1-code/borderpulse/issues/64).
- [ ] **P1 — instrument the core Umami decision funnel** — [#60](https://github.com/sbc1-code/borderpulse/issues/60).
- [~] **P2 — simplify first-use and mobile crossing selection** — [#62](https://github.com/sbc1-code/borderpulse/issues/62). PRs [#72](https://github.com/sbc1-code/borderpulse/pull/72) (single h1, WCAG 2.2 tap targets) and [#74](https://github.com/sbc1-code/borderpulse/pull/74) (Border Line + mobile card collapse, 17,888px -> 5,269px) cover the accessibility and scroll-length halves. Still open: the first-visit journey itself.
- [ ] **P2 — clear vulnerable dependencies and add a CI gate** — [#63](https://github.com/sbc1-code/borderpulse/issues/63).

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
- GitHub Pages deploy via `.github/workflows/deploy.yml`
- Scheduled CBP refresh via `.github/workflows/fetch-cbp.yml`; changed,
  validated snapshots explicitly dispatch the sole deployer with their SHA
- Sitemap (175 URLs) + RSS (36 entries) regenerated each prebuild
- Desktop/mobile browser smoke gate covers every sitemap URL and generated alias
- Code-split leaf routes (main bundle ~161 KB)
- Robots.txt allows AI crawlers, disallows `/embed/`
- Anonymous page-view analytics via Umami
