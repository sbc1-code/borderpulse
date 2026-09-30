import { CBP_URL, createCbpPayload } from '../../scripts/fetch-cbp.mjs';

// Serve one official snapshot from the CDN for five minutes. The frontend
// keeps its last good response and can fall back to the static Pages feed.
export const config = { maxDuration: 10 };

function reply(res, status, body, cache = false) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cache ? 'public, max-age=0, must-revalidate' : 'no-store');
  if (cache) {
    res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  }
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return reply(res, 405, { error: 'Method not allowed' });

  try {
    const upstream = await fetch(CBP_URL, {
      headers: { 'User-Agent': 'borderpulse.com/1.0 (live-data-cache)' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!upstream.ok) throw new Error(`CBP source returned ${upstream.status}`);
    const payload = createCbpPayload(await upstream.json());
    return reply(res, 200, payload, true);
  } catch (error) {
    console.error('[public-crossings]', error);
    return reply(res, 502, { error: 'Official CBP data is temporarily unavailable' });
  }
}
