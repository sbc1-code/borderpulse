import { serverConfig, missingConfig } from '../_lib/config.js';
import { HttpError, json, methodGuard, sendError } from '../_lib/http.js';
import { isPlusEntitled } from '../_lib/entitlements.js';
import { requireUser } from '../_lib/supabase.js';

export default async function handler(req, res) {
  try {
    methodGuard(req, ['GET']);
    const config = serverConfig();
    const missing = missingConfig(config, ['supabaseUrl', 'supabaseAnonKey']);
    if (missing.length) throw new HttpError(503, 'Account service is not configured');
    const { client, user } = await requireUser(req, config);
    const { data, error } = await client
      .from('entitlements')
      .select('plan_key,status,current_period_end,stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    json(res, 200, {
      entitled: isPlusEntitled(data),
      billing_ready: Boolean(config.stripeSecretKey && config.stripePriceId && config.appUrl),
      has_billing_record: Boolean(data?.stripe_customer_id),
      entitlement: data ? {
        plan_key: data.plan_key,
        status: data.status,
        current_period_end: data.current_period_end,
      } : null,
    });
  } catch (error) {
    sendError(res, error);
  }
}
