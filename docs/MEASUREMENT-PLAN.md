# BorderPulse measurement plan

Status: discovery and free-product reliability phase, 2026-09-22

This plan answers one question: is BorderPulse producing repeat border-crossing
decisions that can become a sustainable business? It does not treat page views,
code shipped, or a payment integration as proof of product-market fit.

## Decisions this plan supports

1. Is the free product reliably available and trusted enough to measure?
2. Which crossing jobs create repeat value: live check, best-time planning,
   comparison, sharing, or embedding?
3. Is the first paid buyer a recurring traveler or a business serving border
   travelers?
4. Should we test a manual business workflow pilot, resume consumer alerts, or
   keep the product free?

## North-star metric

**Weekly qualified decision actions (QDA)**

A QDA is evidence that a visitor moved beyond a passive page view to use the
product in a crossing decision. Count one of these actions:

- opening a crossing detail after using the dashboard;
- opening a best-time page from a crossing card;
- opening a comparison or walk-or-drive decision page;
- sharing a crossing status;
- saving a favorite crossing locally;
- copying an embed snippet.

The current cookieless analytics installation can observe events and page
views, not a durable individual identity. Until an anonymous-session report is
verified in Umami, report total qualified actions and event mix rather than
claiming unique decision-makers or retention.

## Scorecard

Use the same seven-day period for every number. Start with a baseline, then
add a target only after two clean weeks of readback.

| Health area | Metric | Why it matters | Current evidence |
| --- | --- | --- | --- |
| Trust | Public snapshot age and fresh/stale state | A stale data product cannot earn repeat use or support a workflow. | Re-read with `npm run operator:status` before each review. |
| Reliability | Successful scheduled fetch-to-publication cycles | Separates source collection from customer-visible delivery. | Pages fallback is recovered, but observed schedule gaps remain; the Vercel data function is verified only in its protected preview. |
| Acquisition | Visitors and landing-page/channel mix | Shows whether the free distribution surface reaches relevant people. | Requires Umami dashboard readback. |
| Activation | QDA divided by dashboard-page views | Indicates whether visitors find a crossing decision useful. | Events exist; no readback yet. |
| Engagement | QDA mix by crossing, region, language, and action | Identifies the repeated job worth improving. | Events partly capture region/crossing; no readback yet. |
| Distribution | Embed copies and share actions | Tests whether organizations and travelers distribute the utility. | Events exist; no readback yet. |
| Commercial | Qualified conversations, opt-ins, pilots, and payment commitments | Tests willingness to pay rather than interest in features. | No commitment evidence yet. |
| Operations | Minutes/week maintaining data, support, and delivery | Ensures a small paid product does not create an uneconomic support burden. | Collect from actual work and invoices. |

## Event inventory

These events already exist in the public code and should be visible in Umami
once a dashboard owner reads them:

| Event | Decision signal |
| --- | --- |
| `crossing-open` | Visitor chose a specific crossing after browsing the dashboard. |
| `best-time-open` | Visitor is planning instead of only checking the current wait. |
| `favorite-toggle` | Possible repeat-use intent. |
| `share-status` | A crossing result was shared. |
| `embed-copy` | Possible business/site-distribution interest. |
| `region-filter`, `borderline-select`, `show-all-crossings` | Dashboard usability and regional interest diagnostics. |
| `ad-consent` | Advertising tolerance, not product value or revenue. |

Do not add speculative conversion events yet. Add these only when their
corresponding surface exists and can deliver on the promise:

- `business-offer-view` and `business-pilot-contact-start` for a real widget
  offer with a working support/contact route;
- `plus-offer-view`, `checkout-start`, and `checkout-complete` only after the
  consumer beta, provider setup, and legal/billing gates are approved;
- `alert-delivered` and `alert-opened` only after reliable delivery exists.

## Reliability gate before interpreting product data

The free product must clear all of these before traffic or event data informs a
commercial decision:

- `borderpulse.com/data/crossings.json` reads a current CBP snapshot;
- three consecutive natural scheduled cycles produce a successful fetch, a
  successful Pages deploy, and a matching live snapshot;
- stale/unknown data visibly reports its condition instead of calling itself
  live;
- a written recovery path exists for source, build, and deployment failure.

The Pages repair has been promoted. The remaining reliability question is
observed schedule cadence and authorized browser readback of the protected
Vercel candidate, not whether the static artifact exists.

## Commercial gates

### Business workflow pilot

Proceed from discovery to one manual pilot only when all are true:

- five conversations with businesses that serve a specific port or commuting
  corridor;
- at least three explicitly identify the same repeated information job;
- one agrees to a defined pilot, price band, and support expectation;
- the offer does not claim exclusive data ownership, predictive accuracy, or
  coverage that the product does not provide;
- actual invoice/payment, support, and data-availability processes are ready
  for that one buyer.

### Consumer alert beta

Resume the preserved Plus implementation only when all are true:

- ten qualified frequent-traveler conversations;
- five explicit opt-ins for one matching alert or planning job;
- three private-beta commitments and at least one payment commitment;
- the free reliability gate is passing;
- the provider, privacy, support, billing, and authenticated-QA gates in
  `docs/LAUNCH-GATES.md` are satisfied.

## Weekly review

Run a 15-minute review once the live data path is restored:

1. Check snapshot freshness and failed workflow/deploy count.
2. Read the seven-day QDA total and mix.
3. Compare dashboard visits to crossing-detail and best-time behavior.
4. Note the top three crossings, regions, and language surface when available.
5. Record one product decision: fix reliability, improve first-use, interview a
   segment, offer a pilot, or do nothing.

Keep the report factual. “Events exist” does not mean “people use them,” and a
conversation is not a purchase.

## Data access constraint

The site includes an Umami Cloud website identifier and sends anonymous events,
but no Umami API credential is stored in the repository. The current browser
session reaches the Umami login page rather than an authenticated dashboard.
Traffic, retention, and conversion values remain unknown until the account
owner reads the dashboard or deliberately grants a read-only reporting path.
