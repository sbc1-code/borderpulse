import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const BASE = 'https://borderpulse.com';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function faqItems(crossing, aggregate) {
  const name = crossing.name;
  const hours = crossing.hours || 'check official CBP hours';
  const items = [
    {
      q: `What are the current wait times at ${name}?`,
      a: `Border Pulse pulls the latest wait time for ${name} from U.S. Customs and Border Protection every 15 minutes.`,
    },
    {
      q: `What hours is ${name} open?`,
      a: `Official hours posted by CBP: ${hours}. Hours can change on U.S. federal holidays.`,
    },
  ];
  if (aggregate && aggregate.overall_best_hour != null) {
    items.push({
      q: `What is the best time to cross at ${name}?`,
      a: `Based on the last 30 days of CBP data, the lightest typical wait at ${name} is around hour ${aggregate.overall_best_hour} of the day (median ${aggregate.overall_best_median} min).`,
    });
  }
  return items;
}

function renderCrossingHead(crossing, slug, aggregate) {
  const title = `${crossing.name} wait times | Border Pulse`;
  const desc = `Live ${crossing.name} border wait times from U.S. Customs and Border Protection, refreshed every 15 minutes. Historical patterns, hours, and best times to cross.`;
  const canonical = `${BASE}/crossing/${slug}`;
  const ogImage = `${BASE}/og/${slug}.png`;

  const place = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: crossing.name,
    description: desc,
    url: canonical,
    address: {
      '@type': 'PostalAddress',
      addressRegion: crossing.state,
      addressCountry: 'US',
    },
  };

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems(crossing, aggregate).map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Border Pulse', item: BASE + '/' },
      { '@type': 'ListItem', position: 2, name: crossing.name, item: canonical },
    ],
  };

  return {
    title,
    desc,
    canonical,
    ogImage,
    jsonLd: [place, faq, breadcrumb],
  };
}

function renderBlogIndexHead(posts) {
  const title = 'Border Pulse Blog | Crossing data, guides, and program explainers';
  const desc = 'Data-driven guides to crossing the U.S.-Mexico border. Hour by hour patterns, neutral program explainers, and trip planning. Every program rule links to the official source.';
  const canonical = `${BASE}/blog`;
  const ogImage = `${BASE}/og-card.png`;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Border Pulse', item: BASE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: canonical },
    ],
  };

  const blogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Border Pulse Blog',
    url: canonical,
    description: desc,
    blogPost: posts.slice(0, 20).map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: `${BASE}/blog/${p.slug}`,
      datePublished: p.date,
      dateModified: p.updated || p.date,
    })),
  };

  return {
    title,
    desc,
    canonical,
    ogImage,
    jsonLd: [blogJsonLd, breadcrumb],
  };
}

function renderBlogPostHead(post, author, allPosts) {
  const title = `${post.title} | Border Pulse`;
  const desc = post.description;
  const canonical = `${BASE}/blog/${post.slug}`;
  const ogImage = post.ogImage || `${BASE}/og/blog/${post.slug}.png`;
  const datePublished = `${post.date}T12:00:00Z`;
  const dateModified = `${post.updated || post.date}T12:00:00Z`;

  // Build hreflang pairs if this post has a translation twin.
  const hreflangs = [];
  if (post.translationKey && allPosts) {
    const en = allPosts.find(
      (p) => p.translationKey === post.translationKey && p.lang === 'en',
    );
    const es = allPosts.find(
      (p) => p.translationKey === post.translationKey && p.lang === 'es',
    );
    if (en) hreflangs.push({ lang: 'en', href: `${BASE}/blog/${en.slug}` });
    if (es) hreflangs.push({ lang: 'es', href: `${BASE}/blog/${es.slug}` });
    if (en) hreflangs.push({ lang: 'x-default', href: `${BASE}/blog/${en.slug}` });
  }

  const blogPosting = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: desc,
    url: canonical,
    mainEntityOfPage: canonical,
    datePublished,
    dateModified,
    author: {
      '@type': 'Person',
      name: author?.name || post.author,
      url: author?.url,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Border Pulse',
      url: BASE,
      logo: { '@type': 'ImageObject', url: `${BASE}/favicon.svg` },
    },
    image: [ogImage],
    inLanguage: post.lang === 'es' ? 'es-MX' : 'en-US',
    keywords: (post.tags || []).join(', '),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Border Pulse', item: BASE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: canonical },
    ],
  };

  const jsonLd = [blogPosting, breadcrumb];

  if (post.officialSources && post.officialSources.length) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: post.title,
      url: canonical,
      isBasedOn: post.officialSources.map((s) => ({
        '@type': 'WebPage',
        name: s.label,
        url: s.url,
      })),
    });
  }

  return {
    title,
    desc,
    canonical,
    ogImage,
    jsonLd,
    hreflangs,
    articleMeta: {
      publishedTime: datePublished,
      modifiedTime: dateModified,
      author: author?.name || post.author,
      tags: post.tags || [],
    },
  };
}

function rewriteIndex(indexHtml, head) {
  let html = indexHtml;

  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${esc(head.title)}</title>`);

  if (/<meta\s+name=["']description["'][^>]*>/i.test(html)) {
    html = html.replace(
      /<meta\s+name=["']description["'][^>]*>/i,
      `<meta name="description" content="${esc(head.desc)}" />`,
    );
  } else {
    html = html.replace(
      /<\/head>/i,
      `  <meta name="description" content="${esc(head.desc)}" />\n  </head>`,
    );
  }

  if (/<link\s+rel=["']canonical["'][^>]*>/i.test(html)) {
    html = html.replace(
      /<link\s+rel=["']canonical["'][^>]*>/i,
      `<link rel="canonical" href="${esc(head.canonical)}" />`,
    );
  } else {
    html = html.replace(
      /<\/head>/i,
      `  <link rel="canonical" href="${esc(head.canonical)}" />\n  </head>`,
    );
  }

  const og = [
    ['og:title', head.title],
    ['og:description', head.desc],
    ['og:url', head.canonical],
    ['og:image', head.ogImage],
    ['twitter:title', head.title],
    ['twitter:description', head.desc],
    ['twitter:image', head.ogImage],
  ];
  for (const [prop, val] of og) {
    const propAttr = prop.startsWith('twitter:') ? 'name' : 'property';
    const re = new RegExp(`<meta\\s+${propAttr}=["']${prop}["'][^>]*>`, 'i');
    if (re.test(html)) {
      html = html.replace(re, `<meta ${propAttr}="${prop}" content="${esc(val)}" />`);
    } else {
      html = html.replace(
        /<\/head>/i,
        `  <meta ${propAttr}="${prop}" content="${esc(val)}" />\n  </head>`,
      );
    }
  }

  if (head.articleMeta) {
    const am = head.articleMeta;
    const tags = ['<meta property="og:type" content="article" />'];
    tags.push(`<meta property="article:published_time" content="${esc(am.publishedTime)}" />`);
    tags.push(`<meta property="article:modified_time" content="${esc(am.modifiedTime)}" />`);
    if (am.author) tags.push(`<meta property="article:author" content="${esc(am.author)}" />`);
    for (const t of am.tags) tags.push(`<meta property="article:tag" content="${esc(t)}" />`);
    html = html.replace(
      /<meta\s+property=["']og:type["'][^>]*>/i,
      tags.join('\n  '),
    );
    if (!/<meta\s+property=["']article:published_time["']/i.test(html)) {
      html = html.replace(/<\/head>/i, `  ${tags.join('\n  ')}\n  </head>`);
    }
  }

  // Replace any existing hreflang tags with post-specific ones (the shell has
  // homepage-default hreflangs from index.html that we must override per page).
  if (head.hreflangs && head.hreflangs.length) {
    html = html.replace(/\s*<link\s+rel=["']alternate["']\s+hreflang=[^>]*>/gi, '');
    const hreflangTags = head.hreflangs
      .map((h) => `  <link rel="alternate" hreflang="${esc(h.lang)}" href="${esc(h.href)}" />`)
      .join('\n');
    html = html.replace(/<\/head>/i, `${hreflangTags}\n  </head>`);
  }

  const jsonLdTags = head.jsonLd
    .map((obj) => `  <script type="application/ld+json">${JSON.stringify(obj)}</script>`)
    .join('\n');
  html = html.replace(/<\/head>/i, `${jsonLdTags}\n  </head>`);

  return html;
}

function injectCrawlableLinks(html, crossings, portToSlug, posts) {
  const crossingLinks = crossings
    .map((c) => {
      const slug = portToSlug[c.port_number];
      if (!slug) return null;
      return `    <li><a href="/crossing/${slug}">${esc(c.name)} wait times</a></li>`;
    })
    .filter(Boolean)
    .join('\n');

  const postLinks = posts
    .map((p) => `    <li><a href="/blog/${p.slug}">${esc(p.title)}</a></li>`)
    .join('\n');

  const block = `
<nav aria-label="All border crossings" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden">
  <h2>All U.S. border crossings</h2>
  <ul>
${crossingLinks}
  </ul>
${postLinks ? `  <h2>Border Pulse Blog</h2>\n  <ul>\n${postLinks}\n  </ul>` : ''}
</nav>
`;

  return html.replace(/<\/body>/i, `${block}\n  </body>`);
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
  const distDir = path.resolve(root, 'dist');
  const indexPath = path.resolve(distDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('[prerender] dist/index.html not found, run vite build first');
    process.exit(1);
  }

  const originalIndex = fs.readFileSync(indexPath, 'utf8');

  const slugs = await import(path.resolve(root, 'src/lib/slugs.js'));
  const dataPath = path.resolve(root, 'public/data/crossings.json');
  const doc = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const crossings = doc.crossings || [];
  const { portToSlug } = slugs.buildSlugMap(crossings);

  const posts = readBlogPosts();
  const authors = readAuthors();

  const indexWithLinks = injectCrawlableLinks(originalIndex, crossings, portToSlug, posts);
  fs.writeFileSync(indexPath, indexWithLinks);

  const aggregatesDir = path.resolve(root, 'public/data/aggregates');
  let crossingCount = 0;
  for (const c of crossings) {
    const slug = portToSlug[c.port_number];
    if (!slug) continue;
    let aggregate = null;
    const aggPath = path.resolve(aggregatesDir, `${slug}.json`);
    if (fs.existsSync(aggPath)) {
      try {
        aggregate = JSON.parse(fs.readFileSync(aggPath, 'utf8'));
      } catch {}
    }
    const head = renderCrossingHead(c, slug, aggregate);
    const html = rewriteIndex(indexWithLinks, head);
    const outDir = path.resolve(distDir, 'crossing', slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.resolve(outDir, 'index.html'), html);
    crossingCount++;
  }

  let blogPageCount = 0;
  if (posts.length > 0) {
    const indexHead = renderBlogIndexHead(posts);
    const indexHtml = rewriteIndex(indexWithLinks, indexHead);
    const blogIndexDir = path.resolve(distDir, 'blog');
    fs.mkdirSync(blogIndexDir, { recursive: true });
    fs.writeFileSync(path.resolve(blogIndexDir, 'index.html'), indexHtml);
    blogPageCount++;

    for (const p of posts) {
      const author = authors[p.author];
      const head = renderBlogPostHead(p, author, posts);
      const html = rewriteIndex(indexWithLinks, head);
      const outDir = path.resolve(distDir, 'blog', p.slug);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.resolve(outDir, 'index.html'), html);
      blogPageCount++;
    }
  }

  console.log(
    `[prerender] wrote ${crossingCount} crossing pages + ${blogPageCount} blog pages + crawlable nav on homepage`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
