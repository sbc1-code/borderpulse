import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { mdxBodyToHtml } from './lib/mdx-to-html.mjs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import EditorialArticle from '../src/components/blog/EditorialArticle.js';
import { hasPedestrianLane } from '../src/lib/crossingAvailability.js';
import { COMPARE_PAIRS } from '../src/lib/comparePairs.js';
import { pageHreflangs, blogHreflangs } from '../src/lib/hreflang.js';
import { snapshotHtml, injectSnapshot } from './lib/crossing-snapshot-html.mjs';
import { crossingSearchTitle } from '../src/lib/crossingNames.js';
import { cameraSourceFor } from '../src/lib/cameras.js';
import { googlePrivacyNotice } from '../src/lib/googlePrivacyNotice.js';
import { privacyParagraphs } from '../src/lib/privacyParagraphs.js';
import { CONSOLE_CANONICAL, CONSOLE_PATH } from '../src/lib/crossingConsole.js';

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
      a: `Border Pulse pulls the latest wait time for ${name} from U.S. Customs and Border Protection on a regular schedule.`,
    },
    {
      q: `What hours is ${name} open?`,
      a: `Official hours posted by CBP: ${hours}. Hours can change on U.S. federal holidays.`,
    },
  ];
  if (aggregate && aggregate.overall_best_hour != null) {
    const h = aggregate.overall_best_hour;
    const hourLabel = `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`;
    items.push({
      q: `What does the historical wait pattern show at ${name}?`,
      a: `The last 30 days of standard-passenger CBP data show an overall historical low around ${hourLabel} at ${name} (median ${aggregate.overall_best_median} min). This full-day pattern includes hours already passed and is not a forecast.`,
    });
  }
  return items;
}

function renderCrossingHead(crossing, slug, aggregate) {
  // Title pattern matches what wins these SERPs: keyword-first, "today"/live
  // freshness signal, current year. Brand goes last where truncation is cheap.
  const title = crossingSearchTitle(crossing, 'en', cameraSourceFor(crossing.port_number)?.kind);
  const desc = `Reported ${crossing.name} border wait time from U.S. Customs and Border Protection, plus 30-day hour-by-hour patterns, port hours, and historical standard-passenger wait patterns.`;
  const canonical = `${BASE}/crossing/${slug}/`;
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
  const canonical = `${BASE}/blog/`;
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
      url: `${BASE}/blog/${p.slug}/`,
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
  const canonical = `${BASE}/blog/${post.slug}/`;
  const ogImage = post.ogImage || `${BASE}/og/blog/${post.slug}.png`;
  const datePublished = `${post.date}T12:00:00Z`;
  const dateModified = `${post.updated || post.date}T12:00:00Z`;

  const hreflangs = blogHreflangs(post, allPosts || []);

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
      '@type': author?.type || 'Person',
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
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE}/blog/` },
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
    lang: post.lang === 'es' ? 'es' : 'en',
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

  if (head.lang) {
    html = html.replace(/<html\b[^>]*\blang=["'][^"']*["'][^>]*>/i, (tag) =>
      tag.replace(/\blang=["'][^"']*["']/i, `lang="${esc(head.lang)}"`),
    );
  }

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

  // Always replace shell alternates, including routes without translated URLs.
  html = html.replace(/\s*<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\bhreflang=)[^>]*>/gi, '');
  const hreflangTags = (head.hreflangs ?? pageHreflangs(head.canonical, head.lang || 'en'))
    .map((h) => `  <link rel="alternate" hreflang="${esc(h.lang)}" href="${esc(h.href)}" />`)
    .join('\n');
  html = html.replace(/<\/head>/i, `${hreflangTags}\n  </head>`);

  // Escape any literal "</script" inside the JSON body so a value like
  // "</script><script>alert(1)</script>" can't break out of the
  // application/ld+json container.
  const jsonLdTags = head.jsonLd
    .map((obj) => {
      const body = JSON.stringify(obj).replace(/<\/script/gi, '<\\/script');
      return `  <script type="application/ld+json" data-route-canonical="${esc(head.canonical)}">${body}</script>`;
    })
    .join('\n');
  html = html.replace(/<\/head>/i, `${jsonLdTags}\n  </head>`);

  return html;
}

function renderBestTimeHead(crossing, slug, aggregate) {
  const bestHour = aggregate?.overall_best_hour;
  const bestMedian = aggregate?.overall_best_median;
  const title = `Best Time to Cross ${crossing.name}: Hour-by-Hour CBP Data (2026) | Border Pulse`;
  const desc = bestHour != null && bestMedian != null
    ? `Historical lightest hour across the weekly pattern at ${crossing.name}: ${bestHour % 12 || 12} ${bestHour >= 12 ? 'PM' : 'AM'} (median ${bestMedian} min). From 30 days of standard-passenger CBP data; not a forecast.`
    : `Historical standard-passenger wait patterns at ${crossing.name} from 30 days of CBP data, by hour and weekday. Not a forecast.`;
  const canonical = `${BASE}/best-time/${slug}/`;
  // Per-best-time OG cards live under /og/best-time/<slug>.png.
  // Falls back to per-crossing card if the new generator hasn't run yet.
  const ogImage = `${BASE}/og/best-time/${slug}.png`;

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

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Border Pulse', item: BASE + '/' },
      { '@type': 'ListItem', position: 2, name: crossing.name, item: `${BASE}/crossing/${slug}/` },
      { '@type': 'ListItem', position: 3, name: 'Best time to cross', item: canonical },
    ],
  };

  return { title, desc, canonical, ogImage, jsonLd: [place, breadcrumb] };
}

function renderEmbedHead(crossing, slug) {
  const title = `${crossing.name} wait time | Border Pulse`;
  const desc = `Reported wait time at ${crossing.name}, refreshed regularly.`;
  // Canonical points to the full crossing page so search engines consolidate
  // any accidental indexing on the canonical URL.
  const canonical = `${BASE}/crossing/${slug}/`;
  const ogImage = `${BASE}/og/${slug}.png`;
  return { title, desc, canonical, ogImage, jsonLd: [] };
}

function applyNoindex(html) {
  if (/<meta\s+name=["']robots["'][^>]*>/i.test(html)) {
    return html.replace(
      /<meta\s+name=["']robots["'][^>]*>/i,
      '<meta name="robots" content="noindex, follow" />',
    );
  }
  return html.replace(
    /<\/head>/i,
    '  <meta name="robots" content="noindex, follow" />\n  </head>',
  );
}

function renderRedirectPage(targetUrl) {
  // Keep navigation same-origin so aliases are testable in preview and do not
  // make an unnecessary cross-origin round trip in production. Canonical SEO
  // signals stay absolute.
  const target = new URL(targetUrl);
  const localTarget = `${target.pathname}${target.search}${target.hash}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, follow" />
    <meta http-equiv="refresh" content="0; url=${esc(localTarget)}" />
    <link rel="canonical" href="${esc(targetUrl)}" />
    <title>Redirecting | Border Pulse</title>
    <script>window.location.replace(${JSON.stringify(localTarget)} + window.location.search + window.location.hash);</script>
  </head>
  <body>
    <p>Redirecting to <a href="${esc(targetUrl)}">${esc(targetUrl)}</a>.</p>
  </body>
</html>
`;
}

function injectCrawlableLinks(html, crossings, portToSlug, posts) {
  const crossingLinks = crossings
    .map((c) => {
      const slug = portToSlug[c.port_number];
      if (!slug) return null;
      return `    <li><a href="/crossing/${slug}/">${esc(c.name)} wait times</a></li>`;
    })
    .filter(Boolean)
    .join('\n');

  const postLinks = posts
    .map((p) => `    <li><a href="/blog/${p.slug}/">${esc(p.title)}</a></li>`)
    .join('\n');

  const block = `
<nav aria-label="All border crossings" aria-hidden="true" inert style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden">
  <h2>All U.S. border crossings</h2>
  <ul>
${crossingLinks}
  </ul>
${postLinks ? `  <h2>Border Pulse Blog</h2>\n  <ul>\n${postLinks}\n  </ul>` : ''}
</nav>
`;

  return html.replace(/<\/body>/i, `${block}\n  </body>`);
}

// Build an offscreen <article> snapshot of a blog post for crawler discovery.
// Mirrors the visually-hidden pattern used for the homepage nav so the SPA
// hydration target (#root) renders the canonical, visible version.
function renderBlogPostBody(post, author) {
  const mdxPath = path.resolve(root, 'src/content/blog', `${post.slug}.mdx`);
  if (!fs.existsSync(mdxPath)) return '';
  let bodyHtml;
  try {
    const raw = fs.readFileSync(mdxPath, 'utf8');
    const { content, data } = matter(raw);
    bodyHtml = data.source === 'ai-editorial'
      ? renderToStaticMarkup(createElement(EditorialArticle, { article: data.editorialArticle }))
      : mdxBodyToHtml(content);
  } catch (e) {
    console.warn(`[prerender] failed to render body for ${post.slug}:`, e.message);
    return '';
  }

  const lang = post.lang === 'es' ? 'es' : 'en';
  const authorName = author?.name || post.author || '';
  const byline = authorName ? `<p>${esc(authorName)} · ${esc(post.date)}</p>` : '';
  return `
<article lang="${lang}" aria-hidden="true" inert style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden">
  <header>
    <h1>${esc(post.title)}</h1>
    <p>${esc(post.description || '')}</p>
    ${byline}
  </header>
  ${bodyHtml}
</article>
`;
}

function injectBlogBody(html, articleHtml) {
  if (!articleHtml) return html;
  return html.replace(/<\/body>/i, `${articleHtml}\n  </body>`);
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
  fs.writeFileSync(indexPath, injectSnapshot(indexWithLinks, snapshotHtml(crossings, portToSlug, doc.fetched_at)));

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
    const html = injectSnapshot(rewriteIndex(indexWithLinks, head), snapshotHtml([c], portToSlug, doc.fetched_at, true));
    const outDir = path.resolve(distDir, 'crossing', slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.resolve(outDir, 'index.html'), html);
    crossingCount++;
  }

  // An additive corridor interface, outside the sitemap in this first release.
  // Keep a real dated report fallback and serve direct requests on static hosts.
  {
    const head = { title: 'San Ysidro & Otay Mesa crossing console | Border Pulse', desc: 'Compare the same reported lane, inspect source clocks and account for your extra driving time.', canonical: CONSOLE_CANONICAL, ogImage: `${BASE}/og-card.png`, jsonLd: [] };
    const html = injectSnapshot(rewriteIndex(indexWithLinks, head), snapshotHtml(crossings.filter(c => ['250401', '250601'].includes(String(c.port_number))), portToSlug, doc.fetched_at, true));
    const outDir = path.resolve(distDir, `.${CONSOLE_PATH}`);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.resolve(outDir, 'index.html'), html);
  }

  let blogPageCount = 0;
  let aliasPageCount = 0;
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
      const headHtml = rewriteIndex(indexWithLinks, head);
      const articleHtml = renderBlogPostBody(p, author);
      const html = injectBlogBody(headHtml, articleHtml);
      const outDir = path.resolve(distDir, 'blog', p.slug);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.resolve(outDir, 'index.html'), html);
      blogPageCount++;
    }
  }

  for (const [alias, portNumber] of Object.entries(slugs.SLUG_ALIASES || {})) {
    const canonicalSlug = portToSlug[portNumber];
    if (!canonicalSlug || canonicalSlug === alias) continue;
    const crossing = crossings.find((c) => c.port_number === portNumber);
    const aliasRoutes = [
      ['crossing', `${BASE}/crossing/${canonicalSlug}/`],
      ['best-time', `${BASE}/best-time/${canonicalSlug}/`],
    ];
    if (hasPedestrianLane(crossing)) {
      aliasRoutes.push(['walk-or-drive', `${BASE}/walk-or-drive/${canonicalSlug}/`]);
    }
    for (const [route, target] of aliasRoutes) {
      const outDir = path.resolve(distDir, route, alias);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.resolve(outDir, 'index.html'), renderRedirectPage(target));
      aliasPageCount++;
    }
  }

  // High-confidence legacy URLs seen in Search Console. Preserve link equity
  // without turning unrelated or spam-shaped 404s into valid pages.
  const legacyRedirects = [
    ['home', `${BASE}/`],
    ['Dashboard', `${BASE}/`],
    ['compare/el-paso-paso-del-norte-pdn-vs-el-paso-ysleta', `${BASE}/compare/el-paso-paso-del-norte-pdn-vs-ysleta/`],
    ['walk-or-drive/eagle-pass-bridge-ii', `${BASE}/crossing/eagle-pass-bridge-ii/`],
  ];
  for (const [legacyPath, target] of legacyRedirects) {
    const outDir = path.resolve(distDir, ...legacyPath.split('/'));
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.resolve(outDir, 'index.html'), renderRedirectPage(target));
    aliasPageCount++;
  }

  // Legacy API docs URL. The visible page was removed; keep a noindex redirect
  // so old inbound links flow to methodology instead of a hard 404.
  {
    const apiDir = path.resolve(distDir, 'api');
    fs.mkdirSync(apiDir, { recursive: true });
    fs.writeFileSync(path.resolve(apiDir, 'index.html'), renderRedirectPage(`${BASE}/methodology/`));
  }

  let embedPageCount = 0;
  for (const c of crossings) {
    const slug = portToSlug[c.port_number];
    if (!slug) continue;
    const head = renderEmbedHead(c, slug);
    const html = applyNoindex(rewriteIndex(indexWithLinks, head));
    const outDir = path.resolve(distDir, 'embed', slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.resolve(outDir, 'index.html'), html);
    embedPageCount++;
  }

  // /methodology + /metodologia — twin bilingual routes, hreflang-paired.
  {
    const enCanonical = `${BASE}/methodology/`;
    const esCanonical = `${BASE}/metodologia/`;
    const hreflangs = [
      { lang: 'en', href: enCanonical },
      { lang: 'es', href: esCanonical },
      { lang: 'x-default', href: enCanonical },
    ];
    const breadcrumbFor = (canonical, label) => ({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Border Pulse', item: BASE + '/' },
        { '@type': 'ListItem', position: 2, name: label, item: canonical },
      ],
    });
    const enHead = {
      lang: 'en',
      title: 'Methodology | Border Pulse',
      desc: 'CBP sources, report and retrieval clocks, medians, historical coverage and BorderPulse limits.',
      canonical: enCanonical,
      ogImage: `${BASE}/og-card.png`,
      jsonLd: [breadcrumbFor(enCanonical, 'Methodology')],
      hreflangs,
    };
    const esHead = {
      lang: 'es',
      title: 'Metodología | Border Pulse',
      desc: 'Fuentes de CBP, horas de reporte y consulta, medianas, cobertura histórica y límites de BorderPulse.',
      canonical: esCanonical,
      ogImage: `${BASE}/og-card.png`,
      jsonLd: [breadcrumbFor(esCanonical, 'Metodología')],
      hreflangs,
    };
    const enHtml = rewriteIndex(indexWithLinks, enHead);
    const esHtml = rewriteIndex(indexWithLinks, esHead);
    const enDir = path.resolve(distDir, 'methodology');
    const esDir = path.resolve(distDir, 'metodologia');
    fs.mkdirSync(enDir, { recursive: true });
    fs.mkdirSync(esDir, { recursive: true });
    fs.writeFileSync(path.resolve(enDir, 'index.html'), enHtml);
    fs.writeFileSync(path.resolve(esDir, 'index.html'), esHtml);
  }

  // /about — trust signal page with methodology + public stats + privacy
  {
    const aboutHead = {
      title: 'About Border Pulse | The U.S.-Mexico border wait time tracker',
      desc: 'Border Pulse is an independent, bilingual project that presents available northbound U.S.-Mexico crossing reports from official CBP data, refreshed regularly, with a 30-day rolling history.',
      canonical: `${BASE}/about/`,
      ogImage: `${BASE}/og-card.png`,
      jsonLd: [],
    };
    const aboutHtml = rewriteIndex(indexWithLinks, aboutHead);
    const outDir = path.resolve(distDir, 'about');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.resolve(outDir, 'index.html'), aboutHtml);
  }

  // Privacy notices are bilingual, crawlable, and linked from the ad unit.
  {
    const enCanonical = `${BASE}/privacy/`;
    const esCanonical = `${BASE}/privacidad/`;
    const hreflangs = [
      { lang: 'en', href: enCanonical },
      { lang: 'es', href: esCanonical },
      { lang: 'x-default', href: enCanonical },
    ];
    const enHead = {
      lang: 'en',
      title: 'Privacy and advertising | Border Pulse',
      desc: 'How Border Pulse uses browser preferences, analytics, and third-party advertising.',
      canonical: enCanonical,
      ogImage: `${BASE}/og-card.png`,
      jsonLd: [],
      hreflangs,
    };
    const esHead = {
      ...enHead,
      lang: 'es',
      title: 'Privacidad y publicidad | Border Pulse',
      desc: 'Cómo Border Pulse usa preferencias del navegador, analítica y publicidad de terceros.',
      canonical: esCanonical,
    };
    for (const [route, head] of [['privacy', enHead], ['privacidad', esHead]]) {
      const outDir = path.resolve(distDir, route);
      fs.mkdirSync(outDir, { recursive: true });
      const es = head.lang === 'es';
      const notice = privacyParagraphs(head.lang);
      const google = googlePrivacyNotice(head.lang);
      const section = (id, title, paragraphs, links = []) => `<section id="${esc(id)}" class="my-6"><h2 class="text-xl font-semibold">${esc(title)}</h2>${paragraphs.map(text => `<p class="my-3">${esc(text)}</p>`).join('')}${links.map(link => `<p><a class="underline" href="${esc(link.href)}" target="_blank" rel="noopener noreferrer">${esc(link.label)}</a></p>`).join('')}</section>`;
      const body = `<main class="mx-auto max-w-[900px] p-4 sm:p-6">
        <a href="/">${es ? 'Todos los cruces' : 'All crossings'}</a>
        <h1 class="text-2xl font-bold">${es ? 'Privacidad y datos' : 'Privacy and data'}</h1>
        ${section('cameras', es ? 'Cámaras públicas' : 'Public cameras', [notice.cameras], [{ href: 'https://policies.google.com/privacy', label: es ? 'Aviso de privacidad de Google' : 'Google Privacy Policy' }])}
        ${section('public-site', es ? 'El sitio público' : 'The public site', [notice.publicSite, notice.analytics])}
        ${section('advertising', es ? 'Publicidad' : 'Advertising', [notice.adsterra, notice.adsterraData, notice.adsterraChoices], [
          { href: 'https://adsterra.com/privacy-policy-managed/', label: es ? 'Aviso de privacidad de Adsterra' : 'Adsterra Privacy Policy' },
          { href: 'https://adsterra.com/cookies/', label: es ? 'Política de cookies de Adsterra' : 'Adsterra Cookies Policy' },
        ])}
        ${section('google-advertising', google.title, google.paragraphs, google.links)}
        <p>${es ? 'Actualizado: 17 de octubre de 2026.' : 'Updated: October 17, 2026.'}</p>
      </main>`;
      const html = injectSnapshot(rewriteIndex(indexWithLinks, head), body);
      fs.writeFileSync(path.resolve(outDir, 'index.html'), html);
    }
  }

  // /best-time index hub — links to every generated best-time page.
  {
    const canonical = `${BASE}/best-time/`;
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Border Pulse', item: `${BASE}/` },
        { '@type': 'ListItem', position: 2, name: 'Best time to cross', item: canonical },
      ],
    };
    const itemList = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Best times to cross U.S.-Mexico border crossings',
      numberOfItems: crossings.length,
      itemListElement: crossings.map((crossing, index) => {
        const slug = portToSlug[crossing.port_number];
        return {
          '@type': 'ListItem',
          position: index + 1,
          name: crossing.name,
          url: `${BASE}/best-time/${slug}/`,
        };
      }),
    };
    const indexHead = {
      title: 'Best time to cross: historical patterns by crossing | Border Pulse',
      desc: `Historical lightest hour for each crossing’s local weekday, based on the last 30 days of standard-passenger CBP data. Not a forecast. ${crossings.length} crossings, hour by hour.`,
      canonical,
      ogImage: `${BASE}/og-card.png`,
      jsonLd: [breadcrumb, itemList],
    };
    const indexHtml = rewriteIndex(indexWithLinks, indexHead);
    const outDir = path.resolve(distDir, 'best-time');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.resolve(outDir, 'index.html'), indexHtml);
  }

  let bestTimePageCount = 0;
  for (const c of crossings) {
    const slug = portToSlug[c.port_number];
    if (!slug) continue;
    let aggregate = null;
    const aggPath = path.resolve(aggregatesDir, `${slug}.json`);
    if (fs.existsSync(aggPath)) {
      try { aggregate = JSON.parse(fs.readFileSync(aggPath, 'utf8')); } catch {}
    }
    const head = renderBestTimeHead(c, slug, aggregate);
    const html = rewriteIndex(indexWithLinks, head);
    const outDir = path.resolve(distDir, 'best-time', slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.resolve(outDir, 'index.html'), html);
    bestTimePageCount++;
  }

  // /compare/<slugA>-vs-<slugB> — programmatic SEO seed pairs.
  // Hand-picked high-traffic same-region pairs the user actually searches
  // for ("X vs Y which is faster"). Add more pairs here as the
  // routing patterns change.
  const slugToCrossing = {};
  for (const c of crossings) {
    const s = portToSlug[c.port_number];
    if (s) slugToCrossing[s] = c;
  }
  let comparePageCount = 0;
  for (const [aSlug, bSlug] of COMPARE_PAIRS) {
    const cA = slugToCrossing[aSlug];
    const cB = slugToCrossing[bSlug];
    if (!cA || !cB) continue;
    const pair = `${aSlug}-vs-${bSlug}`;
    const title = `${cA.name} vs ${cB.name}: Reported Northbound Waits | Border Pulse`;
    const desc = `CBP-reported northbound standard-passenger waits, historical lightest hour, and 30-day patterns at ${cA.name} and ${cB.name} side by side. These figures do not include total trip time.`;
    const canonical = `${BASE}/compare/${pair}/`;
    const ogImage = `${BASE}/og-card.png`;
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Border Pulse', item: BASE + '/' },
        { '@type': 'ListItem', position: 2, name: cA.name, item: `${BASE}/crossing/${aSlug}/` },
        { '@type': 'ListItem', position: 3, name: `vs ${cB.name}`, item: canonical },
      ],
    };
    const head = { title, desc, canonical, ogImage, jsonLd: [breadcrumb] };
    const html = rewriteIndex(indexWithLinks, head);
    const outDir = path.resolve(distDir, 'compare', pair);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.resolve(outDir, 'index.html'), html);
    comparePageCount++;
  }

  // /walk-or-drive/<slug> — generate every route the crossing detail UI can
  // link to, including ports whose CBP lane is temporarily Update Pending.
  let walkOrDriveCount = 0;
  for (const c of crossings.filter(hasPedestrianLane)) {
    const slug = portToSlug[c.port_number];
    if (!slug) continue;
    const title = `Walk or Drive Across ${c.name}? CBP Wait Comparison | Border Pulse`;
    const desc = `Compare reported pedestrian and vehicle wait times at ${c.name} from CBP. See whether walking saves enough minutes to be worth parking.`;
    const canonical = `${BASE}/walk-or-drive/${slug}/`;
    const ogImage = `${BASE}/og/${slug}.png`;
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Border Pulse', item: BASE + '/' },
        { '@type': 'ListItem', position: 2, name: c.name, item: `${BASE}/crossing/${slug}/` },
        { '@type': 'ListItem', position: 3, name: 'Walk or drive', item: canonical },
      ],
    };
    const head = { title, desc, canonical, ogImage, jsonLd: [breadcrumb] };
    const html = rewriteIndex(indexWithLinks, head);
    const outDir = path.resolve(distDir, 'walk-or-drive', slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.resolve(outDir, 'index.html'), html);
    walkOrDriveCount++;
  }

  console.log(
    `[prerender] wrote ${crossingCount} crossing pages + ${blogPageCount} blog pages + ${aliasPageCount} alias pages + ${embedPageCount} embed pages + ${bestTimePageCount} best-time pages + ${comparePageCount} compare pages + ${walkOrDriveCount} walk-or-drive pages + crawlable nav on homepage`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
