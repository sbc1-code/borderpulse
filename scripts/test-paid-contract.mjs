import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isPlusEntitled,
  projectSubscriptionEntitlement,
} from '../api/_lib/entitlements.js';
import {
  validateAlertRuleInput,
  validateAlertRulePatchInput,
  validateProfileInput,
  validateSavedCrossingInput,
} from '../api/_lib/validation.js';
import { evaluateAlertRule, isWithinAlertWindow, observedMinutes } from '../api/_lib/alerts.js';
import { isPaidWorkflowReady, serverConfig } from '../api/_lib/config.js';
import checkoutHandler from '../api/billing/checkout.js';
import portalHandler from '../api/billing/portal.js';
import alertRulesHandler from '../api/me/alert-rules.js';
import accountHandler from '../api/me/account.js';
import cronHandler from '../api/cron/evaluate-alerts.js';
import webhookHandler from '../api/stripe/webhook.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/202609220001_paid_beta.sql'),
  'utf8',
);
const idempotencyMigration = fs.readFileSync(
  path.join(root, 'supabase/migrations/202609220002_alert_delivery_idempotency.sql'),
  'utf8',
);
const orderingMigration = fs.readFileSync(
  path.join(root, 'supabase/migrations/202609220003_stripe_event_ordering.sql'),
  'utf8',
);
const accountRoute = fs.readFileSync(path.join(root, 'api/me/account.js'), 'utf8');
const entitlementRoute = fs.readFileSync(path.join(root, 'api/me/entitlement.js'), 'utf8');
const webhookRoute = fs.readFileSync(path.join(root, 'api/stripe/webhook.js'), 'utf8');

function invoke(handler, req) {
  return new Promise((resolve, reject) => {
    const response = {
      statusCode: 200,
      headers: {},
      status(code) { this.statusCode = code; return this; },
      setHeader(name, value) { this.headers[name] = value; },
      end(body) {
        let payload = null;
        try { payload = body ? JSON.parse(body) : null; } catch { payload = body; }
        resolve({ status: this.statusCode, payload });
      },
    };
    Promise.resolve(handler(req, response)).catch(reject);
  });
}

async function withoutPaidEnvironment(callback) {
  const keys = [
    'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_ID',
    'PUBLIC_APP_URL', 'CRON_SECRET', 'RESEND_API_KEY', 'ALERT_FROM_EMAIL',
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const previousConsoleError = console.error;
  for (const key of keys) delete process.env[key];
  console.error = () => {};
  try {
    return await callback();
  } finally {
    console.error = previousConsoleError;
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

test('paid beta migration is fail-closed and owner-scoped', () => {
  for (const table of [
    'profiles',
    'saved_crossings',
    'alert_rules',
    'alert_deliveries',
    'entitlements',
    'stripe_events',
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }

  assert.match(migration, /check \(direction = 'northbound'\)/);
  assert.match(migration, /plan_key text not null default 'plus_monthly'/);
  assert.match(migration, /processing_status text not null default 'received'/);
  assert.match(migration, /create policy entitlements_owner_select/);
  assert.match(migration, /foreign key \(saved_crossing_id, user_id\)/);
  assert.match(migration, /unique \(id, user_id\)/);
  assert.match(migration, /unique \(user_id, saved_crossing_id\)/);
  assert.match(migration, /create trigger profiles_email_sync/);
  assert.match(migration, /No authenticated or anonymous policies are created for stripe_events/);
  assert.doesNotMatch(migration, /create policy stripe_events/);
  assert.match(idempotencyMigration, /unique \(rule_id, source_snapshot_at\)/);
  assert.match(orderingMigration, /source_event_created bigint/);
  assert.match(orderingMigration, /apply_stripe_entitlement/);
  assert.match(orderingMigration, /excluded\.source_event_created >= public\.entitlements\.source_event_created/);
  assert.match(orderingMigration, /grant execute .* to service_role/);
});

test('entitlement policy fails closed and only projects the allowlisted price', () => {
  const now = new Date('2026-09-22T00:00:00.000Z');
  assert.equal(isPlusEntitled({
    plan_key: 'plus_monthly', status: 'active', current_period_end: '2026-09-23T00:00:00.000Z',
  }, now), true);
  assert.equal(isPlusEntitled({
    plan_key: 'plus_monthly', status: 'past_due', current_period_end: '2026-09-23T00:00:00.000Z',
  }, now), false);
  assert.equal(isPlusEntitled({
    plan_key: 'plus_monthly', status: 'active', current_period_end: null,
  }, now), false);

  const base = {
    id: 'sub_test', customer: 'cus_test', status: 'active', current_period_end: 1790121600,
    metadata: { user_id: 'user_test', plan_key: 'plus_monthly' },
    items: { data: [{ price: { id: 'price_test' } }] },
  };
  assert.equal(projectSubscriptionEntitlement(base, { priceId: 'price_other' }), null);
  assert.deepEqual(
    projectSubscriptionEntitlement(base, { priceId: 'price_test', eventId: 'evt_test' }),
    {
      user_id: 'user_test',
      stripe_customer_id: 'cus_test',
      stripe_subscription_id: 'sub_test',
      plan_key: 'plus_monthly',
      status: 'active',
      current_period_end: '2026-09-23T00:00:00.000Z',
      source_event_id: 'evt_test',
      source_event_created: null,
    },
  );
  assert.deepEqual(
    projectSubscriptionEntitlement(base, { priceId: 'price_test', eventId: 'evt_test', eventCreated: 1790035200 }).source_event_created,
    1790035200,
  );
});

test('saved crossing and alert rule inputs are bounded', () => {
  assert.deepEqual(validateSavedCrossingInput({
    port_number: '250401', display_name: 'San Ysidro', lane_type: 'standard', direction: 'southbound',
  }), {
    port_number: '250401', display_name: 'San Ysidro', direction: 'northbound', lane_type: 'standard',
  });
  assert.throws(() => validateSavedCrossingInput({
    port_number: '250401', display_name: 'San Ysidro', lane_type: 'unknown',
  }), /lane_type is invalid/);
  assert.deepEqual(validateAlertRuleInput({
    saved_crossing_id: 'crossing_test', threshold_minutes: 20, days_of_week: [1, 2, 3, 4, 5],
    window_start: '06:00', window_end: '09:30', timezone: 'America/Los_Angeles',
  }), {
    saved_crossing_id: 'crossing_test', threshold_minutes: 20, days_of_week: [1, 2, 3, 4, 5],
    window_start: '06:00', window_end: '09:30', timezone: 'America/Los_Angeles', enabled: true,
  });
  assert.throws(() => validateAlertRuleInput({
    saved_crossing_id: 'crossing_test', threshold_minutes: 20, days_of_week: [1, 1],
    window_start: '06:00', window_end: '09:30', timezone: 'UTC',
  }), /days_of_week is invalid/);
  assert.throws(() => validateAlertRuleInput({
    saved_crossing_id: 'crossing_test', threshold_minutes: 20, days_of_week: [1],
    window_start: '06:00', window_end: '09:30', timezone: 'Not/A_Timezone',
  }), /timezone is invalid/);
  const profile = validateProfileInput({ language: 'es', timezone: 'America/Mexico_City', email_opt_in: true });
  assert.equal(profile.language, 'es');
  assert.equal(profile.timezone, 'America/Mexico_City');
  assert.equal(profile.email_opt_in, true);
  assert.match(profile.email_opt_in_at, /^20\d\d-/);
  assert.throws(() => validateProfileInput({ email_opt_in: 'yes' }), /email_opt_in is invalid/);
  assert.deepEqual(validateAlertRulePatchInput({ threshold_minutes: 15, days_of_week: [1, 3], enabled: false }), {
    threshold_minutes: 15, days_of_week: [1, 3], enabled: false,
  });
  assert.throws(() => validateAlertRulePatchInput({ enabled: 'false' }), /enabled is invalid/);
  assert.throws(() => validateAlertRulePatchInput({}), /No alert rule fields provided/);
});

test('alert evaluator is lane-aware, schedule-aware, and fail-closed on stale data', () => {
  const crossing = {
    current_wait_time: 20,
    lanes: { passenger_standard: { delay_minutes: 20 }, passenger_sentri: { delay_minutes: 5 } },
  };
  assert.equal(observedMinutes(crossing, 'sentri'), 5);
  assert.equal(observedMinutes(crossing, 'ready'), null);
  const now = new Date('2026-09-22T16:00:00.000Z');
  const rule = {
    lane_type: 'sentri', threshold_minutes: 10, days_of_week: [2], window_start: '08:00', window_end: '12:00', timezone: 'America/Los_Angeles',
  };
  assert.equal(isWithinAlertWindow({ now, timeZone: rule.timezone, daysOfWeek: rule.days_of_week, windowStart: rule.window_start, windowEnd: rule.window_end }), true);
  assert.equal(evaluateAlertRule({ rule, crossing, snapshotAt: '2026-09-22T15:50:00.000Z', now, maxAgeMinutes: 45 }).shouldSend, true);
  assert.equal(evaluateAlertRule({ rule, crossing, snapshotAt: '2026-09-22T14:00:00.000Z', now, maxAgeMinutes: 45 }).reason, 'snapshot_stale');
});

test('account deletion is explicit and protects active billing', () => {
  assert.match(accountRoute, /body\.confirm !== 'DELETE'/);
  assert.match(accountRoute, /supabaseServiceRoleKey/);
  assert.match(accountRoute, /Cancel your subscription in the billing portal/);
  assert.match(accountRoute, /admin\.auth\.admin\.deleteUser\(user\.id\)/);
});

test('Stripe subscription state is applied through the ordered database function', () => {
  assert.match(webhookRoute, /eventCreated: event\.created/);
  assert.match(webhookRoute, /apply_stripe_entitlement/);
  assert.match(webhookRoute, /p_source_event_created: entitlement\.source_event_created/);
  assert.doesNotMatch(webhookRoute, /entitlements['\"]\.upsert/);
});

test('the Plus screen exposes weekday scheduling and does not offer checkout before billing is configured', () => {
  const plusScreen = fs.readFileSync(path.join(root, 'src/pages/Plus.jsx'), 'utf8');
  assert.match(entitlementRoute, /paid_workflow_ready:/);
  assert.match(plusScreen, /days_of_week/);
  assert.match(plusScreen, /billingUnavailable/);
  assert.match(plusScreen, /billingReady && <Button/);
  assert.doesNotMatch(plusScreen, /days_of_week: \[0, 1, 2, 3, 4, 5, 6\]/);
});

test('alert rules support authenticated editing and pause/resume controls', () => {
  const alertRoute = fs.readFileSync(path.join(root, 'api/me/alert-rules.js'), 'utf8');
  const plusScreen = fs.readFileSync(path.join(root, 'src/pages/Plus.jsx'), 'utf8');
  assert.match(alertRoute, /methodGuard\(req, \['GET', 'POST', 'PATCH', 'DELETE'\]\)/);
  assert.match(alertRoute, /validateAlertRulePatchInput/);
  assert.match(alertRoute, /Email opt-in is required before enabling an alert/);
  assert.match(plusScreen, /body: JSON\.stringify\(\{ enabled: !rule\.enabled \}\)/);
  assert.match(plusScreen, /editingRuleId/);
});

test('paid workflow readiness requires every server-side dependency', () => {
  const readyEnv = {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'service',
    STRIPE_SECRET_KEY: 'sk_test',
    STRIPE_WEBHOOK_SECRET: 'whsec_test',
    STRIPE_PRICE_ID: 'price_test',
    PUBLIC_APP_URL: 'https://preview.example.com',
    CRON_SECRET: 'cron',
    RESEND_API_KEY: 're_test',
    ALERT_FROM_EMAIL: 'Border Pulse <alerts@example.com>',
  };
  const ready = serverConfig(readyEnv);
  assert.equal(isPaidWorkflowReady(ready), true);
  assert.equal(isPaidWorkflowReady(serverConfig({ ...readyEnv, RESEND_API_KEY: '' })), false);
  assert.equal(isPaidWorkflowReady(serverConfig({ ...readyEnv, STRIPE_WEBHOOK_SECRET: '' })), false);
});

test('Vercel handlers fail closed before touching providers when configuration is absent', async () => {
  await withoutPaidEnvironment(async () => {
    const cases = [
      [checkoutHandler, { method: 'POST', headers: {} }],
      [portalHandler, { method: 'POST', headers: {} }],
      [alertRulesHandler, { method: 'GET', headers: {} }],
      [accountHandler, { method: 'DELETE', headers: {} }],
      [cronHandler, { method: 'GET', headers: {} }],
      [webhookHandler, { method: 'POST', headers: {} }],
    ];
    for (const [handler, request] of cases) {
      const result = await invoke(handler, request);
      assert.equal(result.status, 503);
      assert.equal(result.payload.error, 'Internal server error');
    }
  });
});

test('the protected evaluator rejects a bad cron credential before provider access', async () => {
  await withoutPaidEnvironment(async () => {
    process.env.CRON_SECRET = 'cron_test_secret';
    const result = await invoke(cronHandler, {
      method: 'GET',
      headers: { authorization: 'Bearer wrong_secret' },
    });
    assert.equal(result.status, 401);
    assert.equal(result.payload.error, 'Unauthorized');
  });
});
