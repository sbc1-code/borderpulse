import { serverConfig, missingConfig } from '../_lib/config.js';
import {
  isSubscriptionEvent,
  projectSubscriptionEntitlement,
} from '../_lib/entitlements.js';
import { HttpError, json, readRawBody, sendError } from '../_lib/http.js';
import { createStripeClient } from '../_lib/stripe.js';
import { createAdminClient } from '../_lib/supabase.js';

export const config = { api: { bodyParser: false } };

async function markEvent(admin, event, values) {
  const { error } = await admin.from('stripe_events').upsert({
    id: event.id,
    event_type: event.type,
    ...values,
  }, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    const config = serverConfig();
    const missing = missingConfig(config, [
      'supabaseUrl', 'supabaseServiceRoleKey', 'stripeSecretKey', 'stripeWebhookSecret', 'stripePriceId',
    ]);
    if (missing.length) throw new HttpError(503, 'Billing service is not configured');

    const signature = req.headers?.['stripe-signature'];
    if (!signature) throw new HttpError(400, 'Missing Stripe signature');
    const stripe = createStripeClient(config);
    const event = stripe.webhooks.constructEvent(
      await readRawBody(req),
      signature,
      config.stripeWebhookSecret,
    );
    const admin = createAdminClient(config);
    const { data: existing, error: existingError } = await admin
      .from('stripe_events')
      .select('processing_status')
      .eq('id', event.id)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing?.processing_status === 'processed') {
      json(res, 200, { received: true, duplicate: true });
      return;
    }
    await markEvent(admin, event, { processing_status: 'received', payload_hash: null, error_summary: null });

    if (isSubscriptionEvent(event.type)) {
      const entitlement = projectSubscriptionEntitlement(event.data.object, {
        priceId: config.stripePriceId,
        eventId: event.id,
      });
      if (entitlement) {
        const { error } = await admin.from('entitlements').upsert(entitlement, { onConflict: 'user_id' });
        if (error) throw new Error(error.message);
      }
    }

    await markEvent(admin, event, { processing_status: 'processed', processed_at: new Date().toISOString() });
    json(res, 200, { received: true });
  } catch (error) {
    sendError(res, error);
  }
}
