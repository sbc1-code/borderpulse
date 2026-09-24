import { HttpError, json, methodGuard, sendError } from '../_lib/http.js';
import { missingConfig, serverConfig } from '../_lib/config.js';
import { requirePlusUser } from '../_lib/supabase.js';

export default async function handler(req, res) {
  try {
    methodGuard(req, ['GET']);
    const config = serverConfig();
    if (missingConfig(config, ['supabaseUrl', 'supabaseAnonKey']).length) {
      throw new HttpError(503, 'Account service is not configured');
    }
    const { client, user } = await requirePlusUser(req, config);
    const requestedLimit = Number(req.query?.limit || 20);
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 20;
    const { data, error } = await client
      .from('alert_deliveries')
      .select('id,rule_id,source_snapshot_at,evaluated_at,status,suppression_reason,provider_message_id,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    json(res, 200, { alert_deliveries: data || [] });
  } catch (error) {
    sendError(res, error);
  }
}
