# BorderPulse paid beta contract

Status: proposed implementation contract. It is not live, does not create a
Stripe product, and does not authorize production billing.

## Product boundary

The public BorderPulse dashboard remains free and useful:

- current official CBP northbound wait data;
- crossing pages, comparisons, best-time views, and bilingual guidance;
- source, freshness, methodology, and limitations.

The proposed paid beta is **BorderPulse Plus**. Its value is continuity and
personalization around the free data:

- account-synced saved crossings across devices;
- one to three northbound crossing watch rules;
- lane selection, wait threshold, weekday selection, and a local time window;
- email notifications that can reach a user after the tab is closed;
- personal alert-delivery history and account-synced saved-crossing history;
- an ad-free product surface as a secondary benefit.

The beta does not promise southbound wait times, exact arrival predictions,
guaranteed savings, SMS, precise location history, immigration or travel
document data, or access to otherwise public CBP numbers.

## Pricing hypothesis

The first test is one simple founding price: **$5 per month**, cancel anytime.
This is a hypothesis for a private beta, not a final approved price. Do not
create a live Stripe Price until the owner confirms the price, account,
support route, refund policy, tax handling, and legal identity.

Do not add annual plans, coupons, trials, or a business/API plan in the first
implementation. They create billing and support states before the core paid
workflow is proven.

## Minimal data contract

Supabase is the proposed system of record for user and product state. Stripe is
the source of truth for money and subscription status. The browser must never
be the source of truth for access.

### `profiles`

- `id` equals the Supabase Auth user ID;
- `email`, `language`, `timezone`;
- `created_at`, `updated_at`.

### `saved_crossings`

- `id`, `user_id`;
- canonical `port_number` and display name;
- `direction`, initially only `northbound`;
- `lane_type`, initially a supported CBP lane value;
- `created_at`, `updated_at`.

### `alert_rules`

- `id`, `user_id`, `saved_crossing_id`;
- `threshold_minutes`;
- `days_of_week` and local `window_start` / `window_end`;
- IANA `timezone`;
- `enabled`, `last_evaluated_at`;
- `created_at`, `updated_at`.

### `alert_deliveries`

- `id`, `rule_id`, `user_id`;
- source `snapshot_at` and evaluation timestamp;
- `status` such as `queued`, `sent`, `suppressed`, `failed`;
- `suppression_reason` when no email is sent;
- provider message ID when delivered;
- `created_at`.

### `entitlements`

- `user_id`;
- Stripe customer ID and subscription ID;
- internal plan key, initially `plus_monthly`;
- subscription status and `current_period_end`;
- `source_event_id`, `updated_at`.

### `stripe_events`

- Stripe event ID, event type, received timestamp;
- processing status, processed timestamp, and a safe error summary;
- a payload hash or provider reference, not unnecessary card data.

The database must enforce ownership with row-level security. Users can read
and change only their own profile, saved crossings, rules, deliveries, and
entitlement view. Server routes use a narrowly scoped service role only where
RLS cannot perform the operation; that key never reaches the browser.

## Runtime invariants

1. Stripe webhooks, not a checkout redirect, activate or revoke an
   entitlement.
2. Webhooks are signature-verified, idempotent, and safe to retry or receive
   out of order.
3. Unknown, failed, refunded, disputed, or expired billing states fail closed
   for paid features while the free dashboard remains available.
4. Alert evaluation requires a valid northbound CBP snapshot inside the paid
   freshness policy. Stale, missing, malformed, or ambiguous data suppresses
   delivery and records why.
5. Email is opt-in and every message identifies the crossing, lane, observed
   wait, source timestamp, and limitation that it is not a guarantee.
6. Alert evaluation is server-side and scheduled. There is no client timer
   pretending to be a notification system.
7. Every user-facing paid action has an English and Spanish state, including
   loading, denied, failed, cancellation, and no-data states.
8. Account deletion removes or anonymizes retained user data according to the
   published policy and does not attempt to delete Stripe's legally required
   transaction record.

## Smallest Vercel surface

The paid layer should begin with these server routes and no general API:

- `POST /api/billing/checkout` creates a Checkout Session from an allowlisted
  server-side Price ID;
- `POST /api/stripe/webhook` verifies and records Stripe events;
- `POST /api/billing/portal` creates a Customer Portal session for an entitled
  user;
- `GET /api/me/entitlement` returns the server-derived paid state;
- CRUD routes for saved crossings and alert rules;
- a read-only alert-delivery history route;
- one protected scheduled evaluator that writes delivery records and sends
  email through the selected transactional provider.

The free dashboard continues to read the static CBP artifacts and does not
depend on account infrastructure. If Supabase, Stripe, or email is down, the
free experience must still render and clearly keep paid actions unavailable.

## Go/no-go gates before implementation leaves test mode

- [ ] Owner approves the Plus promise and founding price.
- [ ] Correct BorderPulse Stripe account and legal/support identity confirmed.
- [ ] Refund, cancellation, tax, privacy, retention, and deletion language
      reviewed for the jurisdictions served.
- [ ] Supabase project, backups, export, RLS, and deletion test are verified.
- [ ] Test-mode Checkout, webhook replay, entitlement changes, cancellation,
      failed payment, refund, and dispute behavior pass.
- [ ] Email delivery, provider failure, opt-out, and suppression behavior pass.
- [ ] Preview has no production credentials or live Price IDs.
- [ ] The free dashboard remains anonymous and passes the existing route,
      accessibility, freshness, and browser checks.
- [ ] A small private beta demonstrates a real paid workflow before public
      launch.

## Owner decisions still required

The agent can implement and test the mechanics after the draft is accepted.
Only the owner should make these external decisions:

- final plan name and price;
- Stripe account, business identity, statement descriptor, and support email;
- refund and cancellation policy;
- jurisdictions and tax treatment;
- selected email provider and monthly spend ceiling;
- private-beta participants and public-launch approval.
