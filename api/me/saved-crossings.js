import { serverConfig, missingConfig } from '../_lib/config.js';
import { HttpError, json, methodGuard, requestBody, sendError } from '../_lib/http.js';
import { requirePlusUser } from '../_lib/supabase.js';
import { validateSavedCrossingInput } from '../_lib/validation.js';

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
        .from('saved_crossings')
        .select('id,port_number,display_name,direction,lane_type,created_at,updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      json(res, 200, { saved_crossings: data || [] });
      return;
    }

    const id = typeof req.query?.id === 'string' ? req.query.id : null;
    if (req.method === 'DELETE') {
      if (!id) throw new HttpError(400, 'id is required');
      const { error } = await client.from('saved_crossings').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw new Error(error.message);
      json(res, 200, { deleted: true });
      return;
    }

    const { count, error: countError } = await client
      .from('saved_crossings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if (countError) throw new Error(countError.message);
    if ((count || 0) >= 3) throw new HttpError(409, 'Maximum of three saved crossings reached');
    const input = validateSavedCrossingInput(requestBody(req));
    const { data, error } = await client
      .from('saved_crossings')
      .insert({ ...input, user_id: user.id })
      .select('id,port_number,display_name,direction,lane_type,created_at,updated_at')
      .single();
    if (error?.code === '23505') throw new HttpError(409, 'This crossing and lane are already saved');
    if (error) throw new Error(error.message);
    json(res, 201, { saved_crossing: data });
  } catch (error) {
    sendError(res, error);
  }
}
