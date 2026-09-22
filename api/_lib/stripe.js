import Stripe from 'stripe';
import { HttpError } from './http.js';

export function createStripeClient(config) {
  if (!config.stripeSecretKey) throw new HttpError(503, 'Billing service is not configured');
  return new Stripe(config.stripeSecretKey);
}
