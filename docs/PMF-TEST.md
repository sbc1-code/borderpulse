# BorderPulse PMF test

BorderPulse has a useful free product and a technically credible paid-beta
branch. That is not evidence that a subscription is wanted. Keep the paid
branch preserved, but do not create provider accounts, invite customers, or
promote the paid workflow until this test produces stronger demand evidence.

## Decision to answer

Who has a recurring border-crossing problem, which outcome matters enough to
pay for, and what price feels reasonable for that outcome?

The test should compare jobs, not merely feature names:

- **Timely alerts:** “Tell me when my usual crossing is unusually bad.”
- **Planning history:** “Help me choose a crossing and time from trustworthy
  recent patterns.”
- **Trip decision support:** “Help me leave at the right time for an arrival
  target.”

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

## Small discovery round

Over roughly two weeks, reach 10 real or highly relevant border travelers and
ask about their last crossing decision. For each person, record:

- crossing pair, direction, frequency, and consequence of a bad wait;
- what they use today and what is missing;
- which of the three jobs above they would use repeatedly;
- whether they would try it, join a beta, pay once for a pilot, or pay monthly;
- the price reaction to a concrete outcome, tested around a modest range such
  as $5–$10/month rather than presented as a final price.

Ask for behavior and commitment, not compliments. “That sounds useful” is
interest; an opt-in, scheduled pilot, or payment is stronger evidence.

## Promotion gate

Resume paid implementation only if the evidence supports it. A practical
minimum is:

- 10 qualified conversations;
- 5 explicit opt-ins for the same paid job;
- 3 people willing to use a private beta;
- at least 1 paid pilot or equivalent concrete payment commitment.

If the evidence points to a different job, rewrite the paid contract before
writing more billing or account code. If there is no repeated pain, keep
BorderPulse free and useful rather than manufacturing a subscription.

## Later

If the gate passes, resume the preserved sequence: choose the paid job and
price, create isolated test providers, run authenticated end-to-end QA, then
make a separate production decision. The existing paid branch is an option,
not a commitment to its current feature boundary or price.
