// Minimal MDX-to-HTML converter for prerender.
//
// Scope: just the subset of markdown + JSX actually used by Border Pulse blog
// posts (see src/content/blog/*.mdx as of 2026-05-16). Goal is to give search
// crawlers a textual body for each blog post inside the prerendered HTML.
//
// Out of scope: code fences, tables, images, footnotes, raw HTML, MDX
// expressions ({...}). If a future post uses one of these, extend here.
//
// Handled:
//   - ATX headings (#, ##, ### ...)
//   - Paragraphs, blank-line-separated
//   - Ordered lists (1.), unordered lists (-, *)
//   - Inline **bold**, *italic*, `code`, [text](url)
//   - <BestTimeChart .../>  -> dropped (chart, no textual value)
//   - <OfficialSource agency="A" url="U">prose</OfficialSource>
//        -> <aside><p>prose</p><p><a href="U">A</a></p></aside>
//
// Output is escaped where it should be and intentionally NOT a full sanitizer.
// We trust author-controlled MDX in src/content/blog/.

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Allowlist for link URL schemes. Anything else (e.g. javascript:, data:,
// vbscript:, file:) is replaced with "#" so a malicious or careless MDX
// author can't slip an executable URL into the prerendered HTML, even
// inside the aria-hidden offscreen <article>.
function safeHref(url) {
  if (!url) return '#';
  // Relative paths and in-page anchors are always fine — but protocol-relative
  // URLs (//evil.com/...) must NOT be treated as relative; they inherit the
  // current scheme and would point off-site.
  if (!url.startsWith('//') &&
      (url.startsWith('/') || url.startsWith('#') || url.startsWith('./') || url.startsWith('../'))) {
    return url;
  }
  // For absolute URLs, only allow http(s) and mailto.
  if (/^(https?:|mailto:)/i.test(url)) return url;
  return '#';
}

// Inline markdown -> HTML. Order matters: escape first, then re-introduce tags.
function renderInline(raw) {
  let s = esc(raw);
  // [text](url) — url may contain entities already escaped; allow ampersands.
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text, url) => {
    return `<a href="${safeHref(url)}">${text}</a>`;
  });
  // Inline code first so ** inside it isn't matched.
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic — single * not surrounded by another *; avoid touching list markers.
  s = s.replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
  return s;
}

function parseJsxAttrs(attrString) {
  const out = {};
  const re = /([a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(attrString))) out[m[1]] = m[2];
  return out;
}

// Strip a stripe of <BestTimeChart .../> self-closing JSX. Returns the body
// with those occurrences removed (they have no textual SEO value).
function stripSelfClosingComponents(body) {
  return body.replace(/^\s*<[A-Z][A-Za-z0-9]*[^>]*\/>\s*$/gm, '');
}

// Replace <OfficialSource ...>prose</OfficialSource> blocks with markdown
// equivalents that the line walker can render. Multi-line bodies are joined.
function expandOfficialSource(body) {
  return body.replace(
    /<OfficialSource\b([^>]*)>([\s\S]*?)<\/OfficialSource>/g,
    (_m, attrs, inner) => {
      const a = parseJsxAttrs(attrs);
      const prose = inner.trim().replace(/\s+/g, ' ');
      const agency = a.agency || 'Official source';
      const url = a.url || '#';
      // Emit a paragraph + a source line. Plain markdown so the line walker
      // picks it up. Blank lines around it keep paragraph boundaries clean.
      return `\n\n${prose}\n\nSource: [${agency}](${url})\n\n`;
    },
  );
}

// Walk lines, group into blocks, emit HTML.
function renderBlocks(body) {
  const lines = body.split(/\r?\n/);
  const out = [];
  let i = 0;

  function flushParagraph(buf) {
    if (!buf.length) return;
    const text = buf.join(' ').trim();
    if (text) out.push(`<p>${renderInline(text)}</p>`);
    buf.length = 0;
  }

  let paragraph = [];

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line ends a paragraph.
    if (!trimmed) {
      flushParagraph(paragraph);
      i++;
      continue;
    }

    // Heading.
    const heading = trimmed.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      flushParagraph(paragraph);
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    // Ordered list.
    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph(paragraph);
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      out.push(
        `<ol>${items.map((it) => `<li>${renderInline(it)}</li>`).join('')}</ol>`,
      );
      continue;
    }

    // Unordered list.
    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph(paragraph);
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      out.push(
        `<ul>${items.map((it) => `<li>${renderInline(it)}</li>`).join('')}</ul>`,
      );
      continue;
    }

    // Default: paragraph line.
    paragraph.push(trimmed);
    i++;
  }
  flushParagraph(paragraph);

  return out.join('\n');
}

export function mdxBodyToHtml(rawBody) {
  let body = rawBody;
  body = expandOfficialSource(body);
  body = stripSelfClosingComponents(body);
  return renderBlocks(body);
}
