# BorderPulse launch gates

This is the parked operator checklist for a possible BorderPulse Plus beta. A
green code check does not establish demand or authorize a production cutover,
a live charge, or a customer message.

## Product

- [x] Free public product remains anonymous and useful: official northbound CBP
      data, crossing pages, comparisons, best-time views, bilingual guidance.
- [ ] PMF discovery confirms one recurring paid job, a plausible price range,
      and enough concrete opt-ins before the paid workflow resumes.
- [x] Plus boundary is written in `PAID-BETA-CONTRACT.md`: saved northbound
      crossings, bounded alert rules, opt-in email, and delivery history.
- [ ] Owner approves the final name, promise, founding price, participants,
      and public/private beta boundary.
- [ ] Personal history definition is accepted as saved-crossing history plus
      alert-delivery history for the first beta.

## Technical and deployment

- [x] Release baseline and explicit snapshot-history artifact are tested.
- [ ] Public data publication is current: the scheduled CBP fetch succeeds,
      the Pages/Vercel publication succeeds, and the live
      `/data/crossings.json` snapshot is fresh.
- [x] Vercel preview builds successfully and exposes the protected API
      functions; preview remains behind Vercel Authentication.
- [x] Server-side entitlement checks fail closed; RLS migration and delivery
      idempotency migration are written.
- [x] Vercel handlers have local HTTP contract coverage for absent-provider
      configuration and invalid cron credentials; a live database migration
      test still requires the dedicated Supabase project.
- [x] Account deletion requires explicit confirmation and blocks while billing
      is active or processing.
- [ ] Dedicated Supabase project is created, migration applied, backups and
      export tested, and auth redirect URLs verified.
- [ ] Vercel environment variables are configured with test-only values.
- [ ] `borderpulse.com` is cut over only after a separate production approval.

## Billing and finance

- [x] Checkout, portal, signed webhook, idempotency, and allowlisted Price-ID
      mechanics exist in code; entitlement writes reject older Stripe events.
- [ ] Owner confirms the correct Stripe account, legal identity, statement
      descriptor, support route, refund policy, tax treatment, and price.
- [ ] A separate BorderPulse Plus test Product and recurring Price exist. The
      existing DIGITO test catalog's unrelated Website setup deposit must not be
      reused.
- [ ] Test Checkout, webhook replay, renewal, cancellation, failed payment,
      refund, dispute, and entitlement revocation are read back literally.

## Privacy, support, and operations

- [x] `/privacy/` and `/privacidad/` give the launch review a concrete draft.
- [x] The evaluator checks freshness, timezone, lane data, entitlement,
      consent, and duplicate delivery before sending.
- [x] Delivery history and suppression/failure records are queryable by the
      account owner.
- [ ] Legal/privacy review approves retention, deletion, vendor disclosures,
      jurisdictions, and user-rights handling.
- [ ] Resend or another selected provider is approved, sender domain verified,
      spend ceiling set, and bounce/complaint/unsubscribe behavior tested.
- [ ] A support inbox and owner response process exist before beta users are
      invited.

## Marketing and QA

- [ ] Beta landing copy, pricing explanation, limits, and cancellation language
      are approved in English and Spanish.
- [ ] A small invited beta completes the real workflow before public launch.
- [x] Local full verification passes: build, trust/product tests, paid-contract
      tests, audit, bundle budgets, and desktop/mobile route smoke.
- [ ] Authenticated preview smoke, provider failure tests, accessibility review,
      email rendering, and production rollback checks pass with test accounts.

## Launch rule

Do not advertise Plus, connect live Stripe keys, publish the paid offer, or
move the public domain until every unchecked gate above has an owner and a
literal evidence record.
