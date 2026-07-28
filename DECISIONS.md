# DECISIONS

Short log of *why* something is the way it is. Append-only. Future-you (or
the AI you're collaborating with) reads this when "wait, why did we…"
comes up.

Format: date · one-line decision · short why.

---

## 2026-07-27 · Pool along hours, never across days

Density fixes must not buy samples with signal. Weekday/weekend pooling was
the obvious way to thicken the aggregate grid and it is rejected on measured
grounds: the within-Mon-Fri spread of day medians is 25 min, 2.5x the Sat-Sun
spread of 10 min, because Monday is the heaviest day and Friday the lightest
at most ports. Day-of-week is the product's core signal. Neighbouring hours,
by contrast, are highly autocorrelated, so the hour axis is where widening is
cheap. The window is adaptive (target 6 samples, cap +/-2h) so well-supported
cells keep their exact hourly value; a fixed wide window flattens peaks and
misplaces them. If you change the bucketing, re-measure coverage, distortion
AND peak localisation before shipping. Do not pick a scheme from intuition.

## 2026-07-27 · Derived counts never come from pooled cells

A pooled cell reuses each observation in up to five neighbouring hours, so any
document-level count summed from `by_hour` is inflated ~4x. `sample_count` and
`overall_median` accumulate from raw observations. This matters because
`build-rankings.mjs` gates inclusion on `sample_count`.

## 2026-07-27 · Any workflow that builds the site must clone full history

`build-aggregates.mjs` derives the 30-day window from `git log`, so the
build is only as correct as the clone depth. When `fetch-cbp.yml` took over
deployment, its shallow checkout silently truncated every aggregate to ~2
samples for weeks while the Action stayed green. If a workflow runs
`npm run build`, it needs `fetch-depth: 0`. Repo is 1,838 commits / 26 MB;
the clone cost is not worth optimizing against this failure mode.

## 2026-07-27 · Generated data directories are rebuilt, never appended

`public/data/aggregates/` is wiped and rewritten each run. Files there ship
from `public/` and are consumed by directory scan, so a stale slug left by
a CBP rename keeps being served and can outrank live pages. `presidio.json`
survived three months that way and ended up the sole entry in `rankings.json`
pointing at a 404. Anything generated per-slug gets the same treatment.

## 2026-07-27 · One sample is not a recommendation

The `(day, hour)` confidence floor lives in `src/lib/aggregates.js` as
`MIN_CELL_SAMPLES` and nowhere else. It was previously duplicated across
five call sites at 1, with fallbacks that dropped the floor entirely when
nothing qualified, which is strictly worse than showing nothing, because
it publishes the noisiest cell with the most confident wording. Pickers
now return null and the UI renders its existing sparse state. Set to 2 as
a floor the current data density can support; raising it requires
re-bucketing first, not just changing the constant.

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
- **No email capture until a newsletter actually exists (2026-06-11).**
  Removed all signup forms (footer, sticky banner, blog inline) and the
  Buttondown client. This extends "no fake contact paths": collecting
  subscribers for a newsletter nobody is writing is the same false
  promise. Re-add only when issues are actually being sent.

- **Pages deployments are serialized via a shared concurrency group
  (2026-07-02).** deploy.yml and fetch-cbp.yml both share group `pages`
  with `cancel-in-progress: false`. Concurrent Pages deployments from the
  two workflows kill each other with "Deployment failed, try again later"
  (proven when a push-triggered deploy and a dispatched fetch ran at the
  same time). Don't split them back into separate groups, and don't set
  cancel-in-progress back to true (it would kill mid-flight fetch runs).

## 2026-07-03 · Aggregates are port-local; never compare browser-now to buckets

`by_hour` buckets in `/data/aggregates/*.json` are in the PORT's local
day/hour and each file carries a `timezone` field. Any "what bucket is
it right now" lookup must use `nowInTz(aggregate.timezone)` or
`nowInPortTz(crossing)` from `crossingMeta.js`, never bare
`new Date().getDay()/getHours()` (browser tz) or `getUTC*` (the old,
wrong bucketing). Blog prose that quotes specific hours must be
computed from the port-local aggregates.

## 2026-07-03 · URL canon is trailing-slash

GitHub Pages serves `/dir/` with 200 and 301s `/dir` onto it. All
generated canonicals/sitemap/hreflang/RSS/internal nav links use the
trailing-slash form. New link-emitting code should too.

---

*Append a new section the next time a non-obvious decision lands.*
