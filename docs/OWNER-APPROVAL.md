# BorderPulse paid-stack reactivation gate

Status: **parked as of 2026-09-22.** This replaces the prior owner-approval
page that proposed a $5/month BorderPulse Plus test. No price, plan name,
provider account, or customer invitation is approved or requested now.

## Why it is parked

The free product has value, but the competitive check found generic widgets,
public data, and consumer alerts already served by established products. The
current evidence does not identify a differentiated paid job or a buyer willing
to pay for one. The present work is free-product reliability and discovery,
described in `BUSINESS-VIABILITY.md`, `PMF-TEST.md`, and
`SAN-YSIDRO-WORKFLOW-DISCOVERY.md`.

The preserved implementation is a technical option, not a product decision:

- accounts, saved northbound crossings, and bounded email-alert rules;
- server-derived entitlement checks, webhook ordering, and delivery
  suppression; and
- a protected Vercel preview with no paid-provider configuration.

It must not be presented as an offer, a price promise, or evidence of demand.

## Business evidence gate

First test one business segment and one corridor for a downstream customer or
staff workflow. Offer one manual, written pilot only after all of these are
recorded:

1. five qualified conversations in that segment;
2. three independent descriptions of the same job that free alternatives do
   not solve;
3. one written, time-bounded paid-pilot commitment; and
4. an owner-approved scope, support burden, and price for that specific job.

That manual business pilot does **not** activate the preserved consumer-alert
stack. If several business pilots repeat the same support pattern, write a
new, business-specific technical contract before adding product automation.

## Consumer paid-stack gate

Reopen the preserved account/alert code only if the evidence instead identifies
a recurring consumer alert job. Meet the separate gate in `PMF-TEST.md`: ten
qualified frequent-traveler conversations, five explicit opt-ins for one job,
three private-beta commitments, and one payment commitment. Rewrite
`PAID-BETA-CONTRACT.md` for that chosen job before connecting providers.

## Only after the evidence gate

The owner must make a new, explicit decision for the chosen offer:

- product name, promise, price, participant boundary, and support route;
- legal entity, jurisdictions, tax treatment, refund/cancellation terms, and
  privacy/retention language;
- whether a dedicated Supabase project, separate Stripe **test** Product/Price,
  and transactional-email sender are justified; and
- a monthly service-cost ceiling and an authenticated preview QA plan.

That later approval cannot be inferred from this document. It must remain
test-only until every relevant gate in `LAUNCH-GATES.md` has literal evidence.
