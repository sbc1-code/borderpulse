import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
