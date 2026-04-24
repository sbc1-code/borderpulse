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

async function main() {
  const buildSlugMap = await loadSlugBuilder();
  const dataPath = path.resolve(root, 'public/data/crossings.json');
  const doc = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const crossings = doc.crossings || [];
  const { portToSlug } = buildSlugMap(crossings);
  const today = new Date().toISOString().slice(0, 10);

  const urls = [
    { loc: `${BASE}/`, changefreq: 'hourly', priority: '1.0', lastmod: today },
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
  }

  const posts = readBlogPosts();
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
      urls.push({
        loc: `${BASE}/blog/${p.slug}`,
        changefreq: 'monthly',
        priority: '0.6',
        lastmod: p.updated || p.date,
      });
    }
  }

  const body = urls
    .map(
      (u) => `  <url>
    <loc>${esc(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

  const outPublic = path.resolve(root, 'public/sitemap.xml');
  fs.writeFileSync(outPublic, xml);
  const outDist = path.resolve(root, 'dist/sitemap.xml');
  if (fs.existsSync(path.dirname(outDist))) fs.writeFileSync(outDist, xml);

  console.log(`[sitemap] wrote ${urls.length} URLs (${posts.length} blog)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
