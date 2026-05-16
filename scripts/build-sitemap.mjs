import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

  // Bilingual page pairs with hreflang alternates so Google understands
  // /sobre is the Spanish twin of /about, etc.
  const aboutAlts = [
    { lang: 'en', href: `${BASE}/about` },
    { lang: 'es', href: `${BASE}/sobre` },
    { lang: 'x-default', href: `${BASE}/about` },
  ];
  const proAlts = [
    { lang: 'en', href: `${BASE}/pro` },
    { lang: 'es', href: `${BASE}/pro-es` },
    { lang: 'x-default', href: `${BASE}/pro` },
  ];

  const urls = [
    { loc: `${BASE}/`, changefreq: 'hourly', priority: '1.0', lastmod: today },
    { loc: `${BASE}/api`, changefreq: 'monthly', priority: '0.5', lastmod: today },
    { loc: `${BASE}/about`, changefreq: 'monthly', priority: '0.5', lastmod: today, alternates: aboutAlts },
    { loc: `${BASE}/sobre`, changefreq: 'monthly', priority: '0.5', lastmod: today, alternates: aboutAlts },
    { loc: `${BASE}/pro`, changefreq: 'monthly', priority: '0.6', lastmod: today, alternates: proAlts },
    { loc: `${BASE}/pro-es`, changefreq: 'monthly', priority: '0.6', lastmod: today, alternates: proAlts },
    { loc: `${BASE}/best-time`, changefreq: 'daily', priority: '0.7', lastmod: today },
  ];
  for (const c of crossings) {
    const slug = portToSlug[c.port_number];
    if (!slug) continue;
    urls.push({
      loc: `${BASE}/crossing/${slug}`,
      changefreq: 'hourly',
      priority: '0.9',
      lastmod: today,
    });
    urls.push({
      loc: `${BASE}/best-time/${slug}`,
      changefreq: 'daily',
      priority: '0.7',
      lastmod: today,
    });
  }

  // Compare pages — kept in sync with the COMPARE_PAIRS list in
  // scripts/prerender.mjs. Update both when adding/removing pairs.
  const COMPARE_PAIRS = [
    ['san-ysidro', 'otay-mesa'],
    ['san-ysidro', 'tecate'],
    ['otay-mesa', 'tecate'],
    ['el-paso-paso-del-norte-pdn', 'el-paso-bridge-of-the-americas-bota'],
    ['el-paso-paso-del-norte-pdn', 'el-paso-ysleta'],
    ['hidalgo-pharr-hidalgo', 'hidalgo-pharr-pharr'],
    ['hidalgo-pharr-hidalgo', 'hidalgo-pharr-anzalduas-international-bridge'],
    ['nogales-deconcini', 'nogales-mariposa'],
    ['calexico-west', 'calexico-east'],
    ['eagle-pass-bridge-i', 'eagle-pass-bridge-ii'],
    ['brownsville-gateway', 'brownsville-veterans-international'],
    ['brownsville-gateway', 'brownsville-b-and-m'],
    ['brownsville-veterans-international', 'brownsville-los-indios'],
    ['laredo-bridge-i', 'laredo-bridge-ii'],
    ['progreso-progreso-international-bridge', 'progreso-donna-international-bridge'],
  ];
  const knownSlugs = new Set(Object.values(portToSlug));
  for (const [a, b] of COMPARE_PAIRS) {
    if (!knownSlugs.has(a) || !knownSlugs.has(b)) continue;
    urls.push({
      loc: `${BASE}/compare/${a}-vs-${b}`,
      changefreq: 'daily',
      priority: '0.6',
      lastmod: today,
    });
  }

  // /walk-or-drive/<slug> seeds — kept in sync with WALK_OR_DRIVE_SLUGS
  // in scripts/prerender.mjs. Update both when adding a slug.
  const WALK_OR_DRIVE_SLUGS = [
    'san-ysidro',
    'otay-mesa',
    'el-paso-bridge-of-the-americas-bota',
    'el-paso-paso-del-norte-pdn',
    'hidalgo-pharr-hidalgo',
    'calexico-west',
    'calexico-east',
    'brownsville-gateway',
    'brownsville-b-and-m',
    'nogales-deconcini',
    'nogales-mariposa',
    'tecate',
    'san-luis-san-luis-i',
    'santa-teresa-santa-teresa-port-of-entry',
  ];
  for (const slug of WALK_OR_DRIVE_SLUGS) {
    if (!knownSlugs.has(slug)) continue;
    urls.push({
      loc: `${BASE}/walk-or-drive/${slug}`,
      changefreq: 'daily',
      priority: '0.6',
      lastmod: today,
    });
  }

  const posts = readBlogPosts();
  const twins = findTwins(posts);
  if (posts.length > 0) {
    urls.push({
      loc: `${BASE}/blog`,
      changefreq: 'weekly',
      priority: '0.7',
      lastmod: posts.reduce((acc, p) => {
        const d = p.updated || p.date;
        return d > acc ? d : acc;
      }, posts[0].updated || posts[0].date),
    });
    for (const p of posts) {
      const url = {
        loc: `${BASE}/blog/${p.slug}`,
        changefreq: 'monthly',
        priority: '0.6',
        lastmod: p.updated || p.date,
      };
      // Attach hreflang alternates if this post has a translation twin.
      if (p.translationKey && twins[p.translationKey]) {
        const pair = twins[p.translationKey];
        url.alternates = [];
        if (pair.en) url.alternates.push({ lang: 'en', href: `${BASE}/blog/${pair.en}` });
        if (pair.es) url.alternates.push({ lang: 'es', href: `${BASE}/blog/${pair.es}` });
        if (pair.en) url.alternates.push({ lang: 'x-default', href: `${BASE}/blog/${pair.en}` });
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
  console.log(`[sitemap] wrote ${urls.length} URLs (${posts.length} blog, ${pairCount} bilingual pairs)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
