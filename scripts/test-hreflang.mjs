import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pageHreflangs, blogHreflangs } from '../src/lib/hreflang.js';

const base = 'https://borderpulse.com';
test('single URL routes point to themselves without inventing translations', () => {
  for (const route of ['/', '/crossing/san-ysidro/', '/best-time/san-ysidro/', '/compare/san-ysidro-vs-otay-mesa/']) {
    assert.deepEqual(pageHreflangs(base + route), [{ lang: 'en', href: base + route }, { lang: 'x-default', href: base + route }]);
  }
});
test('only published EN/ES blog twins create reciprocal alternates', () => {
  const en = { slug: 'english', lang: 'en', translationKey: 'guide' };
  const es = { slug: 'espanol', lang: 'es', translationKey: 'guide' };
  const expected = [{ lang: 'en', href: base + '/blog/english/' }, { lang: 'es', href: base + '/blog/espanol/' }, { lang: 'x-default', href: base + '/blog/english/' }];
  assert.deepEqual(blogHreflangs(en, [en, es]), expected);
  assert.deepEqual(blogHreflangs(es, [en, es]), expected);
  for (const post of [en, es, { slug: 'unpaired', lang: 'es' }]) {
    assert.deepEqual(blogHreflangs(post, [post]), [{ lang: post.lang, href: `${base}/blog/${post.slug}/` }, { lang: 'x-default', href: `${base}/blog/${post.slug}/` }]);
  }
});
test('existing methodology and privacy twins remain reciprocal', () => {
  for (const [en, es] of [['methodology', 'metodologia'], ['privacy', 'privacidad']]) {
    assert.deepEqual(pageHreflangs(`${base}/${en}/`), pageHreflangs(`${base}/${es}/`, 'es'));
    assert.equal(pageHreflangs(`${base}/${en}/`).length, 3);
  }
});

test('SPA metadata replaces stale/duplicate hreflangs and preserves other alternate links', async () => {
  const { updatePageMeta, resetPageMeta } = await import('../src/lib/seo.js');
  const nodes = [];
  const create = (tag, attrs = {}) => {
    const node = {
      tag, attrs: { ...attrs },
      setAttribute(name, value) { this.attrs[name] = value; },
      getAttribute(name) { return this.attrs[name]; },
      remove() { nodes.splice(nodes.indexOf(this), 1); },
    };
    return node;
  };
  const matches = (node, selector) => node.tag === selector.split('[')[0] &&
    [...selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)].every(([, key, value]) =>
      value === undefined ? key in node.attrs : node.attrs[key] === value);
  const previous = globalThis.document;
  globalThis.document = {
    documentElement: { lang: 'en' },
    head: { appendChild(node) { nodes.push(node); } },
    createElement: create,
    querySelector: (selector) => nodes.find((node) => matches(node, selector)),
    querySelectorAll: (selector) => nodes.filter((node) => matches(node, selector)),
  };
  const rss = create('link', { rel: 'alternate', type: 'application/rss+xml', href: base + '/rss.xml' });
  nodes.push(rss, create('link', { rel: 'alternate', hreflang: 'en', href: base + '/' }), create('link', { rel: 'alternate', hreflang: 'en', href: base + '/' }));
  const actual = () => nodes.filter((node) => 'hreflang' in node.attrs).map((node) => ({ lang: node.attrs.hreflang, href: node.attrs.href }));
  try {
    const canonical = base + '/crossing/san-ysidro/';
    const currentSchema = create('script', { 'data-route-canonical': canonical });
    const otherSchema = create('script', { 'data-route-canonical': base + '/blog/previous/' });
    const sharedSchema = create('script', { type: 'application/ld+json' });
    nodes.push(currentSchema, otherSchema, sharedSchema);
    updatePageMeta({ canonical });
    assert.ok(nodes.includes(currentSchema), 'same-route data updates retain the direct-entry schema');
    assert.ok(!nodes.includes(otherSchema), 'a previous route cannot keep its schema');
    assert.ok(nodes.includes(sharedSchema), 'shared schema is outside the route cleanup');
    assert.deepEqual(actual(), pageHreflangs(canonical));
    assert.ok(nodes.includes(rss));
    updatePageMeta({ title: 'Partial update' });
    assert.deepEqual(actual(), pageHreflangs(canonical));
    updatePageMeta({ canonical: base + '/blog/example/', hreflangs: [] });
    assert.ok(!nodes.includes(currentSchema), 'leaving the crossing removes its route schema');
    assert.deepEqual(actual(), []);
    document.documentElement.lang = 'es';
    resetPageMeta();
    assert.equal(document.documentElement.lang, 'es', 'metadata cleanup must preserve the language selected by its owner');
    assert.deepEqual(actual(), pageHreflangs(base + '/'));
    assert.ok(nodes.includes(rss));
    updatePageMeta({ title: 'New page', description: 'New description', ogTitle: 'New preview', ogDescription: 'Preview description', ogImage: base + '/og/new.png' });
    for (const [name, expected] of [['twitter:title', 'New preview'], ['twitter:description', 'Preview description'], ['twitter:image', base + '/og/new.png']]) {
      assert.equal(document.querySelector(`meta[name="${name}"]`).getAttribute('content'), expected);
    }
    resetPageMeta();
    assert.equal(document.querySelector('meta[name="twitter:image"]').getAttribute('content'), base + '/og-card.png');
    for (const lang of ['en', 'es']) {
      updatePageMeta({ canonical: `${base}/blog/content-${lang}/`, lang });
      assert.equal(document.documentElement.lang, lang, 'explicit content language must still take ownership');
      resetPageMeta();
      assert.equal(document.documentElement.lang, lang, 'cleanup must not overwrite the content owner');
    }
  } finally { globalThis.document = previous; }
});
