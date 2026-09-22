-- BorderPulse Plus beta foundation.
-- Apply only to a dedicated BorderPulse Supabase project after owner approval.
-- Stripe remains the source of truth for billing; these tables mirror state.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  language text not null default 'en' check (language in ('en', 'es')),
  timezone text not null default 'UTC',
  email_opt_in boolean not null default false,
  email_opt_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_crossings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  port_number text not null,
  display_name text not null,
  direction text not null default 'northbound' check (direction = 'northbound'),
  lane_type text not null check (lane_type in ('standard', 'sentri', 'ready', 'pedestrian', 'commercial')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, port_number, lane_type),
  unique (id, user_id)
);

create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  saved_crossing_id uuid not null references public.saved_crossings(id) on delete cascade,
  threshold_minutes smallint not null check (threshold_minutes between 0 and 600),
  days_of_week smallint[] not null default array[1, 2, 3, 4, 5]::smallint[],
  window_start time not null default '00:00',
  window_end time not null default '23:59:59',
  timezone text not null default 'UTC',
  enabled boolean not null default true,
  last_evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (saved_crossing_id, user_id)
    references public.saved_crossings(id, user_id) on delete cascade,
  unique (user_id, saved_crossing_id),
  check (days_of_week <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  check (cardinality(days_of_week) between 1 and 7)
);

create table if not exists public.alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  rule_id uuid not null references public.alert_rules(id) on delete cascade,
  source_snapshot_at timestamptz not null,
  evaluated_at timestamptz not null default now(),
  status text not null check (status in ('queued', 'sent', 'suppressed', 'failed')),
  suppression_reason text,
  provider_message_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.entitlements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan_key text not null default 'plus_monthly' check (plan_key = 'plus_monthly'),
  status text not null check (status in ('active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'trialing', 'paused')),
  current_period_end timestamptz,
  source_event_id text,
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_events (
  id text primary key,
  event_type text not null,
  processing_status text not null default 'received' check (processing_status in ('received', 'processed', 'failed')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  payload_hash text,
  error_summary text
);

create index if not exists saved_crossings_user_idx on public.saved_crossings(user_id);
create index if not exists alert_rules_user_idx on public.alert_rules(user_id);
create index if not exists alert_rules_enabled_idx on public.alert_rules(enabled) where enabled;
create index if not exists alert_deliveries_user_created_idx on public.alert_deliveries(user_id, created_at desc);
create index if not exists stripe_events_status_idx on public.stripe_events(processing_status);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select email into new.email from auth.users where id = new.id;
  return new;
end;
$$;

drop trigger if exists profiles_email_sync on public.profiles;
create trigger profiles_email_sync before insert or update on public.profiles
for each row execute function public.sync_profile_email();

drop trigger if exists saved_crossings_updated_at on public.saved_crossings;
create trigger saved_crossings_updated_at before update on public.saved_crossings
for each row execute function public.set_updated_at();

drop trigger if exists alert_rules_updated_at on public.alert_rules;
create trigger alert_rules_updated_at before update on public.alert_rules
for each row execute function public.set_updated_at();

drop trigger if exists entitlements_updated_at on public.entitlements;
create trigger entitlements_updated_at before update on public.entitlements
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.saved_crossings enable row level security;
alter table public.alert_rules enable row level security;
alter table public.alert_deliveries enable row level security;
alter table public.entitlements enable row level security;
alter table public.stripe_events enable row level security;

drop policy if exists profiles_owner_select on public.profiles;
create policy profiles_owner_select on public.profiles for select
using (auth.uid() = id);

drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_update on public.profiles for update
using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists saved_crossings_owner_all on public.saved_crossings;
create policy saved_crossings_owner_all on public.saved_crossings for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists alert_rules_owner_all on public.alert_rules;
create policy alert_rules_owner_all on public.alert_rules for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists alert_deliveries_owner_select on public.alert_deliveries;
create policy alert_deliveries_owner_select on public.alert_deliveries for select
using (auth.uid() = user_id);

drop policy if exists entitlements_owner_select on public.entitlements;
create policy entitlements_owner_select on public.entitlements for select
using (auth.uid() = user_id);

-- No authenticated or anonymous policies are created for stripe_events.
-- Webhook and evaluator code use the server-only Supabase service role.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
