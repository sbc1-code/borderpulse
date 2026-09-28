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
