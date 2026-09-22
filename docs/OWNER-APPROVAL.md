# BorderPulse Plus owner approval

Status: pending owner decisions. This page is a plain-language handoff for
Codex or Claude Code. It is not approval to deploy production, charge a
customer, or send a marketing message.

## What is ready

The free BorderPulse app remains public and anonymous. The proposed Plus beta
adds saved northbound crossings, one to three email alert rules, weekday and
time-window selection, alert-delivery history, and an ad-free account surface.
The protected Vercel preview and the test-only code are ready for provider
setup.

## Recommended first test setup

Approve these as a single small test phase:

- Create a dedicated Supabase project for BorderPulse test accounts. Do not
  reuse a project for another business or product.
- Create a separate Stripe test product and recurring Price named BorderPulse
  Plus at **$5/month**, cancel anytime, with no trial or annual plan.
- Use Resend for transactional alert email, with a verified sender and a
  monthly spend ceiling chosen by the owner.
- Keep the beta private, with no public price announcement and no production
  domain cutover until the real workflow passes QA.

## Owner answers still needed

1. Is `BorderPulse Plus` the name, and is `$5/month` the starting test price?
2. Which support email should appear in Stripe and the privacy notice?
3. What refund and cancellation rule should apply? Recommended default:
   cancel anytime, access through the paid period, no prorated refund unless
   the owner grants one.
4. Which legal identity and initial customer jurisdictions should the notice
   cover? The agent must not guess these.
5. Which sender domain and monthly email spend ceiling should Resend use?
6. Which invited beta participants may test the workflow? Keep this private
   and small at first, ideally no more than five people.

## Copy-paste approval

If the recommended test setup is correct, reply:

> Approve BorderPulse Plus test setup: BorderPulse Plus at $5/month, dedicated
> Supabase, separate Stripe test Product/Price, Resend for transactional email,
> private beta only, no production deployment, no live charges, and no
> marketing messages. My support email is [address]. My sender domain is
> [domain]. My monthly email ceiling is [$ amount].

The agent will stop for any missing legal, support, sender, or participant
choice and will report literal test evidence before requesting production
approval.
