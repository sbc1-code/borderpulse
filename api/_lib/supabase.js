import { createClient } from '@supabase/supabase-js';
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
