import assert from 'node:assert/strict';

const lane = (delay_minutes, status = 'delay', lanes_open = 1, update_time = 'At 10:00 pm PST') => ({
  delay_minutes, status, lanes_open, update_time,
});

function snapshot() {
  return {
    source: 'U.S. Customs and Border Protection',
    fetched_at: new Date().toISOString(),
    count: 2,
    crossings: [
      {
        port_number: '250601',
        name: 'Otay Mesa',
        state: 'CA',
        port_status: 'Open',
        hours: '24 hrs/day',
        lanes: {
          passenger_standard: lane(60),
          passenger_ready: lane(110),
          passenger_sentri: lane(10, 'no delay'),
          pedestrian_standard: lane(30),
          pedestrian_ready: null,
        },
      },
      {
        port_number: '250401',
        name: 'San Ysidro',
        state: 'CA',
        port_status: 'Open',
        hours: '24 hrs/day',
        lanes: {
          passenger_standard: lane(40, 'delay', 2, 'At 9:00 pm PST'),
          passenger_ready: lane(20, 'delay', 2, 'At 9:00 pm PST'),
          passenger_sentri: null,
          pedestrian_standard: null,
          pedestrian_ready: null,
        },
      },
    ],
  };
}

const history = {
  lookback_days: 30,
  snapshot_count: 20,
  window_start: '2026-10-01T10:00:00Z',
  window_end: '2026-10-02T10:00:00Z',
  crossings: [
    {
      port_number: '250601',
      slug: 'otay-mesa',
      name: 'Otay Mesa',
      timezone: 'America/Los_Angeles',
      lanes: {
        passenger_ready: {
          paired: 80, slower: 12, faster: 60, same: 8,
          by_hour: {
            8: { paired: 10, slower: 1, faster: 8, same: 1 },
            15: { paired: 10, slower: 4, faster: 5, same: 1 },
          },
        },
        passenger_sentri: {
          paired: 40, slower: 2, faster: 36, same: 2,
          by_hour: { 8: { paired: 8, slower: 0, faster: 8, same: 0 } },
        },
      },
    },
    {
      port_number: '250401',
      slug: 'san-ysidro',
      name: 'San Ysidro',
      timezone: 'America/Los_Angeles',
      lanes: {
        passenger_ready: {
          paired: 20, slower: 1, faster: 18, same: 1,
          by_hour: { 8: { paired: 8, slower: 0, faster: 8, same: 0 } },
        },
      },
    },
  ],
};

async function fits(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

export async function checkLaneFlips(browser, baseUrl, viewport) {
  const context = await browser.newContext({
    viewport,
    isMobile: viewport.width < 800,
    hasTouch: viewport.width < 800,
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  const feed = snapshot();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== baseUrl.origin) return route.abort();
    if (url.pathname === '/data/lane-flips.json') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(history) });
    }
    if (url.pathname === '/data/crossings.json' || url.pathname === '/api/public/crossings') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(feed) });
    }
    return route.continue();
  });

  try {
    await page.goto(new URL('/lane-flip/', baseUrl).href, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { level: 1, name: 'Lane Flip Watch', exact: true }).waitFor();
    const flips = await page.getByTestId('lane-flip-flips').innerText();
    assert.match(flips, /Otay Mesa/);
    assert.match(flips, /50 min/);
    assert.doesNotMatch(flips, /San Ysidro/);
    assert.match(await page.locator('#root').innerText(), /Check CBP before leaving/);
    assert.ok(await fits(page), 'index overflows');

    await page.getByTestId('lane-flip-picker').selectOption('otay-mesa');
    await page.waitForURL(url => url.pathname === '/lane-flip/otay-mesa/');
    await page.getByRole('heading', { level: 1, name: 'Lane Flip Watch at Otay Mesa', exact: true }).waitFor();
    const ready = page.getByTestId('verdict-passenger_ready');
    await page.getByTestId('period-passenger_ready').waitFor();
    await ready.waitFor();
    assert.equal(await ready.getAttribute('data-state'), 'slower');
    assert.match(await ready.innerText(), /In the latest fetch, Ready Lane is reported 50 min slower than general/);
    assert.equal(await page.getByTestId('verdict-passenger_sentri').getAttribute('data-state'), 'faster');
    assert.equal(await page.getByTestId('period-passenger_ready').getAttribute('data-slower'), '12');
    assert.equal(await page.getByTestId('period-passenger_ready').getAttribute('data-paired'), '80');
    assert.doesNotMatch(await page.locator('#root').innerText(), /30 min slower/);
    await page.getByTestId('hour-passenger_ready-8').click();
    await page.waitForFunction(() => document.querySelector('[data-testid="hour-detail-passenger_ready"]')?.getAttribute('data-hour') === '8');
    assert.match(await page.getByTestId('hour-detail-passenger_ready').innerText(), /1 slower, 8 faster, and 1 the same, out of 10 fetches with both lane values/);
    await page.getByTestId('hour-passenger_ready-15').click();
    await page.waitForFunction(() => document.querySelector('[data-testid="hour-detail-passenger_ready"]')?.getAttribute('data-hour') === '15');
    const hour15 = await page.getByTestId('hour-detail-passenger_ready').innerText();
    assert.match(hour15, /4 of 10/);
    assert.doesNotMatch(hour15, /usually/);
    assert.match(await page.getByTestId('lane-flip-share-text').innerText(), /https:\/\/borderpulse.com\/lane-flip\/otay-mesa\//);
    assert.match(await page.getByTestId('lane-flip-share-text').innerText(), /110 min/);
    assert.match(await page.getByTestId('lane-flip-share-text').innerText(), /At 10:00 pm PST/);
    await page.waitForFunction(() => document.querySelector('link[rel="canonical"]')?.href === 'https://borderpulse.com/lane-flip/otay-mesa/');
    assert.match(await page.getByTestId('lane-flip-coverage').innerText(), /2026-/);
    assert.match(await page.getByTestId('lane-flip-coverage').innerText(), /without reconstruction from raw/);
    assert.match(await page.getByTestId('pair-clocks-passenger_ready').innerText(), /General:.*Ready Lane:/);
    assert.match(await page.getByTestId('lane-flip-coverage').innerText(), /Stale archive/);
    const radio = page.getByTestId('hour-passenger_ready-15');
    await radio.focus();
    await page.keyboard.press('ArrowRight');
    await page.getByTestId('hour-passenger_ready-16').evaluate(el => { if (document.activeElement !== el) throw new Error('hour keyboard focus not moved'); });
    assert.doesNotMatch(await page.locator('#root').innerText(), /Right now|usually|last 30 days/);
    assert.ok(await fits(page), 'detail overflows');

    const navName = viewport.width < 1024 ? null : 'Main navigation';
    if (viewport.width < 1024) await page.getByRole('button', { name: 'Open menu' }).click();
    const nav = navName ? page.getByRole('navigation', { name: navName }) : page.locator('#mobile-navigation');
    await nav.getByRole('link', { name: 'Lane flips' }).waitFor();

    await page.getByRole('button', { name: 'Cambiar a español' }).click();
    await page.getByRole('heading', { level: 1, name: 'Ready y SENTRI frente al carril general en Otay Mesa', exact: true }).waitFor();
    assert.match(await page.getByTestId('verdict-passenger_ready').innerText(), /En la última consulta, Ready Lane se reporta 50 min más lento que el general/);
    assert.match(await page.locator('#root').innerText(), /Revisa CBP antes de salir/);
    assert.match(await page.getByTestId('lane-flip-coverage').innerText(), /Archivo desactualizado/);
    assert.match(await page.locator('#root').innerText(), /no autoriza el uso/);
    assert.match(await page.locator('#root').innerText(), /no un pronóstico/);
    assert.ok(await fits(page), 'Spanish detail overflows');
    if (viewport.width < 1024 && !(await page.locator('#mobile-navigation').isVisible())) {
      await page.getByRole('button', { name: 'Open menu' }).click();
    }
    const spanishNav = viewport.width < 1024
      ? page.locator('#mobile-navigation')
      : page.getByRole('navigation', { name: 'Navegación principal' });
    await spanishNav.getByRole('link', { name: 'Carril rápido' }).waitFor();

    feed.fetched_at = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByTestId('verdict-passenger_ready').waitFor();
    const stale = await page.getByTestId('verdict-passenger_ready').innerText();
    assert.match(stale, /En el último reporte/);
    assert.match(stale, /50 min/);
    assert.doesNotMatch(stale, /Ahora mismo/);
    assert.match(await page.locator('#root').innerText(), /110 min/);

    feed.fetched_at = new Date().toISOString();
    feed.crossings[0].port_status = 'Closed';
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByTestId('verdict-passenger_ready').waitFor();
    assert.equal(await page.getByTestId('verdict-passenger_ready').getAttribute('data-state'), 'closed');
    assert.doesNotMatch(await page.locator('#root').innerText(), /110 min/);

    feed.crossings[0].port_status = 'Open';
    feed.crossings[0].lanes.passenger_ready = lane(20, 'delay', 0);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByTestId('verdict-passenger_ready').waitFor();
    assert.equal(await page.getByTestId('verdict-passenger_ready').getAttribute('data-state'), 'no-open');
    assert.doesNotMatch(await page.getByTestId('verdict-passenger_ready').innerText(), /20 min/);
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally {
    await context.close();
  }
}
