# Daily evidence-led blog pilot

Created by ChatGPT (Codex) · October 29, 2026 (Pacific) · Owner-authorized
BorderPulse publishing pilot; implementation/release evidence is tracked in
the associated GitHub pull request.

## Scope and provenance

The owner authorized an automatic BorderPulse-only blog experiment on October
29, 2026. Routine measured-data reporting may publish after machine checks.
No individual human review is claimed: posts use `source: daily-pilot`,
`humanEdited: false`, a separate automated author and a visible EN/ES disclosure.
The old `auto-a`/`auto-b` review gate remains in place.

This first version uses AI-assisted editorial templates and deterministic
calculations, not daily generative-model calls. The repo has no LLM API secret;
no credential, service, model subscription or paid API is added. GitHub Actions
and the existing Vercel publisher are reused. Account-wide hosting/Actions
allowances and bills were not audited; there is no new paid API usage or
assertion of unlimited free hosting.

Only a closed historical Standard northbound passenger-wait report can pass.
Legal, immigration, entry, health/safety advice, scraped news, arbitrary model
prose and source-page instructions have no autonomous publication route. Those
need factual research and explicit human review. No RSS-based factual
verification is claimed. The existing manual news-curation flow stays manual.

## Daily operation

`.github/workflows/daily-blog.yml` requests 08:37 America/Los_Angeles each day:
cron `37 15,16 * * *`, with the Pacific-hour gate selecting one DST-appropriate
slot. GitHub may delay scheduled jobs; a run delayed outside the 08 hour skips
rather than publishing at an unexpected time. This is a daily attempt, not a
one-post-per-day quota. The existing daily Vercel/data and hourly anomaly jobs
have different roles and remain separate. No overlapping blog schedule was
found in the existing repo workflows or local Codex automation inventory.

`BLOG_PILOT_ENABLED=true` allows writes; absence/false keeps the workflow in
read-only dry-run mode. Manual dispatch defaults to `dry_run=true`. Manual
`dry_run=false` is an intentional publication/recovery run, still subject to
all content and release checks. A local preview is `npm run blog:daily`; it
writes nothing. `npm run blog:daily -- --write` is for an isolated candidate;
the production writer itself refuses local execution.

The shared `repository-writer` queue and existing bounded regenerate-on-race
writer preserve the collector. A same-day rerun skips duplicate content. A
retry after source commit but failed Vercel dispatch dispatches the existing
publisher again; it does not create another report. No PR approval or merge
is automated. Current GitHub branch protection is respected: if a push is
rejected without a main advance, stop and report the policy/auth failure.

## Evidence and usefulness gate

- Current CBP and generated history timestamps must be valid ISO UTC and no
  older than 90 minutes, with the newest history snapshot matching retrieval.
- Use the existing immutable 30-day history artifact, restricted to the two
  prior complete seven-day UTC periods. Select only configured, verified port
  identities. Remote names and prose are ignored.
- Each of seven weekday pairs needs at least 12 matching UTC hours, with
  at least three numeric retained reports per included hour in both weeks.
  Missing, invalid and unavailable waits never become zero.
- Compute hourly medians, then daily medians of exactly the matching hours
  within each weekday pair, then seven-day medians. Disclose every included
  hour and count; these are not full-day estimates.
  This avoids overweighting frequently collected hours/days. Repeated CBP
  values are retained observations, not independent traveler measurements.
- Require an absolute difference of at least 15 minutes and 25%, nonoverlapping
  central daily-summary ranges, and the same direction in at least six of
  seven matched weekday pairs. These filters are not significance tests or
  evidence of causation. They also do not prove upstream CBP report freshness:
  the compact archive retains collector retrieval clocks, not original CBP
  update clocks. The prose describes that limit rather than inventing them.
- Publish at most one EN/ES pair per UTC day. Avoid any port covered by a
  published article in the last seven days; suppress repeated finding
  fingerprints. Weak or routine changes produce a logged skip, not filler.

Each report stores its retained, commit-attributed observations and reproduced
calculations at `/data/blog-evidence/observed-waits-YYYY-MM-DD.json`. It cites
CBP, the exact GitHub history revision and that receipt. `publishedAt` in the
receipt is the preparation time for automated publication; the text labels it
as preparation, not a live deployment receipt. The existing Vercel run records
actual release time/commit. Receipt freshness is rechecked at completion so a
slow verification cannot upload expired evidence.

Before building the blog index, the machine gate recomputes all calculations,
checks source provenance/identity, requires both languages, and compares the
entire content with the closed renderer. Neither a changed number nor an
unverified extra sentence can pass. Old posts are validated against their
preparation clock, not rewritten when the live rolling archive changes.

## Release and monitoring

Generation runs `npm run build` and the complete unchanged release suite
(`npm test`) before committing its three permitted files. Optional absent
paths support clean skips without weakening the writer's exact-path allowlist.
A fresh source commit is not deployment proof: GITHUB_TOKEN pushes do not
trigger other workflows, so the pilot explicitly dispatches
`publish-vercel.yml`. That existing publisher independently checks collector
freshness, build, security, bundle and browser gates before deploying verified
prebuilt output using the existing Vercel credential. It retains its publication
manifest. Its normal failure issue remains the deployment alarm.

The blog workflow records selection/skip in logs and its Actions summary. A
failure opens one deduplicated `[ops] Daily blog pilot held` issue and a later
healthy run closes it. A healthy skip does not assert that a previous source
commit has been deployed. Publication success still needs the Vercel run and
public content/manifest readback. No social or customer message is sent.

## Pause, correction and rollback

1. Set `BLOG_PILOT_ENABLED=false` to stop future content writes immediately.
   For a run already queued/running, cancel that run too; changing a variable
   does not revoke a job's already-resolved authorization.
2. For an incorrect article, remove its EN/ES files and receipt together in an
   ordinary reviewed correction/revert. Re-run build and release checks. Do
   not leave a broken translation pair or falsify `humanEdited`.
3. Publish the corrected main through the existing publisher and verify both
   public URLs/index. Use its existing deployment rollback procedure if the
   application release itself breaks. Preserve the collector and other posts.
4. Investigate the evidence or generation defect before re-enabling. A source
   failure or no useful change is a hold/skip; never lower gates to fill a day.

The local regression suite exercises data extraction/calculation, thin/stale/
missing/invalid sources, EN/ES equality and compilation, source injection,
changed prose/numbers/receipts, duplicate reruns, optional writer outputs and
rollback of all three files. Existing writer tests cover races, policy denial
and accepted pushes with lost responses. A fixture proves the eligible path;
it is synthetic test data and must never be published as a real post.
