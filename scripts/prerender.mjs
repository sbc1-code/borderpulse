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

function renderHead(crossing, slug, aggregate) {
  const title = `${crossing.name} wait times | Border Pulse`;
  const desc = `Live ${crossing.name} border wait times from U.S. Customs and Border Protection, refreshed every 15 minutes. Historical patterns, hours, and best times to cross.`;
  const canonical = `${BASE}/crossing/${slug}`;

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
    jsonLd: [place, faq, breadcrumb],
  };
}

function rewriteIndex(indexHtml, head) {
  let html = indexHtml;

  // <title>
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${esc(head.title)}</title>`);

  // <meta name="description">
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

  // canonical
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

  // og:title, og:description, og:url
  const og = [
    ['og:title', head.title],
    ['og:description', head.desc],
    ['og:url', head.canonical],
    ['twitter:title', head.title],
    ['twitter:description', head.desc],
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

  // JSON-LD
  const jsonLdTags = head.jsonLd
    .map((obj) => `  <script type="application/ld+json">${JSON.stringify(obj)}</script>`)
    .join('\n');
  html = html.replace(/<\/head>/i, `${jsonLdTags}\n  </head>`);

  return html;
}

async function main() {
  const distDir = path.resolve(root, 'dist');
  const indexPath = path.resolve(distDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('[prerender] dist/index.html not found — run vite build first');
    process.exit(1);
  }

  const indexHtml = fs.readFileSync(indexPath, 'utf8');

  const slugs = await import(path.resolve(root, 'src/lib/slugs.js'));
  const dataPath = path.resolve(root, 'public/data/crossings.json');
  const doc = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const crossings = doc.crossings || [];
  const { portToSlug } = slugs.buildSlugMap(crossings);

  const aggregatesDir = path.resolve(root, 'public/data/aggregates');
  let pageCount = 0;
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
    const head = renderHead(c, slug, aggregate);
    const html = rewriteIndex(indexHtml, head);
    const outDir = path.resolve(distDir, 'crossing', slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.resolve(outDir, 'index.html'), html);
    pageCount++;
  }

  console.log(`[prerender] wrote ${pageCount} crossing pages`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
