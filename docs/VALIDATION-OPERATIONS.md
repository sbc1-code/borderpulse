# BorderPulse validation operations

Status: discovery operating record, 2026-09-22

This is the single working record for deciding whether BorderPulse stays a
free utility, earns one manual business pilot, or later justifies a separate
consumer product. It does not authorize outreach, pricing, provider setup,
Stripe, a production cutover, or customer data collection.

The strategy and evidence thresholds remain in
`BUSINESS-VIABILITY.md`, `PMF-TEST.md`, `MEASUREMENT-PLAN.md`, and
`SAN-YSIDRO-WORKFLOW-DISCOVERY.md`. This file makes those decisions easy to
operate without inventing a dashboard, CRM, or paid stack.

## Current decision

**Keep the free product useful; do not sell a paid product yet.**

The current facts are:

- the Pages fallback has a recent official-data readback, but observed natural
  publication gaps were longer than the desired cadence;
- the Vercel data path is a protected preview and needs an authorized runtime
  readback before any domain decision;
- the repository has anonymous product events, but no verified Umami report;
- no qualifying buyer conversations, repeated workflow, commitment, or
  BorderPulse-specific cost record exists; and
- the preserved accounts, alerts, Supabase, Stripe, and email code is a
  fail-closed technical option, not an offer.

## Smallest stack by stage

| Stage | What runs | What is deliberately absent |
| --- | --- | --- |
| Free utility now | GitHub Pages fallback, official-data publication, existing anonymous analytics, and protected Vercel preview | Accounts, database, payment, outbound email, customer SLA |
| One manual business pilot, only after the gate | Existing source-attributed page or embed plus buyer-owned instructions and a written scope | Generic SaaS dashboard, public API, user login, automated alerts, subscription machinery |
| Repeated paid workflow, only after evidence | Choose the smallest server-backed capability for the repeated job | A broad Firebase or Google Cloud migration unless the actual job proves it necessary |
| Consumer alert product, separate future choice | Vercel functions, a dedicated Supabase project, Stripe test mode, and chosen email provider after the consumer gate | Live credentials, public checkout, or paid claims before end-to-end test and owner approval |

Vercel is the better next hosting/computation candidate because it already
builds the app and has a verified preview function. Firebase would add another
platform without solving the present question, which is whether anyone needs a
workflow beyond freely available border data. Supabase and Stripe are only
useful if a proven paid job needs accounts and recurring billing.

## 15-minute weekly review

Keep one row per review. Use links to public run receipts or source files, not
credentials, invoice screenshots, customer details, or raw interview notes.

| Week ending | Public snapshot and freshness | Last 3 natural publication cycles | Vercel preview readback | 7-day QDA / event mix | Maintenance minutes | Decision and evidence link |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-09-22 | Pages readback recorded in `tasks/ACTIVE.md`; do not infer a promised cadence | Gaps observed from 2h48 to 5h27 | Protected preview only; authorization required | Unknown until authorized Umami readback | Not yet logged | Keep free. Verify reliability and real usage first. |

`QDA` means a qualified decision action as defined in
`MEASUREMENT-PLAN.md`. Until an authenticated Umami dashboard readback exists,
write `unknown`, not a guessed traffic or retention number.

## Five-conversation evidence ledger

Use only after outreach is separately authorized. Assign a neutral account
code, such as `SY-01`, rather than recording names, contacts, booking details,
or passenger information in this repository.

| Code | Date | Segment and corridor | Named decision after a condition changes | Frequency and consequence | Current workaround and free alternative | Why it is insufficient | Candidate repeated job | Pilot or payment evidence | Qualifies? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SY-01 |  |  |  |  |  |  |  |  |  |
| SY-02 |  |  |  |  |  |  |  |  |  |
| SY-03 |  |  |  |  |  |  |  |  |  |
| SY-04 |  |  |  |  |  |  |  |  |  |
| SY-05 |  |  |  |  |  |  |  |  |  |

A conversation qualifies only when the business describes an actual recurring
decision, names why its current free/internal workaround falls short, and does
not require BorderPulse to use sensitive traveler, medical, payment, or travel
document data. A compliment, request for a generic widget, or a request for a
FastLane/medical-pass-related service is useful negative evidence, not a lead.

## Evidence gate and next state

| Evidence observed | Decision | Permitted next work |
| --- | --- | --- |
| Fewer than five qualified conversations, or no shared job | Keep BorderPulse free | Improve trust or learn from the next authorized interview. Do not create paid infrastructure. |
| Five conversations and three independent accounts name the same downstream job, but no commitment | Refine the manual pilot hypothesis | Write a one-page, buyer-specific draft scope only. Do not quote a standing public price or automate it. |
| Same repeated job plus one written, time-bounded paid-pilot commitment | Consider one manual pilot | Obtain a separate owner decision on scope, support, price, payment method, source/fallback language, and success observation. |
| Several paid pilots need the same login, delivery, or billing behavior | Reassess productization | Write a business-specific technical contract and select only the providers that repeated work requires. |
| Consumer evidence independently clears its stricter gate | Reassess the preserved Plus branch | Rewrite its contract, then use test-only providers and authenticated QA before any launch decision. |

No table row authorizes a public offer or an external action by itself. The
literal requirements for a paid launch remain in `LAUNCH-GATES.md`.

## Cost and owner-effort record

Record actual monthly amounts and minutes only after the owner has a bill,
usage report, or work receipt. Do not turn an old aggregate cloud charge into a
BorderPulse price without separating the product's share.

| Period | Fixed product costs | Variable pilot/customer costs | Payment fees | Maintenance minutes by type | Support minutes | Source of record |
| --- | --- | --- | --- | --- | --- | --- |
| Baseline | Unknown: no BorderPulse-specific invoice map yet | None | None | Record data/deploy failures separately | None | Owner provider invoice or usage export |

Use the result as a floor, not a price promise:

`monthly floor = fixed costs / expected paying customers + variable cost per customer + maintenance reserve`

The buyer's avoided uncertainty or manual work still determines whether a
fair price exists. If a manual pilot is valuable but cannot cover the measured
support burden, that is a reason to keep it free or decline the work, not a
reason to hide the cost in a subscription.

## Definition of a viable next milestone

BorderPulse becomes a plausible small business only when all of these are
literal evidence, not projections:

1. The free data path is trustworthy enough to show condition and freshness.
2. Five conversations reveal three independent instances of the same
   buyer-owned downstream job.
3. One buyer makes a written paid commitment to a bounded manual pilot.
4. The pilot can be served with public attributed data, clear fallback copy,
   and an owner-manageable support burden.
5. Actual cost and maintenance records show whether the work is sustainable.

Until then, the valuable outcome is a reliable, bilingual free decision tool
and credible proof of the work, not a prematurely complex SaaS business.
