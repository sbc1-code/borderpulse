import assert from 'node:assert/strict';
import fs from 'node:fs';

const crossingPath = '/crossing/san-ysidro/';
const enArticle = '/blog/san-ysidro-vs-otay-mesa/';
const esArticle = '/blog/san-ysidro-vs-otay-cual-es-mas-rapida/';
const keys = ['borderPulse_language', 'borderPulse_region', 'borderPulse_theme', 'borderPulse_geoConsent', 'borderPulse_waitHistory_v1', 'borderPulse_waitHistory_v2'];

// Run only against a local preview. Every data response is synthetic; the
// caller blocks external providers and service workers before opening a page.
export async function checkDocumentLanguage(page, context, baseUrl) {
  const origin = new URL(baseUrl).origin;
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(baseUrl).hostname), 'language fixture requires a local preview');
  const saved = await page.evaluate(names => Object.fromEntries(names.map(name => [name, localStorage.getItem(name)])), keys);
  const snapshot = JSON.parse(fs.readFileSync(new URL('../public/data/crossings.json', import.meta.url), 'utf8'));
  const crossing = snapshot.crossings.find(row => row.port_number === '250401');
  assert.ok(crossing, 'San Ysidro source row must exist');
  const aggregate = JSON.parse(fs.readFileSync(new URL('../public/data/aggregates/san-ysidro.json', import.meta.url), 'utf8'));
  assert.ok(aggregate.by_hour?.length, 'delayed aggregate must contain a historical pattern');
  let releaseAggregate;
  const aggregateGate = new Promise(resolve => { releaseAggregate = resolve; });
  let aggregateRequests = 0;
  let feedRequests = 0;
  const feedMatch = url => url.origin === origin && ['/data/crossings.json', '/api/public/crossings'].includes(url.pathname);
  const aggregateMatch = url => url.origin === origin && url.pathname === '/data/aggregates/san-ysidro.json';
  const feedHandler = route => {
    feedRequests++;
    snapshot.fetched_at = new Date().toISOString();
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(snapshot) });
  };
  const aggregateHandler = async route => {
    aggregateRequests++;
    await aggregateGate;
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(aggregate) });
  };
  const inspect = async (route, lang) => {
    console.log(`[document-language] ${route} expected ${lang}`);
    await page.waitForURL(url => url.pathname === route, { timeout: 5_000 });
    try {
      await page.waitForFunction(({ route, lang }) => document.documentElement.lang === lang &&
        document.querySelector('link[rel="canonical"]')?.href === `https://borderpulse.com${route}`,
      { route, lang }, { timeout: 2_000 });
    } catch (error) {
      const actual = await page.evaluate(() => ({ lang: document.documentElement.lang,
        canonical: document.querySelector('link[rel="canonical"]')?.href }));
      throw new Error(`${route}: expected ${lang}; observed ${JSON.stringify(actual)}`, { cause: error });
    }
    assert.equal(await page.locator('html').getAttribute('lang'), lang);
  };
  const click = route => page.locator(`#root a[href="${route}"]:visible`).first().click();
  const switchTo = lang => page.getByRole('button', {
    name: lang === 'es' ? 'Cambiar a español' : 'Switch to English', exact: true,
  }).filter({ visible: true }).click();
  page.setDefaultTimeout(5_000);
  await context.route(feedMatch, feedHandler);
  await context.route(aggregateMatch, aggregateHandler);
  try {
    await page.evaluate(() => {
      localStorage.setItem('borderPulse_language', 'es');
      localStorage.setItem('borderPulse_region', 'ALL');
      localStorage.setItem('borderPulse_geoConsent', 'denied');
    });
    await page.goto(new URL(crossingPath, baseUrl).href);
    await page.locator('#root').getByRole('link', { name: 'Todos los cruces', exact: true }).waitFor();
    await inspect(crossingPath, 'es');
    assert.ok(aggregateRequests > 0, 'crossing must request the held aggregate');
    releaseAggregate();
    await page.waitForFunction(() => document.querySelector('meta[name="description"]')?.content.includes('tendencias históricas'), null, { timeout: 5_000 });
    await inspect(crossingPath, 'es');

    crossing.port_status = 'Open';
    crossing.current_wait_time = 51;
    crossing.lanes.passenger_standard = { status: 'delay', delay_minutes: 51, lanes_open: 1, update_time: 'At 11:00 am PST' };
    await Promise.all([
      page.waitForResponse(response => feedMatch(new URL(response.url())), { timeout: 5_000 }),
      page.evaluate(() => window.dispatchEvent(new Event('online'))),
    ]);
    await page.locator('[data-testid="border-crossing-card"][data-port-number="250401"]').getByText('51', { exact: true }).first().waitFor();
    await inspect(crossingPath, 'es');
    await switchTo('en');
    await inspect(crossingPath, 'en');
    await switchTo('es');
    await inspect(crossingPath, 'es');
    await click('/best-time/san-ysidro/');
    await inspect('/best-time/san-ysidro/', 'es');
    await page.goBack();
    await inspect(crossingPath, 'es');
    await page.goForward();
    await inspect('/best-time/san-ysidro/', 'es');
    await click('/');
    await inspect('/', 'es');
    const menu = page.getByRole('button', { name: 'Open menu', exact: true });
    if (await menu.isVisible()) await menu.click();
    await click('/blog/');
    await inspect('/blog/', 'es');
    // Fixed article content owns its language even with a Spanish UI preference.
    await click(enArticle);
    await page.locator('#root article[lang="en"]').waitFor();
    await inspect(enArticle, 'en');
    await page.locator('#root article').getByRole('link', { name: 'Español', exact: true }).click();
    await inspect(esArticle, 'es');
    await page.goBack();
    await inspect(enArticle, 'en');
    await page.goForward();
    await inspect(esArticle, 'es');
    await click('/');
    await inspect('/', 'es');
    // Explicit EN/ES routes must not inherit a contradictory UI preference.
    for (const [route, lang] of [['/methodology/', 'en'], ['/metodologia/', 'es'], ['/privacy/', 'en'], ['/privacidad/', 'es']]) {
      await page.goto(new URL(route, baseUrl).href);
      await inspect(route, lang);
      await switchTo(lang === 'en' ? 'es' : 'en');
      await inspect(route, lang);
      await page.evaluate(() => {
        localStorage.setItem('borderPulse_language', 'es');
      });
    }
    assert.ok(feedRequests > 1, 'must exercise a genuine feed refresh');
    assert.ok(aggregateRequests > 0, 'must exercise delayed aggregate arrival');
    console.log('[document-language] PASS: delayed aggregate, feed refresh, switching, Back/Forward, shared pages and EN/ES content-owned pages');
  } finally {
    releaseAggregate();
    try {
      await page.goto(new URL('/methodology/', baseUrl).href);
      await page.evaluate(values => {
        for (const [name, value] of Object.entries(values)) {
          if (value === null) localStorage.removeItem(name);
          else localStorage.setItem(name, value);
        }
      }, saved);
    } finally {
      await context.unroute(feedMatch, feedHandler);
      await context.unroute(aggregateMatch, aggregateHandler);
      page.setDefaultTimeout(10_000);
    }
  }
}
