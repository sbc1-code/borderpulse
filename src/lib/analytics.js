// Thin wrapper around the Umami Cloud script already loaded in index.html.
// No new dependency, no cookies: Umami is cookieless by design. Every call is
// a no-op when Umami is absent (ad blockers, offline, or during prerender),
// so callers never need to guard.
//
// Usage: track('newsletter-subscribe', { source, variant })
//
// Events instrumented today map the inbound + monetization funnel the product
// can otherwise not see (pageviews are auto-tracked by the base script):
//   newsletter-subscribe  owned-audience funnel
//   embed-copy            distribution / backlink funnel
//   share-status          viral / WhatsApp distribution
//   ad-consent            monetization-readiness signal (opt-in ad take rate)
export function track(event, data) {
  if (typeof window === 'undefined' || !event) return;
  try {
    const u = window.umami;
    if (!u) return;
    if (typeof u.track === 'function') {
      data ? u.track(event, data) : u.track(event);
    } else if (typeof u === 'function') {
      // Legacy script signature.
      data ? u(event, data) : u(event);
    }
  } catch {
    // Analytics must never break a user interaction.
  }
}
