import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isPlusEntitled,
  projectSubscriptionEntitlement,
} from '../api/_lib/entitlements.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/202609220001_paid_beta.sql'),
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
  assert.match(migration, /No authenticated or anonymous policies are created for stripe_events/);
  assert.doesNotMatch(migration, /create policy stripe_events/);
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
