import assert from 'node:assert/strict';
import fs from 'node:fs';

const PORT = '260401';
const DETAIL_PATH = '/crossing/nogales-deconcini/';
const FEED_PATHS = ['/data/crossings.json', '/api/public/crossings'];
const FIXTURE_HEADER = 'x-borderpulse-report-time-fixture';
const STORAGE_KEYS = [
  'borderPulse_language', 'borderPulse_region', 'borderPulse_geoConsent',
  'borderPulse_waitHistory_v1', 'borderPulse_theme',
];
const LANE_LABELS = {
  passenger_standard: { en: 'Standard', es: 'Estándar' },
  passenger_ready: { en: 'Ready Lane', es: 'Ready Lane' },
  passenger_sentri: { en: 'SENTRI', es: 'SENTRI' },
  pedestrian_standard: { en: 'Pedestrian', es: 'Peatones' },
  pedestrian_ready: { en: 'Pedestrian Ready', es: 'Peatones Ready' },
  commercial_standard: { en: 'Commercial', es: 'Comercial' },
  commercial_fast: { en: 'FAST', es: 'FAST' },
};

const reportLabel = (language, raw) => raw
  ? `${language === 'en' ? 'CBP reported: ' : 'Reporte CBP: '}${raw}`
  : (language === 'en' ? 'CBP report time unavailable' : 'Hora del reporte CBP no disponible');
const freshLabel = language => language === 'en' ? 'Fetched just now' : 'Consulta: ahora mismo';
const lane = (delay_minutes, update_time, status = 'delay') => ({
  delay_minutes, update_time, status, lanes_open: 1,
});
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function expectText(locator, expected, message) {
  const pattern = expected instanceof RegExp ? expected : new RegExp(`^\\s*${escapeRegex(expected)}\\s*$`);
  await locator.filter({ hasText: pattern }).waitFor({ timeout: 5_000 });
  const actual = (await locator.innerText()).trim();
  if (expected instanceof RegExp) assert.match(actual, expected, message);
  else assert.equal(actual, expected, message);
}

async function assertFits(page, label) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    `${label}: page must fit the current viewport`);
  const overflowing = await page.getByTestId('cbp-report-time').evaluateAll(nodes => nodes
    .filter(node => node.getClientRects().length)
    .filter(node => {
      const rect = node.getBoundingClientRect();
      return rect.left < -1 || rect.right > innerWidth + 1
        || (node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 1);
    }).map(node => node.textContent));
  assert.deepEqual(overflowing, [], `${label}: report labels must wrap without clipping`);
}

async function assertDarkReadability(page) {
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
  try {
    await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
    const contrasts = await page.getByTestId('cbp-report-time').evaluateAll(nodes => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const rgba = color => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data].map(value => value / 255);
      };
      const over = (top, bottom) => top.slice(0, 3).map((value, i) => value * top[3] + bottom[i] * (1 - top[3]));
      const luminance = color => color.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
        .reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
      return nodes.filter(node => node.getClientRects().length).map(node => {
        const ancestors = [];
        for (let element = node; element; element = element.parentElement) ancestors.unshift(element);
        const background = ancestors.reduce((color, element) => over(rgba(getComputedStyle(element).backgroundColor), color), [1, 1, 1]);
        const foreground = over(rgba(getComputedStyle(node).color), background);
        const levels = [luminance(background), luminance(foreground)].sort((a, b) => a - b);
        return { text: node.textContent, ratio: (levels[1] + 0.05) / (levels[0] + 0.05) };
      });
    });
    assert.ok(contrasts.length > 0, 'dark-mode check must see report labels');
    for (const { text, ratio } of contrasts) {
      assert.ok(ratio >= 4.5, `dark-mode report text contrast ${ratio.toFixed(2)}: ${text}`);
    }
    await assertFits(page, 'dark-mode report labels');
  } finally {
    await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
    await page.waitForFunction(() => !document.documentElement.classList.contains('dark'));
  }
}

async function assertPrimary(card, language, wait, raw, fetched = freshLabel(language)) {
  await expectText(card.getByTestId('primary-wait'), wait == null ? '—' : String(wait),
    'report-time copy must not change the primary wait');
  const labels = card.getByTestId('cbp-report-time');
  if (wait == null) {
    assert.equal(await labels.count(), 0, 'a pending/closed primary wait must not gain a numeric report label');
  } else {
    await expectText(labels, reportLabel(language, raw), 'primary report must preserve the exact source clock');
    assert.equal(await labels.count(), 1, 'collapsed card has exactly one primary report label');
  }
  await expectText(card.getByTestId('snapshot-freshness'), fetched, 'footer must describe fetch freshness');
  assert.equal(await card.getByText(/^(Live|En vivo)$/).count(), 0, 'no card freshness badge may claim Live');
}

async function assertLanes(scope, language, lanes, keys) {
  assert.equal(await scope.getByTestId('lane-row').count(), keys.length, 'expected numeric lane rows');
  for (const key of keys) {
    const row = scope.getByTestId('lane-row').filter({
      has: scope.page().getByText(LANE_LABELS[key][language], { exact: true }),
    });
    assert.equal(await row.count(), 1, `${key}: one correctly identified lane`);
    await row.getByText(`${lanes[key].delay_minutes}m`, { exact: true }).waitFor();
    await expectText(row.getByTestId('cbp-report-time'), reportLabel(language, lanes[key].update_time),
      `${key}: use its own raw clock/timezone, never another lane's time`);
  }
}

// Headless browsers do not consistently background tabs. Dispatch the actual
// subscription events with a temporary visibility override, then restore it.
async function returnToTab(page) {
  await page.evaluate(() => {
    const original = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    try {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    } finally {
      if (original) Object.defineProperty(document, 'visibilityState', original);
      else delete document.visibilityState;
    }
  });
}

// Called once per existing smoke-routes desktop/mobile profile. That context
// blocks external origins and service workers; both CBP paths are intercepted
// here, so neither the real server endpoint nor an ad provider is exercised.
export async function checkReportTimes(page, context, baseUrl) {
  const origin = new URL(baseUrl).origin;
  assert.equal(new URL(page.url()).origin, origin, 'caller must first open the app origin');
  const savedStorage = await page.evaluate(keys => Object.fromEntries(
    keys.map(key => [key, localStorage.getItem(key)])), STORAGE_KEYS);
  const snapshot = JSON.parse(fs.readFileSync(new URL('../public/data/crossings.json', import.meta.url), 'utf8'));
  const crossing = snapshot.crossings.find(row => row.port_number === PORT);
  assert.ok(crossing, 'Nogales DeConcini fixture must exist');
  let mode = 'normal';
  let feedRequests = 0;
  const responses = [];
  const recordResponse = response => responses.push(response);
  const feedMatcher = url => url.origin === origin && FEED_PATHS.includes(url.pathname);
  const feedHandler = route => {
    feedRequests += 1;
    const isLive = new URL(route.request().url()).pathname === '/api/public/crossings';
    const failed = mode === 'fail-all' || (mode === 'static-fallback' && isLive);
    return route.fulfill({
      status: failed ? 503 : 200,
      contentType: 'application/json',
      headers: { [FIXTURE_HEADER]: 'true', 'cache-control': 'no-store' },
      body: JSON.stringify(failed ? { error: 'Synthetic feed unavailable' } : snapshot),
    });
  };
  const card = () => page.locator(`[data-testid="border-crossing-card"][data-port-number="${PORT}"]`);
  const section = language => page.locator('section').filter({ has: page.getByRole('heading', {
    level: 2, name: language === 'en' ? 'Latest lane reports' : 'Últimos reportes por carril', exact: true,
  }) });
  const search = async language => {
    await page.getByRole('searchbox', {
      name: language === 'en' ? 'Search crossings by name or city' : 'Buscar cruces por nombre o ciudad', exact: true,
    }).fill('Deconcini');
    await card().waitFor();
  };
  const waitForFeed = async action => {
    await Promise.all([
      page.waitForResponse(response => {
        const url = new URL(response.url());
        return feedMatcher(url) && (mode === 'normal' || url.pathname === '/data/crossings.json');
      }, { timeout: 5_000 }).then(response => response.finished()),
      action(),
    ]);
    // Let response parsing, subscription notifications and React commit finish.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  };
  const setStandard = (wait, raw, status = wait === 0 ? 'no delay' : 'delay') => {
    if (mode === 'normal') snapshot.fetched_at = new Date().toISOString();
    crossing.current_wait_time = wait;
    crossing.status = wait == null ? 'unknown' : wait < 15 ? 'good' : wait < 45 ? 'moderate' : 'heavy';
    crossing.lanes.passenger_standard = lane(wait, raw, status);
  };

  await context.route(feedMatcher, feedHandler);
  page.on('response', recordResponse);
  try {
    for (const language of ['en', 'es']) {
      mode = 'normal';
      snapshot.fetched_at = new Date().toISOString();
      crossing.port_status = 'Open';
      // A conflicting old aggregate row timestamp must never replace fetched_at.
      crossing.updated_at = '2001-01-02T03:04:05.000Z';
      crossing.lanes = {
        passenger_standard: lane(37, 'At 11:00 pm MST'),
        passenger_ready: lane(13, 'At 12:05 am MDT'),
        passenger_sentri: lane(0, 'At 1:15 am PST', 'no delay'),
        pedestrian_standard: lane(4, 'At 1:25 am PDT'),
        pedestrian_ready: lane(8, 'At 2:35 am EST'),
        commercial_standard: lane(22, 'At 3:45 am CDT'),
        commercial_fast: lane(7, 'At 4:55 am CST'),
      };
      setStandard(37, 'At 11:00 pm MST');
      await page.evaluate(lang => {
        localStorage.setItem('borderPulse_language', lang);
        localStorage.setItem('borderPulse_region', 'ALL');
        localStorage.setItem('borderPulse_theme', 'light');
        localStorage.setItem('borderPulse_geoConsent', 'denied');
      }, language);
      await page.goto(new URL('/', baseUrl).href);
      await search(language);
      await assertPrimary(card(), language, 37, 'At 11:00 pm MST');
      await assertFits(page, `${language} dashboard`);

      // Drawer and always-visible detail share LaneRow but must retain each
      // lane's own time, including zero waits and differing DST abbreviations.
      await card().getByRole('button', { name: language === 'en' ? 'More options' : 'Más opciones', exact: true }).click();
      await page.getByRole('menuitem', { name: language === 'en' ? 'Show lanes' : 'Ver carriles', exact: true }).click();
      await card().getByTestId('lane-row').first().waitFor();
      await assertLanes(card(), language, crossing.lanes, Object.keys(LANE_LABELS).filter(key => key !== 'pedestrian_ready'));
      await assertFits(page, `${language} expanded drawer`);
      await assertDarkReadability(page);
      await card().getByRole('button', { name: language === 'en' ? 'More options' : 'Más opciones', exact: true }).click();
      await page.getByRole('menuitem', { name: language === 'en' ? 'Hide lanes' : 'Ocultar carriles', exact: true }).click();
      await card().getByTestId('lane-row').first().waitFor({ state: 'detached' });
      await assertPrimary(card(), language, 37, 'At 11:00 pm MST');
      await waitForFeed(() => card().getByRole('link', { name: crossing.name, exact: true }).click());
      await page.waitForURL(url => url.pathname === DETAIL_PATH);
      await section(language).waitFor();
      await assertPrimary(card(), language, 37, 'At 11:00 pm MST');
      await assertLanes(section(language), language, crossing.lanes, Object.keys(LANE_LABELS));
      assert.equal(await page.getByRole('heading', { name: /^(Lanes right now|Carriles ahora mismo)$/ }).count(), 0);
      await assertFits(page, `${language} detail`);
      await waitForFeed(() => page.goBack());
      await page.waitForURL(url => url.pathname === '/');
      await search(language);
      await assertPrimary(card(), language, 37, 'At 11:00 pm MST');

      setStandard(41, 'At 12:15 am MDT');
      snapshot.fetched_at = new Date().toISOString();
      await waitForFeed(() => page.getByRole('button', { name: language === 'en' ? 'Refresh' : 'Actualizar', exact: true }).click());
      await assertPrimary(card(), language, 41, 'At 12:15 am MDT');
      setStandard(43, 'At 1:05 am PDT');
      snapshot.fetched_at = new Date().toISOString();
      await waitForFeed(() => returnToTab(page));
      await assertPrimary(card(), language, 43, 'At 1:05 am PDT');

      setStandard(31, null);
      await page.goto(new URL(DETAIL_PATH, baseUrl).href);
      await section(language).waitFor();
      await assertPrimary(card(), language, 31, null);
      await assertLanes(section(language), language, crossing.lanes, Object.keys(LANE_LABELS));
      await assertFits(page, `${language} missing source time`);

      setStandard(0, 'At 1:15 am PST');
      await page.reload();
      await section(language).waitFor();
      await assertPrimary(card(), language, 0, 'At 1:15 am PST');
      await assertLanes(section(language), language, crossing.lanes, Object.keys(LANE_LABELS));

      // Keep CBP's pending zero stub: it must not create a zero primary wait.
      setStandard(null, 'At 11:00 pm MST', 'Update Pending');
      crossing.lanes.passenger_standard.delay_minutes = 0;
      await page.reload();
      await section(language).waitFor();
      await assertPrimary(card(), language, null, null);
      await card().getByText(language === 'en' ? 'No current wait time reported' : 'No hay tiempo actual reportado', { exact: true }).waitFor();
      await assertLanes(section(language), language, crossing.lanes, Object.keys(LANE_LABELS).filter(key => key !== 'passenger_standard'));

      // A retained numeric lane does not override an official port closure.
      crossing.port_status = 'Closed';
      setStandard(90, 'At 11:00 pm MST');
      await page.reload();
      await card().waitFor();
      await assertPrimary(card(), language, null, null);
      await card().getByText(language === 'en' ? 'Closed now' : 'Cerrado ahora', { exact: true }).waitFor();
      await assertFits(page, `${language} closed primary state`);

      // A new document resets the in-memory cache, allowing an intentionally
      // older static snapshot. Live-API builds first receive a synthetic 503.
      mode = 'static-fallback';
      snapshot.fetched_at = new Date(Date.now() - 3 * 60 * 60_000).toISOString();
      crossing.updated_at = new Date().toISOString();
      crossing.port_status = 'Open';
      setStandard(17, 'At 1:15 am PST');
      await page.goto(new URL('/', baseUrl).href);
      await search(language);
      const stale = language === 'en'
        ? /^Stale snapshot · Fetched 3 h(?: \d+ min)? ago$/
        : /^Consulta desactualizada · Consulta: hace 3 h(?: \d+ min)?$/;
      await assertPrimary(card(), language, 17, 'At 1:15 am PST', stale);
      await waitForFeed(() => card().getByRole('link', { name: crossing.name, exact: true }).click());
      await page.waitForURL(url => url.pathname === DETAIL_PATH);
      await section(language).waitFor();
      await assertPrimary(card(), language, 17, 'At 1:15 am PST', stale);
      await assertFits(page, `${language} stale detail`);

      mode = 'fail-all';
      await waitForFeed(() => returnToTab(page));
      await assertPrimary(card(), language, 17, 'At 1:15 am PST', stale);
      mode = 'normal';
      snapshot.fetched_at = new Date().toISOString();
      setStandard(29, 'At 2:05 am EDT');
      await waitForFeed(() => page.evaluate(() => window.dispatchEvent(new Event('online'))));
      await assertPrimary(card(), language, 29, 'At 2:05 am EDT');
      await assertLanes(section(language), language, crossing.lanes, Object.keys(LANE_LABELS));
      await assertFits(page, `${language} recovered detail`);
    }

    assert.ok(feedRequests > 0, 'the synthetic feed must actually be requested');
    for (const response of responses) {
      const url = new URL(response.url());
      assert.equal(url.origin, origin, `unexpected provider response: ${url.href}`);
      if (FEED_PATHS.includes(url.pathname)) {
        assert.equal(await response.headerValue(FIXTURE_HEADER), 'true', `feed bypassed its mock: ${url.href}`);
      } else {
        assert.ok(!url.pathname.startsWith('/api/'), `unexpected real server response: ${url.href}`);
      }
    }
  } finally {
    // Finish on a non-data page so the singleton cannot refresh synthetic data
    // after the route mocks are removed. A following navigation remounts it.
    try {
      await page.goto(new URL('/about/', baseUrl).href);
      await page.evaluate(values => {
        for (const [key, value] of Object.entries(values)) {
          if (value == null) localStorage.removeItem(key);
          else localStorage.setItem(key, value);
        }
      }, savedStorage);
    } finally {
      page.off('response', recordResponse);
      await context.unroute(feedMatcher, feedHandler);
    }
  }
  console.log('[report-times] PASS: EN/ES raw lane clocks, missing/zero/pending/closed waits, drawer/detail/Back, refresh/tab return, stale fallback/recovery, dark contrast and viewport fit');
}
