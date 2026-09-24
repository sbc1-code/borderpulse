import { serverConfig, missingConfig } from '../_lib/config.js';
import { isPlusEntitled } from '../_lib/entitlements.js';
import { HttpError, json, methodGuard, requestBody, sendError } from '../_lib/http.js';
import { createAdminClient, requireUser } from '../_lib/supabase.js';

const BILLING_STATUSES_REQUIRING_CANCELLATION = new Set([
  'active', 'past_due', 'trialing', 'incomplete', 'unpaid', 'paused',
]);

export default async function handler(req, res) {
  try {
    methodGuard(req, ['DELETE']);
    const config = serverConfig();
    const missing = missingConfig(config, ['supabaseUrl', 'supabaseAnonKey', 'supabaseServiceRoleKey']);
    if (missing.length) throw new HttpError(503, 'Account deletion is not configured');
    const { user } = await requireUser(req, config);
    const body = requestBody(req);
    if (body.confirm !== 'DELETE') throw new HttpError(400, 'Confirmation is required');

    const admin = createAdminClient(config);
    const { data: entitlement, error: entitlementError } = await admin
      .from('entitlements')
      .select('stripe_customer_id,status,current_period_end,plan_key')
      .eq('user_id', user.id)
      .maybeSingle();
    if (entitlementError) throw new Error(entitlementError.message);
    if (entitlement && (isPlusEntitled(entitlement) || BILLING_STATUSES_REQUIRING_CANCELLATION.has(entitlement.status))) {
      throw new HttpError(409, 'Cancel your subscription in the billing portal before deleting your account');
    }

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw new Error(error.message);
    json(res, 200, { deleted: true });
  } catch (error) {
    sendError(res, error);
  }
}
