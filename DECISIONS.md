# DECISIONS

Short log of *why* something is the way it is. Append-only. Future-you (or
the AI you're collaborating with) reads this when "wait, why did we…"
comes up.

Format: date · one-line decision · short why.

---

## 2026-04-27

- **No personal-brand framing on `/about`.** The site reads as a project,
  not as a person. Future content should follow this.
- **No "we don't / never / ever" privacy promises.** Describe what's
  running today (Umami anonymous, opt-in ads, localStorage) without
  locking in commitments the project might ethically revisit later.
- **No `hello@borderpulse.com` references** until that inbox actually
  exists. Same rule for any other contact path.
- **Embed pages are `noindex` and `Disallow: /embed/`** — meant for
  iframe use on third-party sites, not for search-result competition
  with the canonical `/crossing/:slug` pages.
- **Card vs-typical floor lowered to `samples >= 1`** with
  `aggregate.overall_median` as fallback. Reason: 30-day rolling sample
  often gives only 1 sample per (day-of-week, hour) bucket; the original
  `samples >= 3` floor filtered the comparison off every card. Not
  statistically clean but the alternative was no signal at all.
- **Code-split leaf routes** even though we're a small SPA. Reason:
  embed iframes get fetched on third-party sites and shouldn't pull
  the full app for a sidebar widget.
- **Trip planner deferred.** Needs a design pass on input shape +
  confidence model + mobile UX before code. Spawning an agent cold
  would yield a half-baked feature.
- **Markdown (not Notion) for project state on this repo.** AI tools
  read/edit markdown directly; Notion requires copy-paste. Migrate
  if the repo gets a collaborator or ROADMAP hits ~50 open items.
- **Stop promising "every 15 minutes" cadence anywhere.** GitHub
  Actions free-tier cron is throttled in practice (workflow scheduled
  `*/15` fires every 60–90 min). Site-wide language is now
  "refreshed regularly" or "scheduled cron". Migrate to a more
  reliable scheduler (Cloudflare cron / external) only if cadence
  becomes a competitive blocker.
- **Stale-data banner removed.** A user can't do anything about
  data being 30 min old, and the banner was firing constantly.
  Per-card `updated_at` is enough freshness signal.

---

## 2026-05-16

- **No pricing surface yet.** `/services` + `/servicios` were built and
  then pulled the same day. Reason: free product needs to earn more
  trust before any paid offer enters the picture. Pro waitlist stays
  (signal collection without a price tag is fine).
- **`/sobre` Spanish-canonical alias of `/about`** — kept. Pattern
  proven on the marketing pages even though /services + /servicios got
  pulled; same direction as the ROADMAP "Hreflang for ES variants"
  item. Worth extending next to `/best-time/:slug` → `/mejor-hora/:slug`
  when ES organic on best-time pages picks up.
- **Email capture is wire-compatible, not wired.** `EmailCapture` posts
  to `VITE_NEWSLETTER_ENDPOINT` if set, otherwise queues to
  localStorage (`borderPulse_newsletterQueue_v1`). Reason: GitHub Pages
  can't hold a Resend API key safely; the form needs to be real on
  launch day either way. Provider TBD (Resend behind a Cloudflare
  Worker, Buttondown, or ConvertKit hosted form) — no code change
  required to wire it, just the env var.
- **Analytics tiles surface "—" rather than identical peak/lightest.**
  Gates Peak/Lightest/Heaviest behind ≥2 populated buckets with ≥2
  distinct averages. Showing the same hour as both peak AND lightest
  is worse than admitting the data is thin — analytics surfaces need
  to earn trust on day one.
- **Reading time + TOC + related posts computed at runtime via `?raw`
  MDX glob.** Blog runtime chunk grew (~56KB gzip) — accepted because
  it only ships on /blog and /blog/:slug (lazy-loaded, not in the
  homepage critical path) and avoids coupling build-blog-index.mjs to
  the runtime via a generated meta file. If the bundle grows past
  ~200KB gzip, move the precompute into build-blog-index and ship a
  generated `_meta.js`.
- **Blog TOC only when ≥3 H2s.** Shorter posts get visual noise from a
  1-2 entry TOC; the data-analysis posts that benefit all comfortably
  clear the bar.
- **Auto-anchor H2 IDs use a shared slugify** (`src/lib/headingSlug.js`)
  so the same string the MDX h2 emits as `id` is what the TOC builds
  its `href` from. Spanish accents normalized via NFKD so `## Mejor
  hora` becomes `mejor-hora`, not `m_ jor-hora` or a query-unsafe id.

---

*Append a new section the next time a non-obvious decision lands.*
