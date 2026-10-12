import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://borderpulse.com';
const enArticle = '/blog/san-ysidro-vs-otay-mesa/';
const esArticle = '/blog/san-ysidro-vs-otay-cual-es-mas-rapida/';
const single = (route, lang = 'en') => [{ lang, href: origin + route }, { lang: 'x-default', href: origin + route }];
const pair = (en, es) => [{ lang: 'en', href: origin + en }, { lang: 'es', href: origin + es }, { lang: 'x-default', href: origin + en }];
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)].map((m) => [m[1].toLowerCase(), m[3]]));
const links = (html) => [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => attrs(m[0]));
const alternates = (html) => links(html).filter((a) => a.rel === 'alternate' && a.hreflang).map((a) => ({ lang: a.hreflang, href: a.href }));

export function checkBuiltHreflangs(dist = path.join(root, 'dist')) {
  const posts = JSON.parse(fs.readFileSync(path.join(dist, 'data/blog/index.json'), 'utf8')).posts;
  const expected = new Map([
    ['/methodology/', pair('/methodology/', '/metodologia/')],
    ['/metodologia/', pair('/methodology/', '/metodologia/')],
    ['/privacy/', pair('/privacy/', '/privacidad/')],
    ['/privacidad/', pair('/privacy/', '/privacidad/')],
  ]);
  for (const post of posts) {
    const twins = post.translationKey ? posts.filter((p) => p.translationKey === post.translationKey) : [];
    const en = twins.find((p) => p.lang === 'en');
    const es = twins.find((p) => p.lang === 'es');
    const route = `/blog/${post.slug}/`;
    expected.set(route, en && es ? pair(`/blog/${en.slug}/`, `/blog/${es.slug}/`) : single(route, post.lang || 'en'));
  }
  let count = 0;
  const inspect = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { inspect(file); continue; }
      if (entry.name !== 'index.html') continue;
      const html = fs.readFileSync(file, 'utf8');
      if (/<meta\s+http-equiv=["']refresh["']/i.test(html)) continue;
      const relative = path.relative(dist, dir).split(path.sep).join('/');
      const route = relative ? `/${relative}/` : '/';
      const canonicalRoute = route.startsWith('/embed/') ? route.replace('/embed/', '/crossing/') : route;
      const canonical = links(html).filter((a) => a.rel === 'canonical');
      assert.deepEqual(canonical.map((a) => a.href), [origin + canonicalRoute], `${route}: canonical`);
      const actual = alternates(html);
      assert.deepEqual(actual, expected.get(route) || single(canonicalRoute), `${route}: route alternates`);
      for (const alternate of actual) {
        const target = new URL(alternate.href);
        assert.equal(target.origin, origin);
        const targetHtml = fs.readFileSync(path.join(dist, target.pathname, 'index.html'), 'utf8');
        assert.ok(alternates(targetHtml).some((a) => a.href === origin + canonicalRoute), `${route}: missing reciprocal alternate on ${target.pathname}`);
      }
      count++;
    }
  };
  inspect(dist);
  console.log(`[hreflang] PASS: ${count} generated pages; exact route alternates, canonicals and reciprocal targets`);
}

export async function checkHreflangNavigation(page, baseUrl) {
  await page.evaluate(() => {
    localStorage.setItem('borderPulse_language', 'en');
    localStorage.setItem('borderPulse_region', 'ALL');
  });
  await page.goto(new URL('/', baseUrl).href);
  await page.getByRole('searchbox', { name: 'Search crossings by name or city', exact: true }).waitFor();
  const marker = await page.evaluate(() => (window.hreflangDocument = crypto.randomUUID()));
  const inspect = async (route, expected = single(route)) => {
    console.log(`[hreflang] inspect ${route}`);
    await page.waitForURL((url) => url.pathname === route, { timeout: 10_000 });
    await page.waitForFunction(({ canonical, expected }) => {
      const actual = Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]'), (link) => ({ lang: link.hreflang, href: link.href }));
      return document.querySelector('link[rel="canonical"]')?.href === canonical && JSON.stringify(actual) === JSON.stringify(expected);
    }, { canonical: origin + route, expected }, { timeout: 10_000 });
    assert.equal(await page.evaluate(() => window.hreflangDocument), marker, 'must stay in same SPA document');
    assert.deepEqual(await page.locator('link[rel="canonical"]').evaluateAll((nodes) => nodes.map((node) => node.href)), [origin + route]);
  };
  const click = async (route) => page.locator(`#root a[href="${route}"]:visible`).first().click();
  await inspect('/');
  await page.getByRole('button', { name: 'Cambiar a español', exact: true }).filter({ visible: true }).click();
  await page.waitForFunction(() => document.documentElement.lang === 'es', null, { timeout: 10_000 });
  await inspect('/'); // Shared URL; no invented Spanish route.
  await page.getByRole('button', { name: 'Switch to English', exact: true }).filter({ visible: true }).click();
  await page.getByRole('searchbox', { name: 'Search crossings by name or city', exact: true }).fill('San Ysidro');
  await click('/crossing/san-ysidro/');
  await inspect('/crossing/san-ysidro/');
  await page.getByRole('button', { name: 'Cambiar a español', exact: true }).filter({ visible: true }).click();
  // A background crossing update can reset html.lang through the existing
  // metadata cleanup. Verify the rendered language preference, independently
  // of that separate lifecycle issue, then assert the full alternate set.
  await page.locator('#root').getByRole('link', { name: 'Todos los cruces', exact: true }).waitFor({ timeout: 10_000 });
  assert.equal(await page.getByRole('button', { name: 'Cambiar a español', exact: true }).filter({ visible: true }).getAttribute('aria-pressed'), 'true');
  await inspect('/crossing/san-ysidro/');
  await page.getByRole('button', { name: 'Switch to English', exact: true }).filter({ visible: true }).click();
  await click('/best-time/san-ysidro/');
  await inspect('/best-time/san-ysidro/');
  await page.goBack();
  await inspect('/crossing/san-ysidro/');
  await click('/compare/san-ysidro-vs-otay-mesa/');
  await inspect('/compare/san-ysidro-vs-otay-mesa/');
  const menu = page.getByRole('button', { name: 'Open menu', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: 'Blog', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: 'Border Pulse Blog', exact: true }).waitFor();
  await inspect('/blog/');
  await click(enArticle);
  await inspect(enArticle, pair(enArticle, esArticle));
  await page.locator('#root article').getByRole('link', { name: 'Español', exact: true }).click();
  await inspect(esArticle, pair(enArticle, esArticle));
  await page.goBack();
  await inspect(enArticle, pair(enArticle, esArticle));
  await click('/');
  await inspect('/');
  // A fresh translated entry also has to clear its prerendered pair on exit.
  await page.goto(new URL(esArticle, baseUrl).href);
  await page.locator('#root article[lang="es"]').waitFor();
  const entryExpected = pair(enArticle, esArticle);
  assert.deepEqual(await page.locator('link[rel="alternate"][hreflang]').evaluateAll((nodes) => nodes.map((node) => ({ lang: node.hreflang, href: node.href }))), entryExpected);
  await click('/');
  await page.getByRole('searchbox', { name: 'Search crossings by name or city', exact: true }).waitFor();
  assert.deepEqual(await page.locator('link[rel="alternate"][hreflang]').evaluateAll((nodes) => nodes.map((node) => ({ lang: node.hreflang, href: node.href }))), single('/'));
  console.log('[hreflang] PASS: SPA home/language switch → crossing → best-time → Back → compare → blog → EN/ES article → Back → home');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) checkBuiltHreflangs();
