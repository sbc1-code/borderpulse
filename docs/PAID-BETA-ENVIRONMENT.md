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
```

The service-role key, Stripe secret key, and webhook secret are server-only.
They must never be prefixed with `VITE_` and must never reach the browser.
The preview must use test-mode Stripe values. Live keys and live Price IDs are
blocked until the owner approves the commercial and production gates.
