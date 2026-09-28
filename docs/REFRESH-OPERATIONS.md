# Public data refresh

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
