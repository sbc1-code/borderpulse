import assert from 'node:assert/strict';
import fs from 'node:fs';

// Test the promoted entry into the real comparison, with controlled reports.
// External CBP navigation uses a fixture, never the live site or a login.
export async function checkSantaTeresaActions(context, baseUrl) {
  const snapshot = JSON.parse(fs.readFileSync(new URL('../public/data/crossings.json', import.meta.url)));
  const crossing = snapshot.crossings.find(c => c.port_number === '240801');
  const slug = 'santa-teresa-santa-teresa-port-of-entry';
  const detailPath = `/crossing/${slug}/`;
  const comparisonPath = `/walk-or-drive/${slug}/`;
  const sourceUrl = 'https://bwt.cbp.gov/details/06240801/POV';
  const feedMatcher = url => ['/data/crossings.json', '/api/public/crossings'].includes(url.pathname);
  let fail = false;
  const feed = route => fail ? route.fulfill({ status: 503, body: 'fixture unavailable' })
    : route.fulfill({ contentType: 'application/json', body: JSON.stringify(snapshot) });
  const official = route => route.fulfill({ contentType: 'text/html', body: '<h1>CBP navigation fixture</h1>' });
  await context.route(feedMatcher, feed);
  await context.route(sourceUrl, official);
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const now = Date.now();
  await page.clock.install({ time: now });
  const lane = minutes => ({ delay_minutes: minutes, status: minutes === 0 ? 'No Delay' : 'delay', lanes_open: 1, update_time: 'At 10:00 am MDT' });
  const setWaits = (drive, walk) => {
    crossing.northbound_wait_time = drive;
    crossing.current_wait_time = drive;
    crossing.lanes = {
      passenger_standard: drive == null ? null : lane(drive),
      pedestrian_standard: walk == null ? null : lane(walk),
    };
  };
  try {
    for (const lang of ['en', 'es']) {
      const es = lang === 'es';
      const navName = es ? 'Planifica tu cruce en Santa Teresa' : 'Plan your Santa Teresa crossing';
      const actionName = es ? 'Compara a pie y en auto' : 'Compare walking and driving';
      const officialName = es ? 'Reporte y horarios de CBP (abre otra pestaña)' : 'CBP report and hours (opens a new tab)';
      await page.clock.setSystemTime(now);
      fail = false;
      crossing.port_status = 'Open';
      crossing.hours = 'Fixture CBP hours';
      snapshot.fetched_at = new Date(now).toISOString();
      setWaits(60, 30);
      await page.goto(baseUrl.href);
      await page.evaluate(value => localStorage.setItem('borderPulse_language', value), lang);
      await page.goto(new URL(detailPath, baseUrl).href);
      const nav = page.getByRole('navigation', { name: navName, exact: true });
      const action = nav.getByRole('link', { name: actionName, exact: true });
      const source = nav.getByRole('link', { name: officialName, exact: true });
      const checkEntry = async () => {
        await nav.waitFor();
        assert.equal(await page.locator(`#root a[href="${comparisonPath}"]`).count(), 1, 'move the comparison action; do not duplicate it');
        for (const link of [action, source]) {
          const box = await link.boundingBox();
          assert.ok(box && box.y >= 0 && box.y + box.height <= page.viewportSize().height, 'planning actions fit on the first screen');
          assert.ok(box.height >= 44, 'planning links meet the 44px target');
        }
        assert.equal(await source.getAttribute('href'), sourceUrl);
        assert.equal(await source.getAttribute('target'), '_blank');
        assert.match(await source.getAttribute('rel'), /noopener/);
        assert.match(await source.getAttribute('rel'), /noreferrer/);
        assert.ok(!/0 min|6 am|midnight|Recommended|Recomendado/.test(await nav.innerText()), 'navigation must not invent waits, hours or a recommendation');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      };
      await checkEntry();
      let reached = false;
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
        if (await action.evaluate(el => document.activeElement === el)) { reached = true; break; }
      }
      assert.ok(reached, 'first-screen comparison is reachable by keyboard');
      await page.keyboard.press('Tab');
      assert.ok(await source.evaluate(el => document.activeElement === el), 'official source follows comparison in keyboard order');
      const popupPromise = page.waitForEvent('popup');
      await page.keyboard.press('Enter');
      const popup = await popupPromise;
      try {
        await popup.getByRole('heading', { name: 'CBP navigation fixture', exact: true }).waitFor();
        assert.equal(popup.url(), sourceUrl);
        assert.equal(await popup.evaluate(() => window.opener === null), true);
      } finally { await popup.close(); }
      await action.focus();
      await page.keyboard.press('Enter');
      await page.waitForURL(url => url.pathname === comparisonPath);
      await page.getByText(es ? 'Según las esperas reportadas' : 'Based on reported waits', { exact: true }).waitFor();
      await page.goBack();
      await page.waitForURL(url => url.pathname === detailPath);
      // Enter from the promoted action just before the unchanged 90-minute limit.
      snapshot.fetched_at = new Date(now - 90 * 60_000).toISOString();
      await page.reload();
      await checkEntry();
      await action.click();
      await page.getByText(es ? 'Según las esperas reportadas' : 'Based on reported waits', { exact: true }).waitFor();
      fail = true;
      await page.clock.runFor(61_000);
      await page.getByTestId('walk-drive-unavailable').waitFor();
      assert.ok(!/Based on reported waits|Según las esperas reportadas|Recommended|Recomendado|Walk\.|Camina\.|Drive\.|Maneja\.|It's a wash\.|Está parejo\./.test(await page.locator('#root').innerText()));
      // A failed response did not create fresh advice; a new real timestamp does.
      fail = false;
      snapshot.fetched_at = new Date(now + 61_000).toISOString();
      await page.evaluate(() => window.dispatchEvent(new Event('online')));
      await page.getByText(es ? 'Según las esperas reportadas' : 'Based on reported waits', { exact: true }).waitFor();
      await page.goBack();
      await page.waitForURL(url => url.pathname === detailPath);
      for (const [drive, walk] of [[60, null], [null, null]]) {
        setWaits(drive, walk);
        crossing.hours = '';
        await page.reload();
        await checkEntry();
        await action.click();
        await page.getByRole('heading', { level: 1, name: es ? `${crossing.name}: sin espera peatonal actual reportada` : `${crossing.name}: no current pedestrian wait reported`, exact: true }).waitFor();
        assert.ok(!/\b0 min\b|Recommended|Recomendado/.test(await page.locator('#root').innerText()), 'absent waits do not become zero or a verdict');
        await page.goBack();
        await page.waitForURL(url => url.pathname === detailPath);
      }
      setWaits(0, 0);
      await page.reload();
      await checkEntry();
      await action.click();
      await page.getByText(es ? 'Según las esperas reportadas' : 'Based on reported waits', { exact: true }).waitFor();
      assert.match(await page.locator('#root').innerText(), /\b0 min\b/, 'genuine zero is preserved');
      await page.goBack();
      crossing.port_status = 'Closed';
      await page.reload();
      await checkEntry();
      await action.click();
      await page.getByRole('heading', { level: 1, name: es ? `${crossing.name}: cerrado ahora` : `${crossing.name}: closed now`, exact: true }).waitFor();
      assert.ok(!/\b0 min\b|Recommended|Recomendado/.test(await page.locator('#root').innerText()));
    }
    await page.goto(new URL('/crossing/columbus/', baseUrl).href);
    await page.locator('#root h1').waitFor();
    assert.equal(await page.getByRole('navigation', { name: /Santa Teresa/ }).count(), 0, 'no actions on unrelated ports');
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
    await context.unroute(feedMatcher, feed);
    await context.unroute(sourceUrl, official);
  }
  console.log('[santa-teresa-actions] PASS: EN/ES first-screen links, keyboard/source new tab, Back, aging/failed refresh/recovery, missing waits, zero and closure; other ports unchanged');
}
