import authors from '@/content/authors.json';
import { slugifyHeading } from '@/lib/headingSlug';

const modules = import.meta.glob('/src/content/blog/*.mdx', { eager: true });
// Raw text alongside the compiled MDX modules — lets us compute reading time
// and a table of contents without rendering. Vite's `?raw` query gives us
// the file contents as a string; `import: 'default'` collapses the module
// shape to the string itself.
const rawModules = import.meta.glob('/src/content/blog/*.mdx', {
  eager: true,
  query: '?raw',
  import: 'default',
});

function stripFrontmatter(raw) {
  return String(raw || '').replace(/^---[\s\S]*?---\s*/, '');
}

function stripCodeBlocks(raw) {
  return String(raw || '').replace(/```[\s\S]*?```/g, '');
}

function wordCount(str) {
  return (String(str || '').match(/\b\w+\b/g) || []).length;
}

// 220 wpm sits between "skimming long-form" (250) and "careful reading" (180).
// Reasonable middle ground for the audience here.
function computeReadingTimeMin(raw) {
  const body = stripCodeBlocks(stripFrontmatter(raw));
  // Strip JSX-ish tags so <BestTimeChart /> etc. don't get counted as words.
  const text = body.replace(/<[^>]+>/g, ' ');
  return Math.max(1, Math.round(wordCount(text) / 220));
}

// Parses raw markdown for `^## ` lines (skipping fenced code blocks). Each
// entry returns {text, id} where id matches the heading slug emitted by the
// MDX h2 component, so TOC anchors are guaranteed to resolve.
function buildToc(raw) {
  const body = stripCodeBlocks(stripFrontmatter(raw));
  const items = [];
  for (const line of body.split('\n')) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (!m) continue;
    // Strip wrapping quotes that frontmatter-style headings sometimes carry.
    const text = m[1].replace(/^["'](.+)["']$/, '$1').trim();
    items.push({ text, id: slugifyHeading(text) });
  }
  return items;
}

function buildPosts() {
  return Object.entries(modules)
    .map(([filepath, mod]) => {
      const fm = mod.frontmatter || {};
      const fileSlug = filepath.split('/').pop().replace(/\.mdx$/, '');
      const raw = rawModules[filepath] || '';
      return {
        slug: fm.slug || fileSlug,
        Component: mod.default,
        frontmatter: fm,
        readingTimeMin: computeReadingTimeMin(raw),
        toc: buildToc(raw),
      };
    })
    .filter((p) => p.frontmatter && !p.frontmatter.draft)
    .sort((a, b) => {
      const da = a.frontmatter.date || '';
      const db = b.frontmatter.date || '';
      return db.localeCompare(da);
    });
}

const posts = buildPosts();

export function listPosts({ lang = 'en' } = {}) {
  return posts.filter((p) => p.frontmatter.lang === lang);
}

export function getPost(slug) {
  return posts.find((p) => p.slug === slug) || null;
}

export function getAuthor(id) {
  return authors[id] || { id, name: id };
}

// Related posts: same language, scored by (pillar match × 3) + tag overlap.
// Excludes the current post. Ties broken by recency. Returns up to `limit`.
export function getRelatedPosts(slug, { limit = 3 } = {}) {
  const current = getPost(slug);
  if (!current) return [];
  const lang = current.frontmatter.lang || 'en';
  const pillar = current.frontmatter.pillar;
  const tags = new Set(current.frontmatter.tags || []);

  return posts
    .filter((p) => p.slug !== slug)
    .filter((p) => (p.frontmatter.lang || 'en') === lang)
    .map((p) => {
      let score = 0;
      if (p.frontmatter.pillar && p.frontmatter.pillar === pillar) score += 3;
      for (const tag of (p.frontmatter.tags || [])) {
        if (tags.has(tag)) score += 1;
      }
      return { post: p, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const da = a.post.frontmatter.date || '';
      const db = b.post.frontmatter.date || '';
      return db.localeCompare(da);
    })
    .slice(0, limit)
    .map(({ post }) => post);
}

const PILLAR_LABELS = {
  en: {
    'data-analysis': 'Data',
    'crossing-guides': 'Crossing guides',
    'policy-programs': 'Programs',
    'traveler-tips': 'Traveler tips',
  },
  es: {
    'data-analysis': 'Datos',
    'crossing-guides': 'Guías de cruce',
    'policy-programs': 'Programas',
    'traveler-tips': 'Consejos de viaje',
  },
};

export function pillarLabel(pillar, lang = 'en') {
  const dict = PILLAR_LABELS[lang] || PILLAR_LABELS.en;
  return dict[pillar] || pillar;
}
