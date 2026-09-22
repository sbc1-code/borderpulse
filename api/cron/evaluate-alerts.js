import { missingConfig, serverConfig } from '../_lib/config.js';
import { evaluateAlertRule, buildAlertEmail, sendResendEmail } from '../_lib/alerts.js';
import { isPlusEntitled } from '../_lib/entitlements.js';
import { HttpError, json, methodGuard, sendError } from '../_lib/http.js';
import { createAdminClient } from '../_lib/supabase.js';

function requireCron(req, secret) {
  if (!secret) throw new HttpError(503, 'Alert evaluator is not configured');
  if (req.headers?.authorization !== `Bearer ${secret}`) throw new HttpError(401, 'Unauthorized');
}

async function loadSnapshot(appUrl) {
  const response = await fetch(`${appUrl.replace(/\/$/, '')}/data/crossings.json?alert_t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new HttpError(503, 'CBP snapshot is unavailable');
  const payload = await response.json();
  if (!payload?.fetched_at || !Array.isArray(payload.crossings)) throw new HttpError(503, 'CBP snapshot is invalid');
  return payload;
}

function truncate(value, max = 240) {
  return String(value || 'Unknown evaluator error').slice(0, max);
}

async function recordSuppression(admin, rule, snapshotAt, reason) {
  const { error } = await admin.from('alert_deliveries').insert({
    user_id: rule.user_id,
    rule_id: rule.id,
    source_snapshot_at: snapshotAt,
    status: 'suppressed',
    suppression_reason: reason,
  });
  if (error?.code === '23505') return false;
  if (error) throw new Error(error.message);
  return true;
}

async function existingDelivery(admin, ruleId, snapshotAt) {
  const { data, error } = await admin
    .from('alert_deliveries')
    .select('id,status')
    .eq('rule_id', ruleId)
    .eq('source_snapshot_at', snapshotAt)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function queueDelivery(admin, rule, snapshotAt, existing) {
  if (existing?.status === 'sent' || existing?.status === 'queued' || existing?.status === 'suppressed') return null;
  if (existing?.status === 'failed') {
    const { error } = await admin.from('alert_deliveries').update({ status: 'queued', suppression_reason: null }).eq('id', existing.id);
    if (error) throw new Error(error.message);
    return existing.id;
  }
  const { data, error } = await admin.from('alert_deliveries').insert({
    user_id: rule.user_id,
    rule_id: rule.id,
    source_snapshot_at: snapshotAt,
    status: 'queued',
  }).select('id').single();
  if (error?.code === '23505') return null;
  if (error) throw new Error(error.message);
  return data.id;
}

export default async function handler(req, res) {
  try {
    methodGuard(req, ['GET']);
    const config = serverConfig();
    requireCron(req, config.cronSecret);
    const missing = missingConfig(config, [
      'supabaseUrl', 'supabaseServiceRoleKey', 'appUrl', 'resendApiKey', 'alertFromEmail',
    ]);
    if (missing.length) throw new HttpError(503, 'Alert evaluator dependencies are not configured');
    const admin = createAdminClient(config);
    const { data: rules, error: rulesError } = await admin
      .from('alert_rules')
      .select('id,user_id,saved_crossing_id,threshold_minutes,days_of_week,window_start,window_end,timezone,enabled')
      .eq('enabled', true);
    if (rulesError) throw new Error(rulesError.message);
    if (!rules?.length) {
      json(res, 200, { ok: true, evaluated: 0, queued: 0, sent: 0, suppressed: 0, failed: 0 });
      return;
    }

    const snapshot = await loadSnapshot(config.appUrl);
    const snapshotAt = snapshot.fetched_at;
    const portByNumber = new Map((snapshot.crossings || []).map((crossing) => [String(crossing.port_number), crossing]));
    const ruleIds = rules.map((rule) => rule.id);
    const userIds = [...new Set(rules.map((rule) => rule.user_id))];
    const savedIds = [...new Set(rules.map((rule) => rule.saved_crossing_id))];
    const [{ data: saved, error: savedError }, { data: profiles, error: profilesError }, { data: entitlements, error: entitlementsError }, { data: deliveries, error: deliveriesError }] = await Promise.all([
      admin.from('saved_crossings').select('id,user_id,port_number,display_name,direction,lane_type').in('id', savedIds),
      admin.from('profiles').select('id,email,language,email_opt_in').in('id', userIds),
      admin.from('entitlements').select('user_id,plan_key,status,current_period_end').in('user_id', userIds),
      admin.from('alert_deliveries').select('id,rule_id,status,source_snapshot_at').in('rule_id', ruleIds).eq('source_snapshot_at', snapshotAt),
    ]);
    if (savedError || profilesError || entitlementsError || deliveriesError) {
      throw new Error(savedError?.message || profilesError?.message || entitlementsError?.message || deliveriesError?.message);
    }
    const savedById = new Map((saved || []).map((row) => [row.id, row]));
    const profileById = new Map((profiles || []).map((row) => [row.id, row]));
    const entitlementById = new Map((entitlements || []).map((row) => [row.user_id, row]));
    const deliveryByRule = new Map((deliveries || []).map((row) => [row.rule_id, row]));
    const now = new Date();
    const counts = { evaluated: 0, queued: 0, sent: 0, suppressed: 0, failed: 0 };

    for (const rule of rules) {
      counts.evaluated += 1;
      const profile = profileById.get(rule.user_id);
      const entitlement = entitlementById.get(rule.user_id);
      const savedCrossing = savedById.get(rule.saved_crossing_id);
      const crossing = savedCrossing ? portByNumber.get(String(savedCrossing.port_number)) : null;
      const existing = deliveryByRule.get(rule.id);
      const evaluated = evaluateAlertRule({
        rule: savedCrossing ? { ...rule, lane_type: savedCrossing.lane_type } : rule,
        crossing,
        snapshotAt,
        now,
        maxAgeMinutes: config.alertMaxAgeMinutes,
      });
      let suppression = evaluated.reason;
      if (!isPlusEntitled(entitlement, now)) suppression = 'plus_not_entitled';
      else if (!profile?.email_opt_in) suppression = 'email_opt_in_required';
      else if (!profile?.email) suppression = 'email_missing';
      if (!savedCrossing) suppression = 'saved_crossing_missing';

      try {
        if (suppression || !evaluated.shouldSend) {
          if (await recordSuppression(admin, rule, snapshotAt, suppression || 'condition_not_met')) counts.suppressed += 1;
        } else {
          const deliveryId = await queueDelivery(admin, rule, snapshotAt, existing);
          if (!deliveryId) continue;
          counts.queued += 1;
          const email = buildAlertEmail({ profile, savedCrossing, rule: { ...rule, lane_type: savedCrossing.lane_type }, observed: evaluated.observedMinutes, snapshotAt, appUrl: config.appUrl });
          try {
            const providerMessageId = await sendResendEmail({ apiKey: config.resendApiKey, from: config.alertFromEmail, to: profile.email, ...email });
            const { error } = await admin.from('alert_deliveries').update({ status: 'sent', provider_message_id: providerMessageId, suppression_reason: null }).eq('id', deliveryId);
            if (error) throw new Error(error.message);
            counts.sent += 1;
          } catch (sendError) {
            const { error } = await admin.from('alert_deliveries').update({ status: 'failed', suppression_reason: truncate(sendError.message) }).eq('id', deliveryId);
            if (error) throw new Error(error.message);
            counts.failed += 1;
          }
        }
      } finally {
        const { error } = await admin.from('alert_rules').update({ last_evaluated_at: now.toISOString() }).eq('id', rule.id);
        if (error) throw new Error(error.message);
      }
    }
    json(res, 200, { ok: true, snapshot_at: snapshotAt, ...counts });
  } catch (error) {
    sendError(res, error);
  }
}
