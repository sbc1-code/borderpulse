import assert from 'node:assert/strict';
import fs from 'node:fs';
import { crossingMapLocation, projectBorderPoint } from '../src/lib/borderMap.js';
const inspectMapPoint = (node, position) => {
  const g = node.parentElement,
    point = node.ownerSVGElement.createSVGPoint();
  point.x = position.x;
  point.y = position.y;
  const expected = point.matrixTransform(g.getScreenCTM()),
    actual = node.querySelector('.portDot').getBoundingClientRect();
  return {
    error: Math.hypot(actual.x + actual.width / 2 - expected.x, actual.y + actual.height / 2 - expected.y),
    pathCount: g.querySelectorAll('path.country').length
  };
};

// Deterministic observations are test fixtures only. Review screenshots are
// captured separately from the unmodified repository snapshot.
export async function checkBorderMap(browser, baseUrl, viewport) {
  const context = await browser.newContext({
    viewport,
    serviceWorkers: 'block'
  });
  const document = JSON.parse(fs.readFileSync(new URL('../public/data/crossings.json', import.meta.url)));
  document.fetched_at = new Date().toISOString();
  const port = document.crossings.find(c => c.port_number === '250401');
  const set = (key, value, status = 'Delay', open = 1) => port.lanes[key] = {
    delay_minutes: value,
    status,
    lanes_open: open,
    update_time: 'At 11:11 am PST'
  };
  set('passenger_standard', 80);
  set('passenger_ready', 0, 'No Delay');
  set('passenger_sentri', null, 'Update Pending');
  set('pedestrian_standard', 10);
  const source = port => ({
    port_number: port,
    current_wait_time: 0
  });
  const archive = {
    snapshots: [{
      fetched_at: '2026-10-30T10:00:00Z',
      source: 'commit:' + 'a'.repeat(40),
      crossings: [source('250401')]
    }, {
      fetched_at: '2026-10-30T11:00:00Z',
      crossings: [{
        port_number: '250401',
        current_wait_time: null
      }]
    }]
  };
  let apiFailed = false,
    allFailed = false,
    historyFailed = false;
  await context.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.origin !== baseUrl.origin) return route.abort('blockedbyclient');
    if (['/data/crossings.json', '/api/public/crossings'].includes(u.pathname)) return allFailed || apiFailed && u.pathname.startsWith('/api/') ? route.fulfill({
      status: 503,
      body: 'fixture unavailable'
    }) : route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(document)
    });
    if (u.pathname === '/data/snapshot-history.json') return historyFailed ? route.fulfill({
      status: 503,
      body: 'unavailable'
    }) : route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(archive)
    });
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const explorer = () => page.getByTestId('border-map-explorer');
  const wait = () => page.getByTestId('primary-wait');
  const lane = () => page.getByLabel(/Your lane|Tu carril/, {
    exact: true
  });
  const openResult = async () => {
    await page.locator('#map-result-250401').click();
    await page.getByTestId('border-crossing-card').waitFor();
  };
  const expectWait = async value => {
    await page.waitForFunction(value => document.querySelector('[data-testid="primary-wait"]')?.textContent === value, value);
    assert.equal(await wait().innerText(), value);
  };
  const fits = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `map viewport fits ${viewport.width}`);
  try {
    for (const lang of ['en', 'es']) {
      const es = lang === 'es';
      await page.addInitScript(lang => {
        localStorage.setItem('borderPulse_language', lang);
        localStorage.setItem('borderPulse_corridor', 'san-diego-tijuana');
        localStorage.setItem('borderPulse_region', 'CA');
      }, lang);
      await page.goto(new URL('/?area=all', baseUrl).href);
      await explorer().waitFor();
      assert.equal(await page.locator('.crossingResultList li').count(), document.crossings.length, 'All crossings defeats saved regional preferences');
      const states = await page.locator('.crossingResultList button small').allTextContents();
      for (const state of ['CA', 'AZ', 'NM', 'TX']) assert.ok(states.some(s => s.startsWith(state)));
      assert.equal(await page.locator('nav a[href*="/corridor/"]').count(), 0, 'no regional navigation silo');
      await page.locator('.mapSources summary').click();
      await page.getByTestId('map-location-coverage').waitFor();
      assert.match(await page.getByTestId('map-location-coverage').innerText(), es ? /38 puntos aproximados · 4 registros solo en la lista/ : /38 approximate points · 4 list-only records/);
      assert.match(await page.locator('.mapSources').innerText(), es ? /26 puntos heredados sin verificación independiente/ : /26 inherited points without independent verification/);
      await page.locator('.mapSources summary').click();
      const controls = page.getByRole('group', {
        name: es ? 'Vista de cruces' : 'Crossing view',
        exact: true
      });
      await page.getByLabel(es ? 'Tu zona de cruce' : 'Your crossing area', {
        exact: true
      }).selectOption('san-diego-tijuana');
      await page.waitForFunction(() => document.querySelectorAll('.crossingResultList li').length === 3);
      const location = crossingMapLocation(port),
        expectedPoint = projectBorderPoint(location.lng, location.lat);
      const marker = page.locator('[data-map-node][data-port="250401"]');
      const projected = await marker.evaluate(inspectMapPoint, expectedPoint);
      await marker.locator('.portDot').evaluate(n => n.setAttribute('cx', '100'));
      assert.ok((await marker.evaluate(inspectMapPoint, expectedPoint)).error > .6, 'negative control detects a shifted painted point');
      await marker.locator('.portDot').evaluate(n => n.removeAttribute('cx'));
      assert.ok(projected.error < .6, `geography and marker share the same actual transform: ${JSON.stringify(projected)}`);
      assert.equal(projected.pathCount, 2);
      await page.waitForFunction(() => {
        const text = document.querySelector('[data-port="250401"] .portWait');
        if (!text) return false;
        const m = text.getScreenCTM();
        return parseFloat(getComputedStyle(text).strokeWidth) * Math.hypot(m.a, m.b) <= 3.05;
      });
      await marker.focus();
      await page.keyboard.press('Enter');
      await expectWait('80');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.activeElement?.matches('[data-port="250401"]'));
      await page.getByRole('button', {
        name: es ? 'Todos los cruces' : 'All crossings',
        exact: true
      }).click();
      await page.waitForFunction(n => document.querySelectorAll('.crossingResultList li').length === n, document.crossings.length);
      await openResult();
      await expectWait('80');
      assert.match(await page.getByTestId('location-evidence').innerText(), es ? /sin verificación independiente/ : /not independently verified/);
      assert.match(await page.getByTestId('cbp-report-time').innerText(), /11:11 am PST/, 'original report clock retained');
      assert.equal(new URL(page.url()).searchParams.get('port'), '250401');
      await lane().selectOption('passenger_ready');
      await expectWait('0');
      await page.goBack();
      await page.waitForFunction(() => document.querySelector('[data-testid="primary-wait"]')?.textContent === '80');
      await lane().selectOption('passenger_sentri');
      await expectWait('—');
      await page.keyboard.press('Escape');
      await page.locator('#map-result-250401').waitFor();
      await page.waitForFunction(() => document.activeElement?.id === 'map-result-250401');
      await controls.getByRole('button', {
        name: es ? 'Lista' : 'List',
        exact: true
      }).click();
      await page.getByTestId('border-crossing-card').first().waitFor();
      assert.equal(await lane().inputValue(), 'passenger_sentri');
      await page.getByRole('group', {
        name: es ? 'Vista de cruces' : 'Crossing view',
        exact: true
      }).getByRole('button', {
        name: es ? 'Mapa' : 'Map',
        exact: true
      }).click();
      await explorer().waitFor();
      await openResult();
      await page.getByRole('searchbox').fill('San');
      await page.waitForFunction(() => !new URL(location.href).searchParams.has('port'));
      assert.equal(await page.getByRole('searchbox').evaluate(n => n === document.activeElement), true, 'filtering keeps search focus');
      await page.getByRole('searchbox').fill('');
      await page.waitForURL(url => !url.searchParams.has('q'));
      await page.waitForFunction(n => document.querySelectorAll('.crossingResultList li').length === n, document.crossings.length);
      await explorer().getByRole('button', {
        name: es ? 'Historial registrado' : 'Recorded history',
        exact: true
      }).click();
      await page.locator('.archiveControl input').waitFor();
      await page.waitForFunction(n => Number(document.querySelector('.archiveControl input')?.max) === n, archive.snapshots.length - 1);
      await page.getByRole('button', {
        name: es ? 'Elegir auto estándar' : 'Choose Standard passenger',
        exact: true
      }).click();
      assert.equal(await page.locator('#map-result-250401 strong').innerText(), '—', 'all-missing historical observation is preserved');
      await page.waitForURL(url => url.searchParams.get('lane') === 'passenger_standard');
      // Scrub immediately after the lane URL update: the range action must
      // preserve Standard even when a router render is still in flight.
      const slider = page.locator('.archiveControl input');
      await slider.press('Home');
      try {
        await page.waitForFunction(() => document.querySelector('#map-result-250401 strong')?.textContent === '0min');
      } catch (error) {
        console.error('[border-map-replay-diagnostic]', JSON.stringify(await page.evaluate(() => ({
          url: location.href,
          range: document.querySelector('.archiveControl input')?.value,
          focus: document.activeElement?.outerHTML,
          row: document.querySelector('#map-result-250401')?.textContent
        }))));
        throw error;
      }
      await page.locator('#map-result-250401').click();
      await page.locator('.recordedReport').waitFor();
      assert.match(await page.locator('.recordedReport').innerText(), es ? /no conserva horas/ : /does not retain lane report clocks/);
      assert.equal(await page.getByTestId('cbp-report-time').count(), 0, 'history cannot invent lane clocks');
      await page.keyboard.press('Escape');
      await page.waitForURL(url => !url.searchParams.has('port'));
      await page.locator('#map-result-250401').waitFor();
      await explorer().getByRole('button', {
        name: es ? 'Últimos reportes' : 'Latest reports',
        exact: true
      }).click();
      await page.waitForURL(url => !url.searchParams.has('mode'));
      await page.waitForFunction(() => /Latest reports|Últimos reportes/.test(document.querySelector('.explorerMode button[aria-pressed="true"]')?.textContent || ''));
      await page.waitForFunction(n => document.querySelectorAll('.crossingResultList li').length === n, document.crossings.length);
      const beforeTexas = page.url();
      await page.getByRole('button', {
        name: 'Texas',
        exact: true
      }).click();
      await page.waitForURL(url => url.searchParams.get('region') === 'TX');
      await page.waitForFunction(n => document.querySelectorAll('.crossingResultList li').length === n, document.crossings.filter(row => row.state === 'TX').length);
      assert.ok((await page.locator('.crossingResultList button>span>small').allTextContents()).every(s => s.startsWith('TX')));
      await page.goBack();
      try {
        await page.waitForURL(beforeTexas);
        await page.waitForFunction(n => document.querySelectorAll('.crossingResultList li').length === n, document.crossings.length);
      } catch (error) {
        console.error('[border-map-back-diagnostic]', JSON.stringify(await page.evaluate(() => ({
          url: location.href,
          rows: document.querySelectorAll('.crossingResultList li').length,
          detail: document.querySelector('.explorerPane')?.innerText,
          region: [...document.querySelectorAll('button[aria-pressed="true"]')].map(n => n.textContent),
          search: document.querySelector('input[type="search"]')?.value
        }))));
        throw error;
      }
      await page.goto(new URL('/crossing/san-ysidro/?lane=passenger_ready', baseUrl).href);
      await page.getByRole('link', {
        name: es ? 'Todos los cruces' : 'All crossings',
        exact: true
      }).click();
      await explorer().waitFor();
      assert.equal(await page.locator('.crossingResultList li').count(), document.crossings.length);
      assert.equal(await lane().inputValue(), 'passenger_ready');
      await page.goto(new URL('/corridor/san-diego-tijuana/?lane=passenger_ready', baseUrl).href);
      await page.waitForURL(u => u.pathname === '/' && u.searchParams.get('area') === 'san-diego-tijuana');
      await explorer().waitFor();
      assert.equal(await lane().inputValue(), 'passenger_ready');
      await fits();
    }
    await page.goto(new URL('/?area=all', baseUrl).href);
    await explorer().waitFor();
    for (const id of ['240204', '260801', '250601', '230404', '260802', '240221']) {
      await page.locator(`#map-result-${id}`).click();
      await page.getByTestId('border-crossing-card').waitFor();
      const evidence = page.getByTestId('location-evidence');
      await evidence.waitFor();
      if (['250601', '230404', '260802', '240221'].includes(id)) {
        assert.match(await evidence.innerText(), /No map point|Sin punto en el mapa/);
        assert.equal(await page.locator(`[data-map-node][data-port="${id}"]`).count(), 0);
      } else {
        assert.equal(await evidence.getByRole('link').count(), 1, 'source-backed location exposes its primary reference');
        assert.match(await evidence.innerText(), id === '260801' ? /Federal Register/ : /directorio público|public directory/);
      }
      await page.keyboard.press('Escape');
      await page.locator(`#map-result-${id}`).waitFor();
    }
    // Theme paint and intermediate resize use actual SVG computed colors/CTMs.
    await page.goto(new URL('/?area=all', baseUrl).href);
    await explorer().waitFor();
    const light = await page.locator('.country-US').evaluate(n => getComputedStyle(n).fill);
    await page.getByRole('button', {
      name: /Switch to dark|Cambiar a oscuro|Dark mode|Modo oscuro/
    }).click();
    await page.waitForFunction(light => getComputedStyle(document.querySelector('.country-US')).fill !== light, light);
    await page.getByRole('button', {
      name: /Switch to light|Cambiar a claro|Light mode|Modo claro/
    }).click();
    await page.waitForFunction(light => getComputedStyle(document.querySelector('.country-US')).fill === light, light);
    await page.getByRole('searchbox').fill('San Ysidro');
    const location = crossingMapLocation(port),
      expectedPoint = projectBorderPoint(location.lng, location.lat);
    const resizedMarker = page.locator('[data-map-node][data-port="250401"]');
    await resizedMarker.waitFor();
    for (const width of [320, 640, 720, 780, 820]) {
      await page.setViewportSize({
        width,
        height: 960
      });
      await fits();
      assert.equal(await page.locator('path.country').count(), 2);
      const measured = await resizedMarker.evaluate(inspectMapPoint, expectedPoint);
      assert.ok(measured.error < .6, `${width}px painted point co-registration: ${JSON.stringify(measured)}`);
    }
    await page.emulateMedia({
      reducedMotion: 'reduce'
    });
    assert.equal(await page.locator('.geographicLayer').evaluate(n => getComputedStyle(n).transitionProperty), 'none', 'reduced motion disables camera interpolation');
    await page.getByRole('button', {
      name: /Zoom in map|Acercar mapa/
    }).click();
    const scaleAfterTwoFrames = await page.locator('.geographicLayer').evaluate(async node => {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return node.getScreenCTM().a;
    });
    await page.waitForTimeout(220);
    assert.ok(Math.abs((await page.locator('.geographicLayer').evaluate(node => node.getScreenCTM().a)) - scaleAfterTwoFrames) < .001, 'reduced motion reaches the camera endpoint within two frames');
    // Retained timestamps/values are never silently re-dated after failed fetch.
    document.fetched_at = new Date(Date.now() - 4 * 3600000).toISOString();
    apiFailed = true;
    await page.reload();
    await explorer().waitFor();
    assert.match(await page.locator('.explorerNotice').innerText(), /respaldo|desactualizada|fallback|Stale/);
    await openResult();
    await expectWait('80');
    allFailed = true;
    await page.getByRole('button', {
      name: /Refresh|Actualizar/,
      exact: true
    }).click();
    await page.waitForFunction(() => document.querySelector('.explorerNotice')?.textContent.match(/respaldo|fallback/));
    await expectWait('80');
    allFailed = false;
    historyFailed = true;
    await page.goto(new URL('/?area=all&mode=history', baseUrl).href);
    await explorer().waitFor();
    await page.getByText(/Recorded history unavailable\.|Historial registrado no disponible\./).waitFor();
    assert.equal(await page.locator('#map-result-250401 strong').innerText(), '—', 'failed history cannot fall back to a current wait');
    historyFailed = false;
    await page.getByRole('button', {
      name: /Retry history|Reintentar historial/
    }).click();
    await page.locator('.archiveControl input').waitFor();
    assert.deepEqual(errors, []);
    console.log(`[border-map] PASS ${viewport.width}px: full catalog, filters/Back, lane clocks/zero/missing, shared map geometry, selection/Escape/focus, map/list, history gaps, legacy route, EN/ES, themes, resizes, reduced motion, stale/failure retention`);
  } finally {
    await context.close();
  }
}
