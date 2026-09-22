import { serverConfig, missingConfig } from '../_lib/config.js';
import { HttpError, json, methodGuard, requestBody, sendError } from '../_lib/http.js';
import { requirePlusUser } from '../_lib/supabase.js';
import { validateAlertRuleInput } from '../_lib/validation.js';

export default async function handler(req, res) {
  try {
    methodGuard(req, ['GET', 'POST', 'DELETE']);
    const config = serverConfig();
    if (missingConfig(config, ['supabaseUrl', 'supabaseAnonKey']).length) {
      throw new HttpError(503, 'Account service is not configured');
    }
    const { client, user } = await requirePlusUser(req, config);

    if (req.method === 'GET') {
      const { data, error } = await client
        .from('alert_rules')
        .select('id,saved_crossing_id,threshold_minutes,days_of_week,window_start,window_end,timezone,enabled,last_evaluated_at,created_at,updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      json(res, 200, { alert_rules: data || [] });
      return;
    }

    const id = typeof req.query?.id === 'string' ? req.query.id : null;
    if (req.method === 'DELETE') {
      if (!id) throw new HttpError(400, 'id is required');
      const { error } = await client.from('alert_rules').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw new Error(error.message);
      json(res, 200, { deleted: true });
      return;
    }

    const { count, error: countError } = await client
      .from('alert_rules')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if (countError) throw new Error(countError.message);
    if ((count || 0) >= 3) throw new HttpError(409, 'Maximum of three alert rules reached');
    const input = validateAlertRuleInput(requestBody(req));
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('email_opt_in')
      .eq('id', user.id)
      .single();
    if (profileError) throw new Error(profileError.message);
    if (!profile?.email_opt_in) throw new HttpError(409, 'Email opt-in is required before creating an alert');
    const { data: crossing, error: crossingError } = await client
      .from('saved_crossings')
      .select('id')
      .eq('id', input.saved_crossing_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (crossingError) throw new Error(crossingError.message);
    if (!crossing) throw new HttpError(400, 'saved_crossing_id is invalid');

    const { data, error } = await client
      .from('alert_rules')
      .insert({ ...input, user_id: user.id })
      .select('id,saved_crossing_id,threshold_minutes,days_of_week,window_start,window_end,timezone,enabled,last_evaluated_at,created_at,updated_at')
      .single();
    if (error?.code === '23505') throw new HttpError(409, 'An alert already exists for this crossing');
    if (error) throw new Error(error.message);
    json(res, 201, { alert_rule: data });
  } catch (error) {
    sendError(res, error);
  }
}
