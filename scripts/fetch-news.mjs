import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import Parser from 'rss-parser';
import { FEEDS, SUMMARY_MAX_CHARS } from './lib/feed-sources.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Strip HTML tags and collapse whitespace. Guards against feeds that
// return HTML in <description>.
function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Truncate at SUMMARY_MAX_CHARS, breaking on a word boundary when possible.
function truncateSummary(s) {
  const clean = stripHtml(s);
  if (clean.length <= SUMMARY_MAX_CHARS) return clean;
  const cut = clean.slice(0, SUMMARY_MAX_CHARS);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > SUMMARY_MAX_CHARS * 0.6) {
    return cut.slice(0, lastSpace) + '...';
  }
  return cut + '...';
}

// Normalize URL for dedup. Removes common tracking params.
function normalizeUrl(u) {
  try {
    const url = new URL(u);
    const trackers = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
    for (const t of trackers) url.searchParams.delete(t);
    return url.toString().replace(/#.*$/, '');
  } catch {
    return u;
  }
}

function itemId(item) {
  const basis = item.guid || item.link || item.title || '';
  return crypto.createHash('sha1').update(basis).digest('hex').slice(0, 12);
}

// Some feeds (notably WordPress security-alert variants) emit malformed XML.
// Pre-clean common culprits before parsing so one busted feed does not take
// down the whole run.
function preCleanXml(xml) {
  return xml
    .replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

async function fetchFeed(parser, feed) {
  try {
    let parsed;
    try {
      parsed = await parser.parseURL(feed.url);
    } catch (parseErr) {
      // Retry with manual fetch + pre-cleanup for feeds with broken entities.
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'BorderPulseCurationBot/1.0 (+https://borderpulse.com)' },
      });
      if (!res.ok) throw parseErr;
      const xml = await res.text();
      parsed = await parser.parseString(preCleanXml(xml));
    }
    const items = (parsed.items || []).slice(0, 25).map((item) => ({
      id: itemId(item),
      source_id: feed.id,
      source_name: feed.name,
      source_category: feed.category,
      title: stripHtml(item.title),
      url: normalizeUrl(item.link),
      summary: truncateSummary(item.contentSnippet || item.content || item.summary || item.description || ''),
      published_at: item.isoDate || item.pubDate || null,
    }));
    return { ok: true, items, feed_id: feed.id };
  } catch (err) {
    return { ok: false, items: [], feed_id: feed.id, error: err.message };
  }
}

async function main() {
  const parser = new Parser({
    timeout: 15000,
    headers: {
      'User-Agent': 'BorderPulseCurationBot/1.0 (+https://borderpulse.com)',
    },
  });

  const results = await Promise.all(FEEDS.map((f) => fetchFeed(parser, f)));

  const allItems = [];
  const feedHealth = [];
  for (const r of results) {
    feedHealth.push({ feed_id: r.feed_id, ok: r.ok, count: r.items.length, error: r.error });
    if (r.ok) allItems.push(...r.items);
  }

  // Dedup by normalized URL across feeds.
  const byUrl = new Map();
  for (const item of allItems) {
    if (!item.url) continue;
    const existing = byUrl.get(item.url);
    if (!existing || (item.published_at && item.published_at > (existing.published_at || ''))) {
      byUrl.set(item.url, item);
    }
  }

  const deduped = Array.from(byUrl.values()).sort((a, b) => {
    const pa = a.published_at || '';
    const pb = b.published_at || '';
    return pb.localeCompare(pa);
  });

  const outDir = path.resolve(root, 'drafts/curation');
  fs.mkdirSync(outDir, { recursive: true });
  const out = {
    generated_at: new Date().toISOString(),
    feed_health: feedHealth,
    total_items: deduped.length,
    items: deduped,
  };
  fs.writeFileSync(path.resolve(outDir, 'latest-feed.json'), JSON.stringify(out, null, 2));

  const failing = feedHealth.filter((f) => !f.ok);
  console.log(`[fetch-news] ${deduped.length} deduped items from ${FEEDS.length} feeds.`);
  for (const f of feedHealth) {
    const marker = f.ok ? 'OK' : 'FAIL';
    console.log(`  [${marker}] ${f.feed_id}: ${f.count} items${f.error ? ` (${f.error})` : ''}`);
  }

  if (failing.length === FEEDS.length) {
    console.error('[fetch-news] ALL feeds failed. Likely network issue. Exiting non-zero.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
