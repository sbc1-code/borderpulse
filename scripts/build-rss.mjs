import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const BASE = 'https://borderpulse.com';

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toIso(date) {
  return new Date(`${date}T12:00:00Z`).toISOString();
}

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

function readAuthors() {
  const p = path.resolve(root, 'src/content/authors.json');
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return {};
  }
}

async function main() {
  const posts = readBlogPosts();
  const authors = readAuthors();

  if (posts.length === 0) {
    console.log('[rss] no posts, skipping');
    return;
  }

  const lastBuild = posts.reduce((acc, p) => {
    const d = p.updated || p.date;
    return d > acc ? d : acc;
  }, posts[0].updated || posts[0].date);

  const entries = posts
    .map((p) => {
      const url = `${BASE}/blog/${p.slug}`;
      const author = authors[p.author];
      return `  <entry>
    <title>${esc(p.title)}</title>
    <link href="${esc(url)}" />
    <id>${esc(url)}</id>
    <updated>${toIso(p.updated || p.date)}</updated>
    <published>${toIso(p.date)}</published>
    <summary>${esc(p.description)}</summary>
    <author>
      <name>${esc(author?.name || p.author)}</name>
    </author>
  </entry>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Border Pulse Blog</title>
  <link href="${BASE}/blog" />
  <link rel="self" href="${BASE}/rss.xml" />
  <id>${BASE}/blog</id>
  <updated>${toIso(lastBuild)}</updated>
  <subtitle>Crossing data, guides, and program explainers for the U.S.-Mexico border.</subtitle>
${entries}
</feed>
`;

  fs.writeFileSync(path.resolve(root, 'public/rss.xml'), xml);
  const distRss = path.resolve(root, 'dist/rss.xml');
  if (fs.existsSync(path.dirname(distRss))) fs.writeFileSync(distRss, xml);

  console.log(`[rss] wrote ${posts.length} entries`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
