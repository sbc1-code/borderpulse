# ROADMAP

What's next, what's deferred, what's shipped. Lightweight backlog so each
session starts from a synced doc, not chat memory.

Status legend: `[ ]` open · `[~]` in flight · `[x]` shipped · `[-]` won't do

---

## Next up

Ranked roughly by leverage. Pick what fits the available time.

- [ ] **Trip planner v0** — pick crossing + target arrival time → return
      a recommended departure window. Needs design pass first: input
      shape, confidence model, mobile UX. Flagship feature, biggest lift
      on this list.
- [ ] **OG cards for `/best-time/:slug`** — currently uses the generic
      crossing OG card. Generate per-slug share previews showing the
      lightest hour ("Best time at San Ysidro: 1 AM") for stronger
      WhatsApp / Twitter / Slack share previews.
- [ ] **OG card for `/about`** — same idea, brand-anchored card.
- [ ] **Programmatic SEO `/compare/:slugA-vs-:slugB`** — high-traffic
      pairs (San Ysidro vs Otay, PDN vs BOTA, Hidalgo vs Pharr, etc.).
      ~6–10 pages. Targets "X vs Y" search intent.
- [ ] **Hreflang for ES variants** — currently EN/ES share the same URL
      and toggle in localStorage. For better ES SEO, consider
      `/mejor-hora/:slug` parallel routes with proper `<link
      rel="alternate" hreflang="es">` pointing.
- [ ] **Refactor: extract `useTypicalDelta` hook** — duplicated in
      `BorderCrossingCard.jsx` and `Embed.jsx`. Pull into `src/lib/`
      once a third caller emerges. Low priority, no user impact.
- [ ] **Accessibility deep-dive on older pages** — the new pages
      (Embed, Api, BestTime, About) got an a11y pass. Dashboard,
      CrossingDetail, Blog, Alerts have not. Sweep for missing
      aria-labels, focus management, screen-reader friendliness.
- [ ] **Sitemap submission** — submit `/sitemap.xml` to Google Search
      Console + Bing Webmaster Tools so the 100+ URLs get crawled
      faster. (Not a code task.)
- [ ] **Card "best time today" pill** — surface today's lightest hour
      directly on each homepage card so users discover `/best-time`
      without going through the `···` menu. Consider this only if the
      card density doesn't bloat.

---

## Deferred / blocked on infra

- [ ] **Real `hello@borderpulse.com`** + B2B contact CTA — when the
      inbox exists, restore the commercial CTA on `/api`.
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
- [ ] **WhatsApp-formatted share card with best time included** —
      enhance the existing `ShareModal` to inline today's lightest
      hour. Small touch; would help share-conversion.

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
- `/` — Dashboard with 43 wait cards, vs-typical comparison, geo prompt,
  region filters, search, direction toggle, right-rail stats + USD/MXN
- `/crossing/:slug` — Per-crossing detail with hourly chart (7-day
  selector), lightest-hour callout, recent advisories timeline,
  FAQs, nearby crossings compare, "Embed this" snippet generator
- `/best-time` — Hub table sorted by lightest-hour median across all 43
  crossings
- `/best-time/:slug` — Per-crossing landing page targeting "best time
  to cross [X]" search intent
- `/blog` + `/blog/:slug` — 12 bilingual posts, 6 EN / 6 ES
- `/alerts` — Notification subscriptions management (toggle / delete
  per row)
- `/api` — Documentation for the public JSON endpoints
- `/about` — Stats, methodology, "what runs in your browser"
- `/embed/:slug` — Iframe-friendly widget with theme/lang/direction
  URL params (intentionally `noindex`)
- `/status/:id` — Stub (existing, not actively used)

### Public data feeds
- `/data/crossings.json` — Live wait times, refreshed every 15 min
- `/data/aggregates/{slug}.json` — 30-day rolling per-crossing patterns
- `/data/timelines/index.json` + `/data/timelines/{slug}.json` —
  Curated advisories per crossing (subset)
- `/data/blog/index.json` + `/data/blog/tags.json` — Blog metadata
- `/data/stats.json` — Public aggregate stats (drives `/about`)

### Infra
- GitHub Pages deploy via `.github/workflows/deploy.yml`
- Scheduled CBP refresh + redeploy via `.github/workflows/fetch-cbp.yml`
- Sitemap (~104 URLs) + RSS (12 entries) regenerated each prebuild
- Code-split leaf routes (main bundle ~161 KB)
- Robots.txt allows AI crawlers, disallows `/embed/`
- Anonymous page-view analytics via Umami
