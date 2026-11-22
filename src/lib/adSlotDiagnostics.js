import { track } from './analytics.js';

/**
 * Best-effort DOM diagnostics for the existing dashboard slot, not audited
 * ad-network impressions, creative viewability, fill rate, or revenue.
 * `seen` belongs to the mounted slot so effect replays cannot repeat events.
 * No retries, polling, storage, ad requests, or provider/visitor IDs.
 */
export function observeAdSlot(script, container, seen) {
  if (!script || !container) return () => {};
  const doc = container.ownerDocument;
  const view = doc.defaultView;
  let active = true;
  let mutations;
  let visibility;
  let size;

  const emit = (state) => {
    if (!active || seen.has(state)) return;
    seen.add(state);
    // Fixed enums only. Missing/blocked Umami is deliberately not retried.
    track('ad-slot-diagnostic', { slot: 'dashboard-native', state });
  };
  const onLoad = () => emit('script-ready');
  const onError = () => emit('script-error');
  script.addEventListener('load', onLoad);
  script.addEventListener('error', onError);

  const onTabVisible = () => {
    if (active && doc.visibilityState === 'visible' && visibility) {
      // Ask for fresh geometry rather than reusing a hidden tab's old entry.
      visibility.unobserve(container);
      visibility.observe(container);
    }
  };
  const stopVisibility = () => {
    visibility?.disconnect();
    visibility = null;
    size?.disconnect();
    size = null;
    doc.removeEventListener('visibilitychange', onTabVisible);
  };
  const watchVisibility = () => {
    if (seen.has('slot-visible') || visibility || !view?.IntersectionObserver) return;
    try {
      visibility = new view.IntersectionObserver((entries) => {
        if (!active || doc.visibilityState !== 'visible') return;
        if (entries.some((entry) => entry.target === container && entry.isIntersecting
          && entry.intersectionRatio >= 0.5
          && entry.boundingClientRect.width > 0 && entry.boundingClientRect.height > 0)) {
          emit('slot-visible');
          stopVisibility();
        }
      }, { threshold: 0.5 });
      visibility.observe(container);
      doc.addEventListener('visibilitychange', onTabVisible);
    } catch {
      // Unsupported/broken observer must not affect ad loading or the page.
      stopVisibility();
      return;
    }
    // A zero-area wrapper and the fully visible content it later contains
    // can both have IO ratio=1. Size changes need a fresh initial IO record.
    if (view.ResizeObserver) {
      try {
        size = new view.ResizeObserver(onTabVisible);
        size.observe(container);
      } catch {
        size?.disconnect();
        size = null;
      }
    }
  };
  const checkContainer = () => {
    if (!active) return;
    // A wrapper/iframe is enough for this structural signal. Its content is
    // never inspected; a wrapper does not establish that an ad was served.
    if (!container.querySelector(':scope > :not(script):not(style):not(link)')) return;
    emit('container-populated');
    mutations?.disconnect();
    watchVisibility();
  };
  if (view?.MutationObserver) {
    try {
      mutations = new view.MutationObserver(checkContainer);
      mutations.observe(container, { childList: true });
    } catch {
      mutations?.disconnect();
    }
  }
  checkContainer();

  return () => {
    active = false;
    script.removeEventListener('load', onLoad);
    script.removeEventListener('error', onError);
    mutations?.disconnect();
    stopVisibility();
  };
}
