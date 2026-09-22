import { CBP_URL, createCbpPayload } from '../../scripts/fetch-cbp.mjs';
import { HttpError, methodGuard } from '../_lib/http.js';

// This endpoint is intentionally public and has no account or provider
// dependency. Vercel's CDN caches one official snapshot for five minutes and
// may briefly serve the prior healthy result while it refreshes. That removes
// GitHub Actions scheduling gaps from the live crossing-decision path without
// introducing a database, cron, or paid data source.
const CDN_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600';

export const config = { maxDuration: 10 };

function writeJson(res, status, body, { cache = false } = {}) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (cache) {
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.setHeader('Vercel-CDN-Cache-Control', CDN_CACHE_CONTROL);
    res.setHeader('CDN-Cache-Control', CDN_CACHE_CONTROL);
  } else {
    res.setHeader('Cache-Control', 'no-store');
  }
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  try {
    methodGuard(req, ['GET']);
    const upstream = await fetch(CBP_URL, {
      headers: { 'User-Agent': 'borderpulse.com/1.0 (live-data-cache)' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!upstream.ok) throw new HttpError(502, `CBP source returned ${upstream.status}`);
    const payload = createCbpPayload(await upstream.json());
    writeJson(res, 200, payload, { cache: true });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 502;
    if (status >= 500) console.error('[public-crossings]', error.message);
    writeJson(res, status, { error: status >= 500 ? 'Official CBP data is temporarily unavailable' : error.message });
  }
}
