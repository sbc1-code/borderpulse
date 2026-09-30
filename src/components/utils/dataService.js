/**
 * dataService - reads the cached official-data endpoint on Vercel, with the
 * GitHub Action's static JSON snapshot as a fallback. Pages uses static data.
 */
import { buildSlugMap } from '../../lib/slugs.js';

const DATA_PATH = '/data/crossings.json';
const LIVE_DATA_PATH = '/api/public/crossings';
const FX_PATH = '/data/exchange-rate.json';
const SB_PATH = '/data/crossings-sb.json';

function validateSnapshot(doc) {
  if (!Array.isArray(doc?.crossings) || !doc.crossings.length
    || !Number.isFinite(Date.parse(doc.fetched_at))
    || Date.parse(doc.fetched_at) > Date.now() + 5 * 60_000
    || doc.crossings.some(row => !row?.port_number)) {
    throw new Error('Invalid CBP snapshot');
  }
  return doc;
}

function mergeSouthbound(crossingsDoc, sbDoc) {
  const crossings = Array.isArray(crossingsDoc?.crossings) ? crossingsDoc.crossings : [];
  const southboundRows = Array.isArray(sbDoc?.crossings) ? sbDoc.crossings : [];
  const southboundByPort = new Map(
    southboundRows.map((row) => [String(row.port_number), row]),
  );
  const { portToSlug } = buildSlugMap(crossings);

  return crossings.map((crossing) => {
    const southbound = southboundByPort.get(String(crossing.port_number));
    const northboundWait = typeof crossing.current_wait_time === 'number'
      ? crossing.current_wait_time
      : null;

    return {
      ...crossing,
      slug: portToSlug[crossing.port_number] || null,
      northbound_wait_time: northboundWait,
      southbound_wait_time: typeof southbound?.southbound_wait_time === 'number'
        ? southbound.southbound_wait_time
        : null,
      southbound_status: southbound?.status || null,
      southbound_updated_at: southbound?.updated_at || sbDoc?.fetched_at || null,
      southbound_live_route_minutes: southbound?.live_route_minutes ?? null,
      southbound_free_flow_minutes: southbound?.free_flow_minutes ?? null,
      southbound_route_origin: southbound?.route_origin || null,
      southbound_route_destination: southbound?.route_destination || null,
      southbound_methodology: southbound?.methodology || sbDoc?.note || null,
    };
  });
}

export class DataService {
  constructor({ liveApi = import.meta.env?.VITE_PUBLIC_CBP_API === 'true' } = {}) {
    this.liveApi = liveApi;
    this.listeners = new Set();
    this.cache = null;
    this.refreshTimer = null;
  }

  addListener(fn) { this.listeners.add(fn); }
  removeListener(fn) { this.listeners.delete(fn); }
  notify(payload) {
    for (const fn of this.listeners) {
      try { fn(payload); } catch (e) { console.warn('listener failed', e); }
    }
  }

  async fetchJson(path) {
    const res = await fetch(`${path}?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(12_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
    return res.json();
  }

  async fetchCrossingsDoc() {
    if (this.liveApi) {
      try {
        // No cache-busting query: Vercel's five-minute CDN cache is deliberate.
        const res = await fetch(LIVE_DATA_PATH, { signal: AbortSignal.timeout(12_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${LIVE_DATA_PATH}`);
        return { doc: validateSnapshot(await res.json()), fromFallback: false };
      } catch (error) {
        console.warn('[dataService] live CBP endpoint failed; using published snapshot', error);
        return { doc: validateSnapshot(await this.fetchJson(DATA_PATH)), fromFallback: true };
      }
    }
    return { doc: validateSnapshot(await this.fetchJson(DATA_PATH)), fromFallback: false };
  }

  async getBorderData() {
    try {
      const [crossingsResult, fxDoc, sbDoc] = await Promise.all([
        this.fetchCrossingsDoc(),
        this.fetchJson(FX_PATH).catch(() => null),
        this.fetchJson(SB_PATH).catch(() => null),
      ]);
      const { doc: crossingsDoc, fromFallback } = crossingsResult;
      if (this.cache && Date.parse(crossingsDoc.fetched_at) < Date.parse(this.cache.timestamp)) {
        const retained = { ...this.cache, success: false, fromFallback: true };
        this.notify(retained);
        return retained;
      }
      const crossings = mergeSouthbound(crossingsDoc, sbDoc);
      const payload = {
        success: true,
        crossings,
        exchange_rate: fxDoc || null,
        timestamp: crossingsDoc.fetched_at,
        source: crossingsDoc?.source || 'CBP',
        southbound_source: sbDoc?.source || null,
        southbound_timestamp: sbDoc?.fetched_at || null,
        southbound_note: sbDoc?.note || null,
        fromFallback,
      };
      this.cache = payload;
      this.notify(payload);
      return payload;
    } catch (err) {
      console.warn('[dataService] fetch failed', err);
      // Preserve the last successful snapshot and its real timestamp. A failed
      // connection must not erase usable data or make it appear freshly fetched.
      const fallback = this.cache
        ? { ...this.cache, success: false, fromFallback: true }
        : this.getFallbackData();
      this.notify(fallback);
      return fallback;
    }
  }

  async refreshBorderData() { return this.getBorderData(); }
  getFallbackData() { return { success: false, crossings: [], exchange_rate: null, timestamp: null, source: 'fallback', fromFallback: true }; }

  startAutoRefresh(intervalMs = 15 * 60 * 1000) {
    if (this.refreshTimer) return;
    this.refreshTimer = setInterval(() => this.getBorderData(), intervalMs);
  }
  stopAutoRefresh() {
    if (this.refreshTimer) { clearInterval(this.refreshTimer); this.refreshTimer = null; }
  }
}

export const dataService = new DataService();
