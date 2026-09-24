export const PLUS_PLAN_KEY = 'plus_monthly';

export function isPlusEntitled(entitlement, now = new Date()) {
  if (!entitlement || entitlement.plan_key !== PLUS_PLAN_KEY || entitlement.status !== 'active') {
    return false;
  }
  const periodEnd = Date.parse(entitlement.current_period_end || '');
  return Number.isFinite(periodEnd) && periodEnd > now.getTime();
}

function subscriptionUserId(subscription) {
  return subscription?.metadata?.user_id || null;
}

export function projectSubscriptionEntitlement(subscription, { priceId, eventId, eventCreated } = {}) {
  const userId = subscriptionUserId(subscription);
  const item = subscription?.items?.data?.find((entry) => entry?.price?.id === priceId);
  if (!userId || !priceId || !item) return null;

  const periodEnd = Number(subscription.current_period_end);
  return {
    user_id: userId,
    stripe_customer_id: String(subscription.customer || ''),
    stripe_subscription_id: String(subscription.id || ''),
    plan_key: PLUS_PLAN_KEY,
    status: subscription.status,
    current_period_end: Number.isFinite(periodEnd) && periodEnd > 0
      ? new Date(periodEnd * 1000).toISOString()
      : null,
    source_event_id: eventId || null,
    source_event_created: Number.isInteger(eventCreated) && eventCreated > 0 ? eventCreated : null,
  };
}

export function isSubscriptionEvent(type) {
  return type === 'customer.subscription.created'
    || type === 'customer.subscription.updated'
    || type === 'customer.subscription.deleted';
}
