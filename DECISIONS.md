# DECISIONS

Short log of *why* something is the way it is. Append-only. Future-you (or
the AI you're collaborating with) reads this when "wait, why did we…"
comes up.

Format: date · one-line decision · short why.

---

## 2026-05-29 · Normalize CBP locale + refuse empty snapshots

CBP serves its public `bwtpublicmod` feed in Spanish or English depending on
server-side locale, and it flipped to Spanish on 2026-05-29 with no warning,
breaking the English-only `border === 'Mexican Border'` filter. Rather than
chase the locale, `fetch-cbp.mjs` now normalizes every field we depend on
(`border`, `port_status`, lane `operational_status`) from either language to
canonical English, so the pipeline is language-agnostic going forward. Paired
with a hard floor (`MIN_CROSSINGS = 35`): if the deduped count collapses, the
script throws instead of overwriting `crossings.json`. A near-empty publish is
never correct, so the right failure mode is keeping the last-good data and
failing loudly (the Action's deduped failure-issue step), not shipping zeros.

## 2026-05-29 · Remove visible API docs, keep data feeds as implementation

The `/api` page framed BorderPulse as if it had a supported developer API,
but the site is a static consumer product and those JSON files are primarily
its own data layer. Keep `/data/*.json` because the dashboard, embeds, and
build scripts depend on them. Remove the visible API nav/docs surface and
redirect old `/api` inbound links to `/methodology`, which explains the data
model without inviting API-product expectations.

## 2026-05-26 · Active products must link back into the Digito ecosystem

BorderPulse is the live traffic asset, but Digito is the product umbrella.
The site should not bury that relationship in a tiny logo-only attribution.
Use explicit links such as "More Digito tools" so visitors can move from a
single utility into the broader catalog. Digito must also link back to each
active product from `/tools`.

## 2026-05-25 · CI failures auto-file deduped issues, never live in Gmail

A 4-day BorderPulse data outage went undetected because the only signal was
GitHub Action failure emails sitting in a Gmail inbox of 275K messages.
Added a `failure()` step on every scheduled workflow that opens a labeled
issue on first failure and suppresses follow-ups until the issue is closed.
First-class visibility on the Engineering board; no more "I saw the email
and forgot." Workflow slugs are themselves labels (`fetch-cbp`,
`anomaly-scan`, `fetch-news`) so each pipeline has its own dedup lane.

## 2026-05-25 · Vite + @vitejs/* must move together in Dependabot

Plugin-react@6 needs vite@^8; a solo bump of either breaks `npm ci`.
Grouped them in `.github/dependabot.yml` so a future major-version PR
includes both. Majors still ignored until an explicit migration sprint.

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
