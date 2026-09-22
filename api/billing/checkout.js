import { serverConfig, missingConfig } from '../_lib/config.js';
import { isPlusEntitled } from '../_lib/entitlements.js';
import { HttpError, json, methodGuard, sendError } from '../_lib/http.js';
import { createStripeClient } from '../_lib/stripe.js';
import { requireUser } from '../_lib/supabase.js';

export default async function handler(req, res) {
  try {
    methodGuard(req, ['POST']);
    const config = serverConfig();
    const missing = missingConfig(config, [
      'supabaseUrl', 'supabaseAnonKey', 'stripeSecretKey', 'stripePriceId', 'appUrl',
    ]);
    if (missing.length) throw new HttpError(503, 'Billing service is not configured');
    const { client, user } = await requireUser(req, config);
    const { data: entitlement, error: entitlementError } = await client
      .from('entitlements')
      .select('stripe_customer_id,plan_key,status,current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();
    if (entitlementError) throw new Error(entitlementError.message);
    if (isPlusEntitled(entitlement)) throw new HttpError(409, 'Plus is already active');
    if (entitlement?.stripe_customer_id && entitlement.status !== 'canceled' && entitlement.status !== 'incomplete_expired') {
      throw new HttpError(409, 'Existing billing record requires the customer portal');
    }

    const stripe = createStripeClient(config);
    const params = {
      mode: 'subscription',
      line_items: [{ price: config.stripePriceId, quantity: 1 }],
      success_url: `${config.appUrl.replace(/\/$/, '')}/plus?checkout=success`,
      cancel_url: `${config.appUrl.replace(/\/$/, '')}/plus?checkout=cancelled`,
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan_key: 'plus_monthly' },
      subscription_data: { metadata: { user_id: user.id, plan_key: 'plus_monthly' } },
    };
    if (entitlement?.stripe_customer_id) params.customer = entitlement.stripe_customer_id;
    else if (user.email) params.customer_email = user.email;
    const session = await stripe.checkout.sessions.create(params);
    json(res, 200, { url: session.url });
  } catch (error) {
    sendError(res, error);
  }
}
