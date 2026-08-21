// Thin wrapper around the Umami Cloud script already loaded in index.html.
// No new dependency, no cookies: Umami is cookieless by design. Every call is
// a no-op when Umami is absent (ad blockers, offline, or during prerender),
// so callers never need to guard.
//
// Usage: track('crossing-open', { slug, source })
//
// Pageviews are auto-tracked by the base script. These events cover what a
// pageview cannot show: which decisions people actually make on the dashboard.
// Keep this list accurate — it previously documented a `newsletter-subscribe`
// event that was never implemented.
//
// Decision funnel (#60):
//   direction-toggle    northbound vs southbound demand
//   region-filter       which border section people care about
//   crossing-open       the conversion, with source=card|popular|borderline
//   best-time-open      historical-planning intent vs live-wait intent
//   borderline-select   whether the border visualization is actually used
//   favorite-toggle     repeat-use signal (commuters vs one-off visitors)
//   show-all-crossings  whether the mobile collapse hides too much
//
// Distribution + monetization:
//   embed-copy          distribution / backlink funnel
//   share-status        viral / WhatsApp distribution
//   ad-consent          monetization-readiness signal (opt-in ad take rate)
//
// No free-text is ever sent: slugs and enum values only, never a raw search
// query, so an accidental paste cannot land in analytics.
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
