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

*Append a new section the next time a non-obvious decision lands.*
