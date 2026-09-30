# Public data refresh

## Ads and sharing closeout — 2026-09-27 Pacific

- Sebastian confirmed the public platform is supported by automatically served
  ads. This supersedes the earlier opt-in placement decision below.
- [PR #94](https://github.com/sbc1-code/borderpulse/pull/94), merge
  `da03e980383fa7504c574dd2796de17aba976a27`, removed the ad opt-in and
  published English/Spanish privacy and advertising disclosures.
  [Pages run 36370712116](https://github.com/sbc1-code/borderpulse/actions/runs/36370712116)
  passed; the dashboard and both privacy routes returned HTTP 200.
- [PR #95](https://github.com/sbc1-code/borderpulse/pull/95), merge
  `91843791d53ea4bf2c73496ff4a75032dd23db0a`, added bilingual native-share,
  WhatsApp, and copy-link controls on crossing pages, descriptive wait-time
  headings, and a link to historical planning. Shared messages use the
  canonical crossing URL without a cached wait-time claim.
  [Pages run 36374113003](https://github.com/sbc1-code/borderpulse/actions/runs/36374113003)
  passed. Live San Ysidro readback confirmed HTTP 200, the new heading and
  WhatsApp URL, and no horizontal overflow at 375px.
- Verification: production build, full test suite (404 desktop/mobile
  navigations), EN/ES copy and share fallback, desktop native-share payload
  and event, and historical planning navigation passed. No new dependency
  or service was added. Existing unrelated local edits were preserved.
- Measurement is instrumented through `crossing-share` with crossing slug
  and method. Real analytics ingestion, traffic lift, and ad revenue have
  not been established by these checks. Next: measure search clicks,
  crossing-page visits, shares, and ad revenue over the first 30 days;
  continue observing refresh cadence and check AdSense review status.
  No external promotion or outreach was sent in this session.
- Retain the December 26 Scheduler-token renewal requirement below.

## Verified closeout — 2026-09-27 Pacific

- PR #89 restored the Adsterra placement code and added AdSense ownership
  verification. AdSense ownership and ads.txt are verified; review was
  requested and remains pending approval. Adult ads are disabled in Adsterra;
  the existing opt-in placement remains active.
- PR #90 (`cd5ffb65`) deployed successfully in Pages run `36363887817`.
  Both release checks passed. This repaired dashboard background updates,
  retained last-good data on failure, and made fetch freshness visible.
- Cloud Scheduler's automatic 17:52 Pacific execution succeeded. Its GitHub
  fetch run `36363785834` succeeded, and the public JSON readback confirmed
  `fetched_at: 2026-09-28T00:52:28.201Z`, with 42 crossings.
- PR #91 (`c816b7a8`) deployed successfully in Pages run `36364313380`.
  Both release checks passed; mobile search placement and EN/ES control
  labels were checked at 390px, and the final controls were read back live.
- Expected incremental recurring cost is $0 within the current free
  allowance. Google Maps remains disabled. Ad revenue and long-term cadence
  still require measurement; one successful scheduled delivery is not an
  uptime guarantee.
- Next operational requirement: renew the restricted scheduler token before
  **December 26, 2026**, and update its Authorization header. Check AdSense's
  review result before enabling Google ad serving.

## Configuration (2026-09-27)

- Google Cloud project: `borderpulse-493414`.
- Cloud Scheduler job: `us-central1/borderpulse-refresh`.
- Schedule: `7,22,37,52 * * * *`, timezone `Etc/UTC`.
- HTTPS POST to the GitHub `fetch-cbp.yml` workflow dispatch endpoint;
  body `{"ref":"main"}`. The existing writer validates and commits the CBP
  snapshot, then explicitly dispatches the Pages deployer.
- Existing GitHub cron remains a fallback, not evidence of timely delivery.
- Fine-grained GitHub token: `borderpulse-cloud-scheduler`, restricted to
  `sbc1-code/borderpulse`, Actions read/write and required Metadata read.
  Expires **2026-12-26**. Renew before that date and replace the Scheduler
  Authorization header. Never commit or paste the token into project docs.
- One Scheduler job uses the billing account's three-job free allowance;
  check account-wide allocation before adding more jobs. GitHub standard
  runners are free for this public repository. Maps remains disabled.

## Verify the full path

1. Scheduler's last execution succeeds on a scheduled quarter-hour.
2. A corresponding GitHub `workflow_dispatch` fetch run succeeds.
3. Its explicitly dispatched Pages deployment succeeds.
4. `https://borderpulse.com/data/crossings.json` has the new `fetched_at`
   and nonempty crossing data. A successful dispatch alone is insufficient.

The dashboard subscribes to snapshot changes, checks every five minutes,
and checks again when its tab becomes visible. Connection failures retain
the last successful snapshot with its original timestamp. The source's
individual lane update times can be older than the site's fetch time.

## Recovery and costs

If refresh stops, inspect Scheduler delivery errors, token expiry, the
fetch run, and the Pages deployment in that order. A manual workflow dispatch
can restore a snapshot while the trigger is repaired. Pause this Scheduler
job to stop its dispatches; the existing GitHub schedule remains available.

Do not reactivate paid Maps or add recurring services until revenue supports
them and Sebastian authorizes the expense.

## Vercel daily publication — prepared, not activated

Public hosting remains Pages until an explicit production/domain decision.
Keep PR #87's paid/account stack separate. The release in #106 can ship on
Pages before this hosting work.

`publish-vercel.yml` runs daily at **08:17 UTC**, on app changes to `main`,
or by manual dispatch. It ignores data, generated OG, sitemap/RSS, docs and
draft-only pushes. Keep Vercel's project disconnected from automatic Git
deployments. The collector still runs every 15 minutes and dispatches the sole
Pages deployer. Both hosts build the same Vite app; only Vercel enables
`VITE_PUBLIC_CBP_API=true`.

### Activate preview only after credential approval

1. Merge the reviewed hosting changes after the independent product release.
   Wait for one successful collector run on `main` so its current crossings
   and materialized history match; validate those inputs before activation.
   Review the workflow and passing release checks. Store an approved Vercel
   access token as the repository Actions secret `VERCEL_TOKEN`, scoped to
   the existing team with the narrowest deployment permissions the account
   supports. Document expiry privately and rotate before expiry. Never paste
   a token into an issue, chat, source file or log. No secret is committed here.
2. Set repository variables `VERCEL_PUBLISH_TARGET=preview` and
   `VERCEL_PUBLISH_ENABLED=true`. The workflow accepts only the `main` ref;
   it snapshots latest `main` at job start to avoid queued pushes publishing
   older data. Its concurrency group serializes deployments.
3. Dispatch `publish-vercel.yml`. It uses Node 24 and the existing Vercel CLI
   version 61.1.0, validates inputs, pulls preview settings, runs `vercel build`
   in Actions, runs `npm test`, rechecks freshness, and uploads with
   `vercel deploy --prebuilt`. It performs no remote Vercel build.
4. Read the deployed `/data/publication.json` and compare it with the Actions
   summary and retained artifact. Verify live `/api/public/crossings`, current
   dashboard timestamps, history, FX, EN/ES deep links and automatic Adsterra.
   Existing preview authentication stays enabled.
5. Observe two scheduled daily publications. The manifest must advance its
   history and FX timestamps; intervening collector commits must produce no
   Vercel deployments. A manual run is not proof of the daily schedule.

No new service or credential is needed to test a local prebuilt preview with
the existing CLI login. The unattended Actions credential is a separate gate.

### Verified candidate preview

The authenticated [candidate preview](https://borderpulse-1aclctmdc-sbc1-codes-projects.vercel.app)
is ready at deployment `dpl_4dt2z2rNsmkrEsTw3VJv1WX8WTLx`; it has no production
alias. Its log confirms prebuilt artifacts, with no remote application build.
The artifact manifest records runtime source `ba320b18` and 403 historical
snapshots. Deployment metadata records `b65c6f89`, which adds only documentation
and the audit-report validation fix after the local build.

Authenticated browser readback confirmed 42 live crossings fetched at
`2026-09-30T05:02:02.700Z`, newer than the bundled `04:22:28.572Z` snapshot;
the dashboard displayed the same live timestamp. Comparison history, canonical
sharing controls, USD/MXN and automatic Adsterra creatives loaded. The unknown
route rendered the prepared 404 page; the packaged route configuration returns
status 404. Local verification passed 406 route navigations, EN/ES desktop and
mobile growth interactions, 18 publication/function tests and four refresh
tests. GitHub release checks passed for both #106 and hosting head `b65c6f89`.

The immediate post-deployment usage readback remained $0.27 for BorderPulse and
$2.46 of the team's $20 credit. The page warns of up to one hour of reporting
delay; this unchanged rounded reading does not prove zero deployment cost.
Daily automation, two scheduled observations and production cost validation
remain pending. No production release or DNS change has occurred.

### Data and failure contract

- Current CBP and generated history must be no more than 90 minutes old at
  validation, matching the existing stale threshold. Reject timestamps more
  than five minutes in the future and fewer than the collector's 35-port floor.
- Require ordered unique snapshots, at least 27 days of historical reach,
  and a final observation matching current waits. The 27-day gate detects
  catastrophic history truncation, not continuous coverage. The aggregate
  builder filters observations to its exact 30-day window; sparse cells keep
  existing availability labels. Historical entries get a one-day boundary
  allowance because the collector artifact precedes publication.
- Require a positive USD/MXN quote fetched within 48 hours. This verifies
  retrieval time, not an invented FX-market observation timestamp.
- `/data/publication.json` reports commit SHA, preparation time, current-data
  timestamp, first/last historical observations, snapshot count and FX fetch
  time. This additive diagnostic file does not replace source timestamps.
- Bad data, failed checks or a failed upload stop publication. A deduplicated
  GitHub operations issue reports failure/recovery. Inspect before retrying;
  do not weaken the gates. A missed daily publish can make history/FX old while
  current waits continue via the independent live function. If the live source
  fails, the UI labels the actual bundled fallback age or retains a newer
  browser reading; no fresh timestamp is synthesized.

### Cost baseline and production gate

Read from Vercel Usage at approximately 21:41 PDT on September 29, before this
candidate's deployment (usage can lag by up to one hour): Sep 13–Oct 13 team
cycle **$2.46 / $20 credit**, including **$2.28 build CPU**; invoice total $20
after usage credits. BorderPulse **$0.27**, mostly **$0.26 build CPU**, 784 CDN
requests and 3 MB transfer. These are preview measurements, not production
capacity or revenue evidence.

Measure again after the prebuilt preview and the two scheduled publications:
project build CPU, function invocations/CPU/memory, deployment storage, transfer,
and shared-team remaining credit. Build logs must show local/prebuilt uploads,
not Vercel remote builds. Record representative request counts with the billing
window and rounding/delay limits; do not manufacture ad impressions to simulate
traffic. Calculate 31 daily publications plus observed code releases separately
from traffic. Hold cutover if incremental spend cannot be bounded within the
remaining shared credit. Maximum authorized new monthly/on-demand spend: $0.
Do not change the team's $200 alert/Pause Off setting or enable a team-wide
pause that could affect DIGITO without a separate decision.

### Cutover and rollback packet

Before requesting the final decision, record the tested commit/deployment URL,
two daily-run manifests, actual usage deltas, exact Vercel project-specific DNS
targets and a recent successful Pages deployment. Keep the current IONOS
nameservers, mail/TXT records and `borderpulse.com` canonical origin.

Captured rollback DNS (recheck at approval):

| Host | Type | Value | TTL |
| --- | --- | --- | --- |
| @ | A | 185.199.108.153 | 3600 |
| @ | A | 185.199.109.153 | 3600 |
| @ | A | 185.199.110.153 | 3600 |
| @ | A | 185.199.111.153 | 3600 |
| www | CNAME | sbc1-code.github.io | 3600 |

Read-only Vercel domain-configuration API lookup for project
`prj_ftFsRRgb2QcOKUmhG3If4rWRWI8e` returned these rank-1 targets on September 29:

| Host | Type | Proposed value | TTL |
| --- | --- | --- | --- |
| @ | A | 216.150.1.1 | 3600 |
| @ | A | 216.150.16.1 | 3600 |
| www | CNAME | 84c88a1a10d2756f.vercel-dns-016.com | 3600 |

Replace the four Pages apex A records with the two recommended Vercel A records
and replace the `www` CNAME only after approval. Vercel has no attached
`borderpulse.com` domain yet; the read-only recommendation does not attach it.
Public DNS showed no apex AAAA or CAA records. The `www` IPv6 answers currently
come from its Pages CNAME, not a separate `www` AAAA record. Re-read all records
and Vercel recommendations at cutover, including any ownership TXT challenge.
Set `www` to redirect to `https://borderpulse.com` in the project domain setup.
Leave IONOS nameservers and unrelated records intact. Allow the current
3600-second TTL when evaluating propagation and rollback.

After approval: build for production (`vercel pull --environment=production`,
`vercel build --prod`), run checks, upload `vercel deploy --prebuilt --prod`,
attach the reviewed apex/www domain configuration, and replace only the
reviewed website DNS records. Set `VERCEL_PUBLISH_TARGET=production` only as
part of this approved cutover. Verify anonymous HTTPS, apex/www canonical
redirects, deep links, true unknown-route 404s, live waits, fallback, history,
FX and ads before describing the move as complete.

Keep Pages and its collector publishing for the first week. The cutover
approval should also authorize restoring the captured DNS if Vercel-specific
availability, freshness or cost failures require rollback. On rollback, set
`VERCEL_PUBLISH_ENABLED=false`, restore the Pages DNS records, verify HTTPS and
fresh Pages data, and record the reason in #101 and Current Focus. A shared CBP
upstream outage alone is not evidence that a host rollback will fix the feed.
