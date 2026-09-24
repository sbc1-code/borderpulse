export function serverConfig(env = process.env) {
  const alertMaxAgeMinutes = Number(env.ALERT_MAX_AGE_MINUTES || 45);
  return {
    supabaseUrl: env.SUPABASE_URL || '',
    supabaseAnonKey: env.SUPABASE_ANON_KEY || '',
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || '',
    stripeSecretKey: env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
    stripePriceId: env.STRIPE_PRICE_ID || '',
    appUrl: env.PUBLIC_APP_URL || '',
    cronSecret: env.CRON_SECRET || '',
    resendApiKey: env.RESEND_API_KEY || '',
    alertFromEmail: env.ALERT_FROM_EMAIL || '',
    alertMaxAgeMinutes: Number.isFinite(alertMaxAgeMinutes) && alertMaxAgeMinutes > 0
      ? alertMaxAgeMinutes
      : 45,
  };
}

export function missingConfig(config, names) {
  return names.filter((name) => !config[name]);
}

// Checkout must remain hidden until the whole paid workflow can honor what it
// sells: account state, signed billing webhooks, scheduled evaluation, and
// transactional email. This is intentionally server-side and never exposes
// the underlying values to the browser.
export const PAID_WORKFLOW_CONFIG_NAMES = [
  'supabaseUrl',
  'supabaseAnonKey',
  'supabaseServiceRoleKey',
  'stripeSecretKey',
  'stripeWebhookSecret',
  'stripePriceId',
  'appUrl',
  'cronSecret',
  'resendApiKey',
  'alertFromEmail',
];

export function isPaidWorkflowReady(config) {
  return missingConfig(config, PAID_WORKFLOW_CONFIG_NAMES).length === 0;
}
