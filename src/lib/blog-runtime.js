import authors from '@/content/authors.json';

const modules = import.meta.glob('/src/content/blog/*.mdx', { eager: true });

function buildPosts() {
  return Object.entries(modules)
    .map(([filepath, mod]) => {
      const fm = mod.frontmatter || {};
      const fileSlug = filepath.split('/').pop().replace(/\.mdx$/, '');
      return {
        slug: fm.slug || fileSlug,
        Component: mod.default,
        frontmatter: fm,
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

export function pillarLabel(pillar) {
  switch (pillar) {
    case 'data-analysis':
      return 'Data';
    case 'crossing-guides':
      return 'Crossing guides';
    case 'policy-programs':
      return 'Programs';
    case 'traveler-tips':
      return 'Traveler tips';
    default:
      return pillar;
  }
}
