import { serverConfig, missingConfig } from '../_lib/config.js';
import { HttpError, json, methodGuard, sendError } from '../_lib/http.js';
import { createStripeClient } from '../_lib/stripe.js';
import { requireUser } from '../_lib/supabase.js';

export default async function handler(req, res) {
  try {
    methodGuard(req, ['POST']);
    const config = serverConfig();
    const missing = missingConfig(config, [
      'supabaseUrl', 'supabaseAnonKey', 'stripeSecretKey', 'appUrl',
    ]);
    if (missing.length) throw new HttpError(503, 'Billing service is not configured');
    const { client, user } = await requireUser(req, config);
    const { data: entitlement, error } = await client
      .from('entitlements')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!entitlement?.stripe_customer_id) throw new HttpError(404, 'No billing record found');

    const stripe = createStripeClient(config);
    const session = await stripe.billingPortal.sessions.create({
      customer: entitlement.stripe_customer_id,
      return_url: `${config.appUrl.replace(/\/$/, '')}/plus`,
    });
    json(res, 200, { url: session.url });
  } catch (error) {
    sendError(res, error);
  }
}
