import { createClient } from '@supabase/supabase-js';
import { isPlusEntitled } from './entitlements.js';
import { HttpError, getBearerToken } from './http.js';

function clientOptions(headers = {}) {
  return {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers },
  };
}

export function createUserClient(config, token) {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new HttpError(503, 'Account service is not configured');
  }
  return createClient(
    config.supabaseUrl,
    config.supabaseAnonKey,
    clientOptions({ Authorization: `Bearer ${token}` }),
  );
}

export function createAdminClient(config) {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new HttpError(503, 'Account service is not configured');
  }
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, clientOptions());
}

export async function requireUser(req, config) {
  const token = getBearerToken(req);
  if (!token) throw new HttpError(401, 'Sign in required');
  const client = createUserClient(config, token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, 'Sign in required');
  return { client, user: data.user };
}

export async function requirePlusUser(req, config) {
  const authenticated = await requireUser(req, config);
  const { data: entitlement, error } = await authenticated.client
    .from('entitlements')
    .select('plan_key,status,current_period_end')
    .eq('user_id', authenticated.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!isPlusEntitled(entitlement)) {
    throw new HttpError(403, 'BorderPulse Plus is required');
  }
  return { ...authenticated, entitlement };
}
