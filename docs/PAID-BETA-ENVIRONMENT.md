# Paid beta environment variables

These names are required only when the test-mode paid beta is connected to a
real Supabase project, Stripe test mode, and a Vercel preview. Values belong in
Vercel Environment Variables or an ignored local file. Never commit them.

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-key
STRIPE_PRICE_ID=price_test_your-price
PUBLIC_APP_URL=https://your-preview-domain.vercel.app
CRON_SECRET=generate-a-long-random-secret
RESEND_API_KEY=re_your-test-or-preview-key
ALERT_FROM_EMAIL=Border Pulse <alerts@your-verified-domain.example>
ALERT_MAX_AGE_MINUTES=45
```

The service-role key, Stripe secret key, and webhook secret are server-only.
They must never be prefixed with `VITE_` and must never reach the browser.
The preview must use test-mode Stripe values. Live keys and live Price IDs are
blocked until the owner approves the commercial and production gates.

The alert evaluator is hosted as a Vercel function and invoked by the existing
GitHub Actions control plane every 15 minutes. Store the evaluator URL as the
repository secret `BORDERPULSE_ALERT_EVALUATOR_URL` and the same `CRON_SECRET`
as `BORDERPULSE_CRON_SECRET`. If either secret is absent, the workflow skips
without sending anything. Resend is the proposed transactional provider; its
API key and verified sender remain unset until the owner approves the provider,
domain, and spend ceiling.
