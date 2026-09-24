import { serverConfig, missingConfig } from '../_lib/config.js';
import { HttpError, json, methodGuard, requestBody, sendError } from '../_lib/http.js';
import { requireUser } from '../_lib/supabase.js';
import { validateProfileInput } from '../_lib/validation.js';

export default async function handler(req, res) {
  try {
    methodGuard(req, ['GET', 'PATCH']);
    const config = serverConfig();
    if (missingConfig(config, ['supabaseUrl', 'supabaseAnonKey']).length) {
      throw new HttpError(503, 'Account service is not configured');
    }
    const { client, user } = await requireUser(req, config);

    if (req.method === 'GET') {
      const { data, error } = await client
        .from('profiles')
        .select('id,email,language,timezone,email_opt_in,email_opt_in_at,created_at,updated_at')
        .eq('id', user.id)
        .single();
      if (error) throw new Error(error.message);
      json(res, 200, { profile: data });
      return;
    }

    const input = validateProfileInput(requestBody(req));
    const { data, error } = await client
      .from('profiles')
      .update(input)
      .eq('id', user.id)
      .select('id,email,language,timezone,email_opt_in,email_opt_in_at,created_at,updated_at')
      .single();
    if (error) throw new Error(error.message);
    json(res, 200, { profile: data });
  } catch (error) {
    sendError(res, error);
  }
}
