# BorderPulse business viability brief

Status: working recommendation, 2026-09-22

## Executive decision

BorderPulse should not be treated as a broad consumer SaaS yet. The existing
asset is better understood as a trustworthy border-decision utility with three
possible businesses around it:

1. a free public product that earns repeat use and search distribution;
2. a small business offer built around embeddable, bilingual border data and
   decision surfaces;
3. a later consumer alert subscription if repeated user demand proves it.

The recommended next business test is #2. It can be sold manually with the
current code, without accounts, Supabase, Stripe subscriptions, SMS, or a
production Vercel migration. The existing Plus implementation remains useful
as an option if consumer alerts win the discovery test.

This is a hypothesis, not evidence of demand or a pricing decision.

## What already exists

BorderPulse currently has a meaningful product foundation:

- official CBP northbound wait-time ingestion, normalized into a stable
  crossing model;
- a scheduled GitHub Actions refresh and explicit snapshot history;
- live dashboard, crossing detail, comparison, best-time, walking/driving,
  bilingual blog, and share surfaces;
- 42 crossing records, 30-day aggregates, and 36 bilingual blog posts in the
  current repository artifact;
- an iframe widget with theme, language, direction, and crossing controls;
- public static data files that power the site and widget;
- anonymous Umami page analytics plus decision events for crossing opens,
  best-time opens, favorites, shares, embeds, and ad consent;
- a preserved paid branch covering saved crossings, email alert rules,
  entitlement state, Stripe mechanics, Supabase migrations, and operator
  checks.

This is enough to validate a business. It is not yet enough to promise a paid
service: the public deployment is currently stale, the live traffic and event
readback have not been reconciled, and no buyer commitment has been recorded.

## The best initial customer hypothesis

The first buyer is more likely to be a business that repeatedly serves people
crossing the border than a casual traveler:

- shuttle, parking, tour, and transportation operators;
- employers with cross-border workers;
- hotels, clinics, retailers, and visitor-information businesses near ports;
- local media or community sites that want a useful live border module;
- small logistics or dispatch teams that need a shared view of a few ports.

Their possible job is not “buy a dashboard.” It is:

> Keep customers, staff, or dispatchers informed about the crossings that
> affect them, without someone manually checking and rewriting the information.

The first paid offer should therefore sell presentation, maintenance,
customization, and support around public data. It should not imply exclusive
ownership of CBP data or promise predictive accuracy that the product does not
have.

## Recommended offer to test

### BorderPulse business widget

A manually onboarded, bilingual live widget for a selected set of crossings,
with a branded link or embed and a simple contact/support relationship.

The first version can use what already exists:

- selected crossing and lane views;
- current wait, freshness, and source attribution;
- best-time and comparison links;
- English/Spanish presentation;
- a small embed or link that the customer can place on its site or internal
  page.

Initially, fulfillment can be manual. The business is paying for a maintained,
useful decision surface, not for an elaborate self-serve platform. If several
buyers ask for the same configuration, then add an authenticated admin or
server-backed feed.

Test price bands rather than announce a final price: roughly $25, $75, and
$150 per month depending on the number of crossings, branding, and support.
These are interview prompts, not approved prices or forecasts.

### Consumer alerts as a second test

The preserved Plus branch is a reasonable consumer experiment after demand
evidence. Existing market examples show low-cost consumer pricing: Cruzar
advertises a $2.99 monthly Pro plan, while Garitas advertises a $9.99 annual
Pro purchase. That validates the shape of the offer, but it also shows that
BorderPulse would need a sharper reason to choose it than “live waits plus
alerts.”

For discovery, test a concrete job such as “tell me when my usual crossing is
below my threshold” against “help me choose the best time.” Do not build both
jobs at once. A consumer price test can use a modest monthly range around
$3–$5 or an annual range around $10–$20, but no price should be implemented
until users make a real commitment.

## Why this order is safer

The current static architecture is unusually cheap to operate and already
supports public distribution. A consumer subscription would add account
support, email delivery, billing reconciliation, privacy requests, failed
payments, and alert reliability before we know whether people return often
enough to pay.

A manually sold widget or business pilot tests willingness to pay first. It
also turns the existing embed, source attribution, bilingual UX, and data
pipeline into a product without requiring a new platform. The downside is a
smaller initial market and more direct selling, which is acceptable for proving
the business.

## Evidence required before building more

Track these separately:

### Product evidence

- current live snapshot freshness and successful publication;
- qualified decision sessions: a live crossing view followed by a best-time,
  comparison, share, or embed action;
- 7-day returning decision users;
- which regions, crossings, directions, and languages are actually used;
- at least one clear repeated job from real conversations.

### Commercial evidence

- 10 qualified traveler conversations;
- 5 explicit opt-ins for the same paid job;
- 3 private-beta or business-pilot commitments;
- at least one payment commitment, paid pilot, deposit, or signed equivalent;
- price reactions recorded against a concrete outcome rather than a feature
  list.

### Operating evidence

- actual hosting, domain, analytics, email, payment, and automation invoices;
- minutes per week spent on feed failures, content, support, and dependency
  maintenance;
- cost per active paid customer, including payment and email usage;
- a recovery procedure when the source or deployment fails.

The current Umami instrumentation is a good base, but it is not a traffic or
revenue report. Do not infer users, retention, or demand until the dashboard
readback is obtained.

## Cost model

Keep infrastructure cost separate from value-based pricing. The practical
floor is:

`monthly break-even = fixed monthly cost / paying customers + variable cost per customer + maintenance reserve`

Maintenance is likely to dominate hosting at small scale. Include feed
failures, dependency updates, content review, privacy requests, support, and
billing reconciliation in the reserve. The current Vercel project has no
environment variables or attached BorderPulse custom domain, and the public
site is still on GitHub Pages, so a BorderPulse-specific cloud total has not
been established. Map invoices before using any cloud number in a price.

Illustrative only:

- 5 business customers at $75/month is $375 monthly revenue before costs;
- 50 consumer customers at $5/month is $250 monthly revenue before costs.

Neither is a forecast. The comparison shows why a handful of higher-value
business customers may be easier to support than a large low-price consumer
base.

## 30-day execution sequence

1. Repair the public data deployment and verify the live JSON is current.
2. Keep the paid PR preserved. Do not create provider accounts or enable live
   billing yet.
3. Read the Umami dashboard and record the actual decision funnel.
4. Speak with 10 frequent travelers and 5 businesses in the categories above.
5. Show one concrete widget or alert mockup, then ask for an opt-in and price
   commitment.
6. Offer one manual pilot. Use a simple invoice or payment link only after a
   buyer agrees; do not build subscription machinery around an unvalidated
   offer.
7. Choose one path:
   - consumer alert beta, then resume the preserved Plus stack;
   - business widget/data pilot, then add only the server capability buyers
     repeatedly require;
   - free utility, if the repeated pain and payment evidence do not appear.

## Deliberately out of scope for now

- Firebase or a broad Google Cloud migration;
- a native mobile app;
- southbound Google Maps estimates as a paid promise;
- a prediction engine before historical accuracy is measured;
- a general public API with uptime or rate-limit commitments;
- a large SEO expansion before the current landing pages and data trust are
  healthy;
- targeted behavioral advertising;
- Stripe, Supabase, Resend, or Vercel production cutover before the paid job
  and buyer are chosen.

## Bottom line

BorderPulse is viable as a focused border-intelligence business if it is
treated as a distribution and decision asset first, and as a SaaS platform
only after someone pays for a repeated outcome. The next milestone is not a
finished billing system. It is one reliable public product, one clearly
repeated job, and one real payment commitment.
