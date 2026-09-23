# BorderPulse commercial-discovery test

BorderPulse has a useful free product and a technically credible paid-beta
branch. That is not evidence that a subscription is wanted. Keep the paid
branch preserved, but do not create provider accounts, invite customers, or
promote the paid workflow until this test produces stronger demand evidence.

## Decision to answer

Which buyer has a repeated border-crossing job that free alternatives do not
solve, which outcome matters enough to pay for, and what support burden would
make a paid offer fair?

The test should compare jobs, not merely feature names. The first path is a
business workflow; consumer alerts are a later, separate path:

- **Business workflow:** “Give my customer, driver, or staff member a useful
  next step when a named corridor condition changes.”
- **Consumer timely alert:** “Tell me when my usual crossing is unusually
  bad.”
- **Consumer planning:** “Help me choose a crossing and time from trustworthy
  recent patterns.”

Do not assume that saved crossings, email, SMS, southbound coverage, or a
generic “Plus” tier is the winning job.

## Now

1. Restore and verify the free public data publication path. A successful CBP
   fetch is not enough; `borderpulse.com/data/crossings.json` must be fresh.
2. Preserve PR #87 and its paid implementation as a later option. Do not merge
   it, create Stripe/Supabase/Resend resources, or make a production billing
   promise during the discovery phase.
3. Use the free product to observe the existing decision funnel: dashboard
   visit, crossing detail, best-time view, comparison, return visit, and any
   alert/early-access interest. Treat page views as usage evidence, not payment
   evidence.

## First discovery round: one business segment, one corridor

Use the five-account San Ysidro cohort in
`SAN-YSIDRO-WORKFLOW-DISCOVERY.md`. Do not pitch BorderPulse or quote a price.
Ask each business about a recent operational or customer-facing crossing
decision. Record:

- corridor, affected customer/staff action, frequency, and consequence of a
  bad wait;
- what they use today, including free data/widgets, and what remains manual;
- the exact downstream job and an existing instruction or escalation they use;
- whether a narrowly scoped pilot would reduce a real support or operational
  burden; and
- a written commitment only after the same workflow independently repeats.

Ask for behavior and commitment, not compliments. “That sounds useful” is
interest; a written pilot scope or payment commitment is stronger evidence. Do
not test price ranges until a buyer has named the outcome and support burden.

## Separate consumer-alert path

Only use this path if user evidence, rather than the business cohort, points to
one recurring consumer job. Over roughly two weeks, interview 10 qualified
frequent travelers. Require five explicit opt-ins for the same job, three
private-beta commitments, and one payment commitment before choosing any price
or reopening the preserved alert/account implementation.

## Cost and maintenance model

Operating cost and customer value answer different questions. Use the real
provider readbacks when they exist, but do not turn an infrastructure estimate
into a price promise.

Track these separately:

- fixed monthly costs: hosting, domain, monitoring, and any paid workspace;
- usage costs: database reads/writes, email sends, bandwidth, scheduled jobs,
  and payment processing;
- owner maintenance: feed failures, dependency updates, provider changes,
  support, privacy requests, and billing reconciliation;
- safety reserve: refunds, failed sends, unexpected traffic, and tax/accounting
  overhead.

A simple floor is:

`monthly price floor = (fixed costs / expected paying users) + variable cost per user + maintenance reserve`

That is a break-even floor, not the right price. The right price still depends
on the value of the avoided delay, avoided uncertainty, or better trip decision.
At present the BorderPulse Vercel project has no environment variables and no
custom domain, and no paid provider has been connected, so the actual monthly
BorderPulse cost is not yet established. Record invoices and usage before
resuming the paid build.

## Promotion gate

Offer one manual business pilot only if all of the following are true:

- five qualified conversations in one segment/corridor;
- three independent accounts identify the same downstream job beyond displaying
  public data; and
- one accepts a written, time-bounded paid-pilot scope.

If consumer evidence wins instead, meet the consumer gate above and rewrite the
paid contract before writing more billing or account code. If there is no
repeated pain, keep BorderPulse free and useful rather than manufacturing a
subscription.

## Later

If the business gate passes, fulfill one manual pilot first. Do not connect a
provider or reuse the consumer-alert stack unless several business pilots
repeat the same support pattern and a business-specific contract is approved.

If the consumer gate passes, rewrite the paid contract, choose the paid job and
price, create isolated test providers, run authenticated end-to-end QA, then
make a separate production decision. The existing paid branch is an option,
not a commitment to its current feature boundary or price.
