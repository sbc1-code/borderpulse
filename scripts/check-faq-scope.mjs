import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://borderpulse.com';
const sharedTypes = ['WebApplication', 'Dataset', 'Organization', 'WebSite'];
const removedQuestions = [
  'Where do northbound wait times come from?',
  'How are southbound delays estimated?',
  'What does no current wait time mean?',
  'What runs in my browser?',
];
const activeSouthboundClaim = 'Border Pulse estimates delay at major crossings using live routing conditions';
const enArticle = '/blog/san-ysidro-vs-otay-mesa/';
const esArticle = '/blog/san-ysidro-vs-otay-cual-es-mas-rapida/';

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)]
    .map((match) => [match[1].toLowerCase(), match[3]]));
}

// Generated HTML uses quoted attributes. Read every JSON-LD block, including
// arrays and @graph documents, without adding a browser/parser dependency.
export function parseJsonLd(html, label) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
    .filter((match) => attributes(match[1]).type?.toLowerCase() === 'application/ld+json')
    .map((match, index) => {
      try { return JSON.parse(match[2]); }
      catch (error) { throw new Error(`${label}: invalid JSON-LD block ${index + 1}: ${error.message}`); }
    });
}

function nodes(schemas) {
  return schemas.flatMap((schema) => {
    if (Array.isArray(schema)) return nodes(schema);
    if (!schema || typeof schema !== 'object') return [];
    return [schema, ...nodes(Object.values(schema))];
  });
}

function assertNoActiveSouthboundClaim(text, label) {
  assert.ok(!text.includes(activeSouthboundClaim), `${label}: active southbound routing claim returned`);
}

function assertNoRemovedText(text, label) {
  for (const question of removedQuestions) {
    assert.ok(!text.includes(question), `${label}: removed global question: ${question}`);
  }
  assertNoActiveSouthboundClaim(text, label);
}

export function assertNoGlobalFaq(schemas, label) {
  // Inspect parsed text as well as HTML so JSON unicode escapes cannot hide it.
  assertNoRemovedText(JSON.stringify(schemas), label);
}

export function checkHtmlFaqScope(html, label) {
  // The visible homepage FAQ is legitimate; only its inherited JSON-LD was removed.
  assertNoActiveSouthboundClaim(html, label);
  const schemas = parseJsonLd(html, label);
  assertNoGlobalFaq(schemas, label);
  return schemas;
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((match) => attributes(match[0]));
}

function assertTypes(schemas, expected, label) {
  const types = new Set(nodes(schemas).map((node) => node['@type']));
  for (const type of expected) assert.ok(types.has(type), `${label}: missing ${type}`);
}

function assertHreflangs(html, expected, label) {
  const actual = Object.fromEntries(tags(html, 'link').filter((tag) => tag.hreflang)
    .map((tag) => [tag.hreflang, tag.href]));
  assert.deepEqual(actual, Object.fromEntries(Object.entries(expected)
    .map(([lang, route]) => [lang, `${origin}${route}`])), `${label}: hreflang changed`);
}

function htmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(file) : entry.name.endsWith('.html') ? [file] : [];
  });
}

export function checkBuiltFaqScope(distDir = path.join(root, 'dist')) {
  const files = htmlFiles(distDir);
  assert.ok(files.length, 'Build output must contain HTML');
  let blockCount = 0;
  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    const label = path.relative(distDir, file);
    const schemas = checkHtmlFaqScope(html, label);
    blockCount += schemas.length;
  }

  const twins = (en, es) => ({ en, es, 'x-default': en });
  const representatives = [
    { route: '/', title: 'Border Pulse |', hreflangs: { en: '/', 'x-default': '/' } },
    { route: '/methodology/', title: 'Methodology |', types: ['BreadcrumbList'], hreflangs: twins('/methodology/', '/metodologia/') },
    { route: '/metodologia/', title: 'Metodología |', lang: 'es', types: ['BreadcrumbList'], hreflangs: twins('/methodology/', '/metodologia/') },
    { route: '/privacy/', title: 'Privacy and advertising |', hreflangs: twins('/privacy/', '/privacidad/') },
    { route: '/privacidad/', title: 'Privacidad y publicidad |', lang: 'es', hreflangs: twins('/privacy/', '/privacidad/') },
    { route: '/crossing/san-ysidro/', title: 'San Ysidro Border Wait Time', types: ['Place', 'FAQPage', 'BreadcrumbList'] },
    { route: '/blog/', title: 'Border Pulse Blog |', types: ['Blog', 'BreadcrumbList'] },
    { route: enArticle, title: 'San Ysidro vs Otay Mesa:', types: ['BlogPosting', 'BreadcrumbList'], hreflangs: twins(enArticle, esArticle) },
    { route: esArticle, title: 'San Ysidro vs Otay Mesa:', lang: 'es', types: ['BlogPosting', 'BreadcrumbList'], hreflangs: twins(enArticle, esArticle) },
  ];
  for (const sample of representatives) {
    const html = fs.readFileSync(path.join(distDir, sample.route, 'index.html'), 'utf8');
    const schemas = parseJsonLd(html, sample.route);
    const allNodes = nodes(schemas);
    const canonical = `${origin}${sample.route}`;
    assert.deepEqual(tags(html, 'link').filter((tag) => tag.rel === 'canonical').map((tag) => tag.href), [canonical], `${sample.route}: canonical changed`);
    assert.ok(html.match(/<title>(.*?)<\/title>/s)?.[1].startsWith(sample.title), `${sample.route}: title changed`);
    assert.equal(tags(html, 'html')[0]?.lang, sample.lang || 'en', `${sample.route}: document language changed`);
    const meta = tags(html, 'meta');
    assert.ok(meta.find((tag) => tag.name === 'description')?.content, `${sample.route}: missing description`);
    assert.equal(meta.find((tag) => tag.property === 'og:url')?.content, canonical, `${sample.route}: og:url changed`);
    for (const name of ['og:title', 'og:description', 'og:image', 'twitter:title', 'twitter:description', 'twitter:image']) {
      assert.ok(meta.find((tag) => (tag.property || tag.name) === name)?.content, `${sample.route}: missing ${name}`);
    }
    assertTypes(schemas, [...sharedTypes, ...(sample.types || [])], sample.route);
    const graph = schemas.find((schema) => Array.isArray(schema?.['@graph']))?.['@graph'];
    assert.deepEqual(graph?.map((node) => node['@type']), sharedTypes, `${sample.route}: shared graph changed`);
    if (sample.hreflangs) assertHreflangs(html, sample.hreflangs, sample.route);
    for (const breadcrumb of allNodes.filter((node) => node['@type'] === 'BreadcrumbList')) {
      assert.equal(breadcrumb.itemListElement.at(-1).item, canonical, `${sample.route}: breadcrumb target changed`);
    }
    if (sample.route === '/crossing/san-ysidro/') {
      const faqs = allNodes.filter((node) => node['@type'] === 'FAQPage');
      assert.equal(faqs.length, 1, 'crossing must have only its own FAQ');
      assert.ok(faqs[0].mainEntity.length >= 2, 'crossing FAQ must retain its questions');
      assert.ok(faqs[0].mainEntity.every((question) => question.name.includes('San Ysidro')), 'crossing FAQ must be crossing-specific');
      assert.equal(allNodes.find((node) => node['@type'] === 'Place')?.url, canonical);
    }
    if ([enArticle, esArticle].includes(sample.route)) {
      const article = allNodes.find((node) => node['@type'] === 'BlogPosting');
      assert.equal(article.url, canonical);
      assert.equal(article.mainEntityOfPage, canonical);
      assert.equal(article.inLanguage, sample.lang === 'es' ? 'es-MX' : 'en-US');
      assert.equal(article.author.name, 'Sebastian Becerra');
      assert.equal(article.datePublished, '2026-04-24T12:00:00Z');
      assert.equal(article.dateModified, '2026-10-11T12:00:00Z');
    }
  }
  console.log(`[faq-scope] PASS: ${files.length} HTML files, ${blockCount} valid JSON-LD blocks; no shared homepage FAQ or active-southbound claim; ${representatives.length} metadata samples`);
}

// Keep this deliberately limited to the removed shared FAQ and existing
// canonicals. Other prerender/runtime schema lifecycle issues are separate.
export async function checkFaqNavigation(page, baseUrl) {
  await page.evaluate(() => {
    localStorage.setItem('borderPulse_language', 'en');
    localStorage.setItem('borderPulse_region', 'ALL');
  });
  await page.goto(new URL('/', baseUrl).href);
  await page.getByRole('searchbox', { name: 'Search crossings by name or city', exact: true }).waitFor();
  const documentMarker = await page.evaluate(() => {
    window.faqScopeDocument = crypto.randomUUID();
    return window.faqScopeDocument;
  });
  const inspect = async (route) => {
    await page.waitForURL((url) => url.pathname === route);
    await page.waitForFunction((expected) => document.querySelector('link[rel="canonical"]')?.href === expected, `${origin}${route}`);
    assert.equal(await page.evaluate(() => window.faqScopeDocument), documentMarker, 'navigation must stay client-side');
    const schemas = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((value) => JSON.parse(value));
    assertNoGlobalFaq(schemas, route);
    assertTypes(schemas, sharedTypes, route);
    assert.deepEqual(await page.locator('link[rel="canonical"]').evaluateAll((links) => links.map((link) => link.href)), [`${origin}${route}`]);
  };
  await inspect('/');
  const faq = page.locator('#root details').filter({ hasText: 'Frequently asked questions' });
  await faq.locator('summary').click();
  await faq.getByText('Where do northbound wait times come from?', { exact: true }).waitFor();
  await faq.getByText('CBP does not publish southbound wait times. Border Pulse has paused its paid estimates and currently shows official northbound data only.', { exact: true }).waitFor();
  await page.getByRole('searchbox', { name: 'Search crossings by name or city', exact: true }).fill('San Ysidro');
  await page.locator('#root a[href="/crossing/san-ysidro/"]:visible').first().click();
  await inspect('/crossing/san-ysidro/');
  const menu = page.getByRole('button', { name: 'Open menu', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: 'Blog', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: 'Border Pulse Blog', exact: true }).waitFor();
  await inspect('/blog/');
  await page.locator(`#root a[href="${enArticle}"]`).click();
  await page.locator('#root article[lang="en"]').waitFor();
  await inspect(enArticle);
  await page.locator('#root article').getByRole('link', { name: 'Español', exact: true }).click();
  await page.locator('#root article[lang="es"]').waitFor();
  await inspect(esArticle);
  await page.goBack();
  await page.locator('#root article[lang="en"]').waitFor();
  await inspect(enArticle);
  console.log('[faq-scope] PASS: home → crossing → blog → EN article → ES article → Back; visible homepage FAQ and canonicals retained');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  checkBuiltFaqScope();
}
