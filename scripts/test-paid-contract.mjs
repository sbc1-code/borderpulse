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
  validateProfileInput,
  validateSavedCrossingInput,
} from '../api/_lib/validation.js';
import { evaluateAlertRule, isWithinAlertWindow, observedMinutes } from '../api/_lib/alerts.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/202609220001_paid_beta.sql'),
  'utf8',
);
const idempotencyMigration = fs.readFileSync(
  path.join(root, 'supabase/migrations/202609220002_alert_delivery_idempotency.sql'),
  'utf8',
);

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
    },
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
