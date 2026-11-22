// Activation requires Google site approval, published CMP messages and owner OK.
// Keep this false in the preparation release. Existing Adsterra continues.
export const GOOGLE_ADS_ENABLED = false;
export const GOOGLE_PUBLISHER = 'ca-pub-7889422382615234';
export const GOOGLE_SLOT = '2612112583';

export function googleAdsAllowed(location, enabled = GOOGLE_ADS_ENABLED) {
  return enabled && location?.protocol === 'https:'
    && ['borderpulse.com', 'www.borderpulse.com'].includes(location.hostname)
    && ['/', '/Dashboard', '/Dashboard/'].includes(location.pathname);
}

// Google's published Privacy & messaging messages are delivered by this tag.
// Google interprets TCF/GPP consent for eligible ad serving. No custom opt-in,
// ad refresh, provider fallback or consent record is added here.
export function requestGoogleAd(element, onPrivacyReady, enabled = GOOGLE_ADS_ENABLED) {
  if (typeof window === 'undefined' || !element || !googleAdsAllowed(window.location, enabled)) return () => {};
  let active = true;
  let listenerId;
  window.googlefc = window.googlefc || {};
  window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
  window.googlefc.callbackQueue.push({ CONSENT_API_READY: () => {
    if (!active || typeof window.googlefc.showRevocationMessage !== 'function') return;
    window.__tcfapi?.('addEventListener', 0, (data, success) => {
      listenerId = data?.listenerId;
      if (active) onPrivacyReady(Boolean(success && data?.gdprApplies));
      else if (listenerId !== undefined) window.__tcfapi?.('removeEventListener', 0, () => {}, listenerId);
    });
  } });
  if (!document.getElementById('google-adsense-runtime')) {
    const script = document.createElement('script');
    script.id = 'google-adsense-runtime';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${GOOGLE_PUBLISHER}`;
    document.head.appendChild(script);
  }
  // React effect replay must not issue another request for the same element.
  if (!element.dataset.googleRequested) {
    element.dataset.googleRequested = 'true';
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
    catch { /* Blocked or unfilled ads must never interrupt the page. */ }
  }
  return () => {
    active = false;
    if (listenerId !== undefined) window.__tcfapi?.('removeEventListener', 0, () => {}, listenerId);
  };
}

export function reopenGooglePrivacy() {
  if (typeof window === 'undefined' || !window.googlefc?.callbackQueue) return;
  window.googlefc.callbackQueue.push({ CONSENT_API_READY: () => window.googlefc.showRevocationMessage?.() });
}
