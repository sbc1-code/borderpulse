import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { frontmatterSchema } from '../src/lib/blog-schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function loadCrossingSlugs() {
  const slugMod = await import(path.resolve(root, 'src/lib/slugs.js'));
  const dataPath = path.resolve(root, 'public/data/crossings.json');
  const doc = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const crossings = doc.crossings || [];
  const { portToSlug } = slugMod.buildSlugMap(crossings);
  return new Set(Object.values(portToSlug));
}

async function main() {
  const blogDir = path.resolve(root, 'src/content/blog');
  if (!fs.existsSync(blogDir)) {
    fs.mkdirSync(blogDir, { recursive: true });
  }

  const crossingSlugs = await loadCrossingSlugs();
  const files = fs.readdirSync(blogDir).filter((f) => f.endsWith('.mdx'));
  const posts = [];
  const seenSlugs = new Set();
  const errors = [];

  for (const file of files) {
    const fullPath = path.join(blogDir, file);
    const raw = fs.readFileSync(fullPath, 'utf8');
    const { data } = matter(raw);
    const fileSlug = file.replace(/\.mdx$/, '');

    const result = frontmatterSchema.safeParse(data);
    if (!result.success) {
      errors.push(`[${file}] ${JSON.stringify(result.error.flatten().fieldErrors)}`);
      continue;
    }
    const fm = result.data;
    if (fm.slug !== fileSlug) {
      errors.push(`[${file}] frontmatter.slug "${fm.slug}" must match filename "${fileSlug}"`);
      continue;
    }
    if (crossingSlugs.has(fm.slug)) {
      errors.push(`[${file}] slug "${fm.slug}" collides with a crossing slug. Pick a different slug.`);
      continue;
    }
    if (seenSlugs.has(fm.slug)) {
      errors.push(`[${file}] duplicate slug "${fm.slug}"`);
      continue;
    }
    seenSlugs.add(fm.slug);
    if (fm.draft) continue;
    // Hard gate: any AI-sourced post in the data-analysis pillar must be human-edited.
    if (fm.pillar === 'data-analysis' && fm.source && fm.source !== 'human' && !fm.humanEdited) {
      errors.push(`[${file}] pillar "data-analysis" with source "${fm.source}" requires humanEdited: true before publish.`);
      continue;
    }
    posts.push(fm);
  }

  if (errors.length) {
    console.error('[blog-index] frontmatter errors:');
    for (const e of errors) console.error('  ' + e);
    process.exit(1);
  }

  posts.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));

  const tags = {};
  for (const p of posts) {
    for (const t of p.tags || []) {
      tags[t] = (tags[t] || 0) + 1;
    }
  }

  const outDir = path.resolve(root, 'public/data/blog');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.resolve(outDir, 'index.json'),
    JSON.stringify({ posts, generated_at: new Date().toISOString() }, null, 2),
  );
  fs.writeFileSync(
    path.resolve(outDir, 'tags.json'),
    JSON.stringify({ tags, generated_at: new Date().toISOString() }, null, 2),
  );

  console.log(`[blog-index] wrote ${posts.length} posts, ${Object.keys(tags).length} tags`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
