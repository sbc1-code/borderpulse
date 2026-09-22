-- Keep entitlement state monotonic when Stripe retries or delivers events out
-- of order. The webhook calls this function with the Stripe event timestamp;
-- an older event cannot overwrite newer billing state.

alter table public.entitlements
  add column if not exists source_event_created bigint;

create or replace function public.apply_stripe_entitlement(
  p_user_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_plan_key text,
  p_status text,
  p_current_period_end timestamptz,
  p_source_event_id text,
  p_source_event_created bigint
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  if p_plan_key <> 'plus_monthly' then
    raise exception 'unsupported entitlement plan';
  end if;

  if p_status not in ('active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'trialing', 'paused') then
    raise exception 'unsupported subscription status';
  end if;

  insert into public.entitlements (
    user_id,
    stripe_customer_id,
    stripe_subscription_id,
    plan_key,
    status,
    current_period_end,
    source_event_id,
    source_event_created
  ) values (
    p_user_id,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_plan_key,
    p_status,
    p_current_period_end,
    p_source_event_id,
    p_source_event_created
  )
  on conflict (user_id) do update set
    stripe_customer_id = excluded.stripe_customer_id,
    stripe_subscription_id = excluded.stripe_subscription_id,
    plan_key = excluded.plan_key,
    status = excluded.status,
    current_period_end = excluded.current_period_end,
    source_event_id = excluded.source_event_id,
    source_event_created = excluded.source_event_created,
    updated_at = now()
  where public.entitlements.source_event_created is null
    or (
      excluded.source_event_created is not null
      and excluded.source_event_created >= public.entitlements.source_event_created
    );

  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;

revoke all on function public.apply_stripe_entitlement(uuid, text, text, text, text, timestamptz, text, bigint) from public;
grant execute on function public.apply_stripe_entitlement(uuid, text, text, text, text, timestamptz, text, bigint) to service_role;
