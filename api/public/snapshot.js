import { CBP_URL, createCbpPayload } from '../../scripts/fetch-cbp.mjs';
import { snapshotDocument } from '../../scripts/lib/crossing-snapshot-html.mjs';

// HTML form of the cached official snapshot. The no-JS home frame uses it so
// the published table is not stuck on the last full site build. Same five
// minute CDN window as /api/public/crossings.
export const config = { maxDuration: 10 };

function send(res, status, body, cache = false) {
  res.status(status);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', cache ? 'public, max-age=0, must-revalidate' : 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (cache) {
    res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  }
  res.end(body);
}

function requestedLang(req) {
  const fromQuery = req.query?.lang;
  if (fromQuery === 'es' || fromQuery === 'en') return fromQuery;
  try {
    return new URL(req.url || '/', 'https://borderpulse.com').searchParams.get('lang') === 'es' ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, 'Method not allowed');
  const lang = requestedLang(req);
  try {
    const upstream = await fetch(CBP_URL, {
      headers: { 'User-Agent': 'borderpulse.com/1.0 (snapshot-cache)' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!upstream.ok) throw new Error(`CBP source returned ${upstream.status}`);
    const payload = createCbpPayload(await upstream.json());
    return send(res, 200, snapshotDocument(payload, { lang, framed: true }), true);
  } catch (error) {
    console.error('[public-snapshot]', error);
    const host = req.headers?.host;
    if (host) {
      try {
        const bundled = await fetch(`https://${host}/data/crossings.json`, { signal: AbortSignal.timeout(8_000) });
        if (bundled.ok) {
          const payload = await bundled.json();
          return send(res, 200, snapshotDocument(payload, { lang, framed: true }), false);
        }
      } catch (fallbackError) {
        console.error('[public-snapshot] bundled fallback', fallbackError);
      }
    }
    return send(res, 502, 'Official CBP data is temporarily unavailable');
  }
}
