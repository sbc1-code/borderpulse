import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(__dirname);

const W = 1200;
const H = 630;
const BG = '#0b0b0b';
const FG = '#eaeaea';
const MUTED = '#888888';
const ACCENT = '#8a9a7b';

function xmlEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function wrapText(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function svgForCrossing(crossing) {
  const name = crossing.name || crossing.port_name || 'Crossing';
  const state = crossing.state || '';
  const border = crossing.border || '';
  const lines = wrapText(name, 22).slice(0, 3);
  const lineHeight = 92;
  const titleBlockHeight = lines.length * lineHeight;
  const titleStartY = (H - titleBlockHeight) / 2 + 50;

  const titleTspans = lines
    .map((line, i) => `<tspan x="80" y="${titleStartY + i * lineHeight}">${xmlEscape(line)}</tspan>`)
    .join('');

  const footer = `Live wait times · ${state}${border ? ' · ' + border : ''}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect x="0" y="0" width="12" height="${H}" fill="${ACCENT}"/>

  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif">
    <text x="80" y="100" font-size="34" font-weight="700" fill="${FG}">
      Border Pulse<tspan dx="10" fill="${ACCENT}">●</tspan>
    </text>

    <text font-size="84" font-weight="800" fill="${FG}" letter-spacing="-2">
      ${titleTspans}
    </text>

    <text x="80" y="${H - 90}" font-size="30" fill="${MUTED}">
      ${xmlEscape(footer)}
    </text>
    <text x="80" y="${H - 50}" font-size="26" fill="${ACCENT}">
      borderpulse.com
    </text>
  </g>
</svg>`;
}

function svgForPost(post) {
  const title = post.title || 'Border Pulse';
  const lines = wrapText(title, 28).slice(0, 4);
  const lineHeight = 72;
  const titleStartY = 240;

  const titleTspans = lines
    .map((line, i) => `<tspan x="80" y="${titleStartY + i * lineHeight}">${xmlEscape(line)}</tspan>`)
    .join('');

  const pillarLabels = {
    'data-analysis': 'Data',
    'crossing-guides': 'Crossing guides',
    'policy-programs': 'Programs',
    'traveler-tips': 'Traveler tips',
  };
  const kicker = pillarLabels[post.pillar] || 'Blog';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect x="0" y="0" width="12" height="${H}" fill="${ACCENT}"/>

  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif">
    <text x="80" y="100" font-size="34" font-weight="700" fill="${FG}">
      Border Pulse<tspan dx="10" fill="${ACCENT}">●</tspan>
    </text>

    <text x="80" y="170" font-size="22" font-weight="700" fill="${ACCENT}" letter-spacing="2">
      ${xmlEscape(kicker.toUpperCase())}
    </text>

    <text font-size="64" font-weight="800" fill="${FG}" letter-spacing="-1.5">
      ${titleTspans}
    </text>

    <text x="80" y="${H - 50}" font-size="26" fill="${MUTED}">
      borderpulse.com / blog
    </text>
  </g>
</svg>`;
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

async function main() {
  const slugMod = await import(path.resolve(root, 'src/lib/slugs.js'));
  const dataPath = path.resolve(root, 'public/data/crossings.json');
  const doc = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const crossings = doc.crossings || [];
  const { portToSlug } = slugMod.buildSlugMap(crossings);

  const outDir = path.resolve(root, 'public/og');
  fs.mkdirSync(outDir, { recursive: true });

  let count = 0;
  for (const c of crossings) {
    const slug = portToSlug[c.port_number];
    if (!slug) continue;
    const svg = svgForCrossing(c);
    const resvg = new Resvg(svg, { background: BG, fitTo: { mode: 'width', value: W } });
    const png = resvg.render().asPng();
    fs.writeFileSync(path.resolve(outDir, `${slug}.png`), png);
    count++;
  }
  console.log(`[og] wrote ${count} per-crossing OG cards`);

  const posts = readBlogPosts();
  if (posts.length > 0) {
    const blogOgDir = path.resolve(root, 'public/og/blog');
    fs.mkdirSync(blogOgDir, { recursive: true });
    let blogCount = 0;
    for (const p of posts) {
      const svg = svgForPost(p);
      const resvg = new Resvg(svg, { background: BG, fitTo: { mode: 'width', value: W } });
      const png = resvg.render().asPng();
      fs.writeFileSync(path.resolve(blogOgDir, `${p.slug}.png`), png);
      blogCount++;
    }
    console.log(`[og] wrote ${blogCount} per-post OG cards`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
