# BorderPulse business viability brief

Status: revised recommendation after competitive check, 2026-09-22

## Executive decision

BorderPulse should not be treated as a broad consumer SaaS or generic paid
widget. The existing asset is a useful free border-decision utility with three
possible paths around it:

1. a free public product that earns repeat use and search distribution;
2. a narrowly scoped paid implementation only if a business has a workflow
   more valuable than a generic wait-time display;
3. a later consumer alert subscription if repeated user demand proves it.

The recommended next step is not to sell #2 yet. First learn whether any
border-serving business has a repeated job that existing free widgets do not
solve. The existing Plus implementation remains useful only if a separate
consumer-alert discovery test wins.

This is a hypothesis, not evidence of demand, differentiation, or a pricing
decision.

## Competitive correction

The original business-widget recommendation is too weak as a standalone paid
offer. Current competitors already make the commodity available:

- [Bordify's widget](https://bordify.com/en/widget-manager) is free,
  responsive, configurable by city, theme, and language, and states a
  15-minute refresh. It requires Bordify credit and says the content cannot be
  modified.
- [Cruzar's data page](https://cruzar.app/data) markets a white-label module or
  raw API. Its [open-data page](https://cruzar.app/open) describes free
  CBP-derived data and 30-day patterns.
- [Garitas](https://garitas.app/?locale=en) keeps live waits, maps, hourly
  statistics, and Home Screen widgets free, while its Pro tier covers alerts
  and Apple Watch/Lock Screen features. [Bordify's App Store listing](https://apps.apple.com/us/app/bordify-border-wait-times/id1006266261)
  describes alerts, historical analysis, community reports, cameras, and
  southbound coverage, with 1.9K ratings shown when checked.

This does not prove there is no business. It does mean BorderPulse cannot
honestly sell a bilingual live widget, public source data, or basic alerts as a
newly differentiated product. The source data is public and the generic
consumer experience is well served.

## What already exists

BorderPulse currently has a meaningful product foundation:

- official CBP northbound wait-time ingestion, normalized into a stable
  crossing model;
- a repaired GitHub Pages static fallback and explicit snapshot history;
- a tested Vercel preview function that normalizes official CBP data and caches
  a healthy payload at the CDN for five minutes, without a database or paid
  provider;
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

This is enough to validate a narrow business hypothesis. It is not enough to
promise a paid service: the Pages fallback is current but scheduled publication
has observed multi-hour gaps, Vercel preview access remains protected, live
traffic/event readback has not been reconciled, and no buyer commitment exists.

## The best initial customer hypothesis

The only buyer worth testing is a business that has a repeated action after
someone checks a border condition, not one that merely wants to display it:

- shuttle, parking, tour, and transportation operators;
- employers with cross-border workers;
- hotels, clinics, retailers, and visitor-information businesses near ports;
- local media or community sites that need a local decision page tied to their
  own audience or service;
- small dispatch teams only if they identify a workflow gap beyond a shared
  view of public data.

Their possible job is not “buy a dashboard” or “add a widget.” It is:

> Give a traveler, customer, or staff member one trustworthy next step that
> reflects the crossing condition and our actual service or operating policy.

Examples worth interviewing, not promises to build: a clinic arrival page that
connects a crossing condition to appointment/transport instructions; a parking
or shuttle page that answers when to leave and how to arrive; or an internal
dispatch note that maps a port condition to an existing escalation. It should
never imply exclusive ownership of CBP data, predictive accuracy, or an
automated decision that is not actually delivered.

## Recommended offer to test

### Conditional implementation pilot, not a widget subscription

A manually onboarded, corridor-specific decision page or internal briefing
that combines the customer's existing instructions with selected official
crossing data. It is only testable after a buyer names the workflow and agrees
that free alternatives do not solve it.

The first version can use what already exists:

- selected crossing and lane views with explicit source and freshness;
- current wait, freshness, and source attribution;
- best-time and comparison links;
- English/Spanish presentation;
- a small link or embed placed inside the buyer's existing page or internal
  process, not sold as a standalone commodity.

Initially, fulfillment must be manual, written, and time-bounded. The buyer is
paying, if at all, for a maintained decision surface in their workflow, not for
raw CBP data. If several buyers independently request the same configuration
and support pattern, then evaluate one small server-backed capability.

Do not publish price bands yet. First learn the avoided manual work,
missed-arrival risk, and required support. A paid pilot can have a single,
written scope and one-time or 30-day price only after the buyer commits. Price
must be for maintained implementation and support, not public data.

### Consumer alerts as a second test

The preserved Plus branch remains a possible consumer experiment only after
demand evidence. Competitors already offer alerts and richer companion
experiences, so BorderPulse needs an evidenced reason to choose it that is
sharper than “live waits plus alerts.”

For discovery, test a concrete job such as “tell me when my usual crossing is
below my threshold” against “help me choose the best time.” Do not build both
jobs at once. Do not set a consumer price until users make a real commitment
and the operating cost of reliable delivery is known.

## Why this order is safer

The current static architecture is unusually cheap to operate and already
supports public distribution. A consumer subscription would add account
support, email delivery, billing reconciliation, privacy requests, failed
payments, and alert reliability before we know whether people return often
enough to pay.

A generic manual widget does not test willingness to pay because it is already
freely available elsewhere. A narrow workflow pilot is still the least-cost
test, but it must demonstrate a benefit beyond displaying public data. If five
conversations do not reveal that benefit, keep BorderPulse free and stop
commercial feature work.

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

- five conversations with one business segment in one corridor;
- three independently describe the same downstream workflow, not simply a
  desire for live public data;
- one says its free alternative is insufficient and accepts a written paid
  pilot scope;
- at least one payment commitment, paid pilot, deposit, or signed equivalent;
- price reaction recorded against the buyer outcome and support burden, not a
  feature list.

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

1. Keep the useful free product reliable. Pages remains the fallback; check the
   protected Vercel route in a browser before any separate domain decision.
2. Keep the paid PR preserved. Do not create providers or enable billing.
3. Obtain an authorized Umami readback and record the actual decision funnel.
4. Speak with five businesses in one corridor about their downstream
   customer/staff workflow, existing free alternatives, and support needs.
5. Offer exactly one manual paid pilot only if the differentiated job repeats
   and a buyer commits. Use an invoice or payment link only after that.
6. If that evidence does not appear, keep BorderPulse free and stop commercial
   development. If consumer demand appears instead, rewrite the Plus contract
   before resuming it.

## Deliberately out of scope for now

- Firebase or a broad Google Cloud migration;
- a native mobile app;
- southbound Google Maps estimates as a paid promise;
- a prediction engine before historical accuracy is measured;
- a generic paid widget, white-label API, or raw-data reseller promise;
- a general public API with uptime or rate-limit commitments;
- a large SEO expansion before the current landing pages and data trust are
  healthy;
- targeted behavioral advertising;
- Stripe, Supabase, Resend, or Vercel production cutover before the paid job
  and buyer are chosen.

## Bottom line

BorderPulse is viable today as a free useful product and a durable proof asset.
A paid business is not justified by the current feature set because its generic
paid directions are already commoditized by more mature competitors. The next
milestone is not a fully fleshed SaaS launch. It is one reliable public product,
one differentiated workflow repeated in real buyer conversations, and one real
payment commitment. Until then, protect time and cloud spend.
