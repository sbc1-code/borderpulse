import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasPedestrianLane } from '../src/lib/crossingAvailability.js';
import { COMPARE_PAIRS } from '../src/lib/comparePairs.js';
import { laneFlipEntries } from '../src/lib/laneFlips.js';

import { homeHreflangs } from '../src/lib/hreflang.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function loadSlugBuilder() {
  const mod = await import(path.resolve(root, 'src/lib/slugs.js'));
  return mod.buildSlugMap;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const BASE = 'https://borderpulse.com';

function readBlogPosts() {
  const indexPath = path.resolve(root, 'public/data/blog/index.json');
  if (!fs.existsSync(indexPath)) return [];
  try {
    const doc = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    return doc.posts || [];
  } catch {
    return [];
  }
}

function findTwins(posts) {
  // For each translationKey, build a map of lang -> slug.
  const byKey = {};
  for (const p of posts) {
    if (!p.translationKey) continue;
    if (!byKey[p.translationKey]) byKey[p.translationKey] = {};
    byKey[p.translationKey][p.lang] = p.slug;
  }
  return byKey;
}

async function main() {
  const buildSlugMap = await loadSlugBuilder();
  const dataPath = path.resolve(root, 'public/data/crossings.json');
  const doc = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const crossings = doc.crossings || [];
  const { portToSlug } = buildSlugMap(crossings);
  const today = new Date().toISOString().slice(0, 10);

  const methodologyAlternates = [
    { lang: 'en', href: `${BASE}/methodology/` },
    { lang: 'es', href: `${BASE}/metodologia/` },
    { lang: 'x-default', href: `${BASE}/methodology/` },
  ];
  const privacyAlternates = [
    { lang: 'en', href: `${BASE}/privacy/` },
    { lang: 'es', href: `${BASE}/privacidad/` },
    { lang: 'x-default', href: `${BASE}/privacy/` },
  ];
  const featureAlternates = [
    { lang: 'en', href: `${BASE}/feature-your-business/` },
    { lang: 'es', href: `${BASE}/anunciate/` },
    { lang: 'x-default', href: `${BASE}/feature-your-business/` },
  ];
  const urls = [
    { loc: `${BASE}/`, changefreq: 'hourly', priority: '1.0', lastmod: today, alternates: homeHreflangs() },
    { loc: `${BASE}/es/`, changefreq: 'hourly', priority: '0.9', lastmod: today, alternates: homeHreflangs() },
    { loc: `${BASE}/about/`, changefreq: 'monthly', priority: '0.5', lastmod: today },
    { loc: `${BASE}/best-time/`, changefreq: 'daily', priority: '0.7', lastmod: today },
    { loc: `${BASE}/privacy/`, changefreq: 'yearly', priority: '0.2', lastmod: today, alternates: privacyAlternates },
    { loc: `${BASE}/privacidad/`, changefreq: 'yearly', priority: '0.2', lastmod: today, alternates: privacyAlternates },
    { loc: `${BASE}/methodology/`, changefreq: 'monthly', priority: '0.5', lastmod: today, alternates: methodologyAlternates },
    { loc: `${BASE}/metodologia/`, changefreq: 'monthly', priority: '0.5', lastmod: today, alternates: methodologyAlternates },
    { loc: `${BASE}/feature-your-business/`, changefreq: 'monthly', priority: '0.4', lastmod: today, alternates: featureAlternates },
    { loc: `${BASE}/anunciate/`, changefreq: 'monthly', priority: '0.4', lastmod: today, alternates: featureAlternates },
  ];
  const { CITIES } = await import('../src/lib/sponsors.js');
  for (const city of CITIES) {
    const alternates = [
      { lang: 'en', href: `${BASE}/city/${city.id}/` },
      { lang: 'es', href: `${BASE}/ciudad/${city.id}/` },
      { lang: 'x-default', href: `${BASE}/city/${city.id}/` },
    ];
    urls.push({ loc: `${BASE}/city/${city.id}/`, changefreq: 'weekly', priority: '0.6', lastmod: today, alternates });
    urls.push({ loc: `${BASE}/ciudad/${city.id}/`, changefreq: 'weekly', priority: '0.6', lastmod: today, alternates });
  }
  for (const c of crossings) {
    const slug = portToSlug[c.port_number];
    if (!slug) continue;
    urls.push({
      loc: `${BASE}/crossing/${slug}/`,
      changefreq: 'hourly',
      priority: '0.9',
      lastmod: today,
    });
    urls.push({
      loc: `${BASE}/best-time/${slug}/`,
      changefreq: 'daily',
      priority: '0.7',
      lastmod: today,
    });
  }

  const knownSlugs = new Set(Object.values(portToSlug));
  for (const [a, b] of COMPARE_PAIRS) {
    if (!knownSlugs.has(a) || !knownSlugs.has(b)) continue;
    urls.push({
      loc: `${BASE}/compare/${a}-vs-${b}/`,
      changefreq: 'daily',
      priority: '0.6',
      lastmod: today,
    });
  }

  let laneFlipCount = 0;
  urls.push({ loc: `${BASE}/lane-flip/`, changefreq: 'hourly', priority: '0.7', lastmod: today });
  const laneFlipPath = path.resolve(root, 'public/data/lane-flips.json');
  if (fs.existsSync(laneFlipPath)) {
    try {
      const artifact = JSON.parse(fs.readFileSync(laneFlipPath, 'utf8'));
      for (const entry of laneFlipEntries(artifact)) {
        urls.push({
          loc: `${BASE}/lane-flip/${entry.slug}/`,
          changefreq: 'hourly',
          priority: '0.6',
          lastmod: today,
        });
        laneFlipCount += 1;
      }
    } catch {
      // A damaged summary still leaves the index URL in place.
    }
  }

  // Keep the sitemap in lockstep with the crossing-detail links and prerender.
  for (const c of crossings.filter(hasPedestrianLane)) {
    const slug = portToSlug[c.port_number];
    if (!slug) continue;
    urls.push({
      loc: `${BASE}/walk-or-drive/${slug}/`,
      changefreq: 'daily',
      priority: '0.6',
      lastmod: today,
    });
  }

  const posts = readBlogPosts();
  const twins = findTwins(posts);
  if (posts.length > 0) {
    urls.push({
      loc: `${BASE}/blog/`,
      changefreq: 'weekly',
      priority: '0.7',
      lastmod: posts.reduce((acc, p) => {
        const d = p.updated || p.date;
        return d > acc ? d : acc;
      }, posts[0].updated || posts[0].date),
    });
    for (const p of posts) {
      const url = {
        loc: `${BASE}/blog/${p.slug}/`,
        changefreq: 'monthly',
        priority: '0.6',
        lastmod: p.updated || p.date,
      };
      // Attach hreflang alternates if this post has a translation twin.
      if (p.translationKey && twins[p.translationKey]) {
        const pair = twins[p.translationKey];
        url.alternates = [];
        if (pair.en) url.alternates.push({ lang: 'en', href: `${BASE}/blog/${pair.en}/` });
        if (pair.es) url.alternates.push({ lang: 'es', href: `${BASE}/blog/${pair.es}/` });
        if (pair.en) url.alternates.push({ lang: 'x-default', href: `${BASE}/blog/${pair.en}/` });
      }
      urls.push(url);
    }
  }

  const body = urls
    .map((u) => {
      const alt = (u.alternates || [])
        .map((a) => `    <xhtml:link rel="alternate" hreflang="${esc(a.lang)}" href="${esc(a.href)}" />`)
        .join('\n');
      return `  <url>
    <loc>${esc(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>${alt ? '\n' + alt : ''}
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>
`;

  const outPublic = path.resolve(root, 'public/sitemap.xml');
  fs.writeFileSync(outPublic, xml);
  const outDist = path.resolve(root, 'dist/sitemap.xml');
  if (fs.existsSync(path.dirname(outDist))) fs.writeFileSync(outDist, xml);

  const pairCount = Object.values(twins).filter((t) => t.en && t.es).length;
  console.log(`[sitemap] wrote ${urls.length} URLs (${posts.length} blog, ${pairCount} bilingual pairs, ${laneFlipCount} lane flips)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
