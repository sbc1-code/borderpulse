import assert from 'node:assert/strict';
import fs from 'node:fs';

// Keep report discovery recoverable after hiding unavailable waits, filtering,
// and live report changes. All values below are confined to this fixture.
export async function checkHiddenCrossings(context, baseUrl) {
  const snapshot = JSON.parse(fs.readFileSync(new URL('../public/data/crossings.json', import.meta.url)));
  const missing = snapshot.crossings.find(c => c.port_number === '230901');
  const zero = snapshot.crossings.find(c => c.port_number === '240601');
  const closed = snapshot.crossings.find(c => c.port_number === '240801');
  const setWait = (crossing, minutes) => {
    crossing.current_wait_time = minutes;
    crossing.northbound_wait_time = minutes;
    crossing.lanes = { passenger_standard: { delay_minutes: minutes,
      status: minutes == null ? 'Update Pending' : 'No Delay', lanes_open: minutes == null ? 0 : 1,
      update_time: minutes == null ? null : 'At 10:00 am MDT' } };
  };
  const matcher = url => ['/data/crossings.json', '/api/public/crossings'].includes(url.pathname);
  let failed = false;
  const feed = route => failed ? route.fulfill({ status: 503, body: 'fixture unavailable' })
    : route.fulfill({ contentType: 'application/json', body: JSON.stringify(snapshot) });
  await context.route(matcher, feed);
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    for (const lang of ['en', 'es']) {
      const es = lang === 'es';
      failed = false;
      snapshot.fetched_at = new Date().toISOString();
      missing.port_status = zero.port_status = 'Open';
      closed.port_status = 'Closed';
      setWait(missing, null);
      setWait(zero, 0);
      setWait(closed, 0);
      await page.goto(baseUrl.href);
      await page.evaluate(value => {
        localStorage.setItem('borderPulse_language', value);
        localStorage.setItem('borderPulse_region', 'ALL');
        localStorage.setItem('borderPulse_geoConsent', 'denied');
        localStorage.removeItem('borderPulse_corridor');
      }, lang);
      await page.goto(baseUrl.href);
      const show = () => page.getByRole('button', { name: es ? /^Mostrar \d+ sin tiempo actual$/ : /^Show \d+ without current waits$/ });
      const hide = () => page.getByRole('button', { name: es ? /^Ocultar \d+ sin tiempo actual$/ : /^Hide \d+ without current waits$/ });
      const search = page.getByRole('searchbox');
      const cards = page.getByTestId('border-crossing-card');
      const primary = crossing => page.locator(`[data-port-number="${crossing.port_number}"]`).getByTestId('primary-wait');
      const empty = page.getByText(es
        ? 'Los cruces encontrados no tienen tiempos actuales publicados. Muéstralos para abrir sus reportes.'
        : 'Matching crossings have no current published wait times. Show them to open their reports.', { exact: true });
      await hide().click();
      await search.fill(missing.name);
      await empty.waitFor();
      await show().waitFor();
      assert.equal(await cards.count(), 0);
      assert.equal(await show().getAttribute('aria-expanded'), 'false');
      assert.equal(await show().getAttribute('aria-controls'), 'crossing-results');
      assert.equal(await page.locator('#crossing-results').count(), 1);
      // Reach the recovery action from the search field in normal tab order.
      await search.focus();
      let reached = false;
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press('Tab');
        if (await show().evaluate(el => el === document.activeElement)) { reached = true; break; }
      }
      assert.ok(reached, 'keyboard users can recover a matching hidden crossing');
      const box = await show().boundingBox();
      assert.ok(box && box.height >= 44);
      await page.keyboard.press('Enter');
      await primary(missing).waitFor();
      assert.equal(await primary(missing).innerText(), '—', 'missing remains unavailable, not zero');
      assert.equal(await hide().getAttribute('aria-expanded'), 'true');
      const link = page.locator(`[data-port-number="${missing.port_number}"] h2 a`);
      const target = await link.getAttribute('href');
      await link.click();
      await page.waitForURL(url => url.pathname === target);
      await page.locator('#root h1').waitFor();
      await page.goBack();
      await search.waitFor();
      await search.fill(missing.name);
      await hide().click();
      await empty.waitFor();
      assert.ok(await show().evaluate(el => el === document.activeElement), 'hiding the final card retains focus on recovery');
      await page.keyboard.press('Space');
      await primary(missing).waitFor();

      await search.fill('');
      await page.getByRole('group', { name: es ? 'Filtrar por región' : 'Filter by region', exact: true })
        .getByRole('button', { name: es ? 'Nuevo México' : 'New Mexico', exact: true }).click();
      await hide().click();
      await primary(zero).waitFor();
      assert.equal(await primary(zero).innerText(), '0', 'a real zero remains visible when unavailable waits are hidden');
      assert.equal(await primary(closed).count(), 0, 'closed reports remain in the unavailable group');
      setWait(zero, null);
      await page.evaluate(() => window.dispatchEvent(new Event('online')));
      await empty.waitFor();
      await show().waitFor();
      failed = true;
      const failedResponse = page.waitForResponse(response => matcher(new URL(response.url())) && response.status() === 503);
      await page.getByRole('button', { name: es ? 'Actualizar' : 'Refresh', exact: true }).click();
      await failedResponse;
      await page.waitForFunction(() => !document.querySelector('button[aria-label="Refresh"],button[aria-label="Actualizar"]').disabled);
      await empty.waitFor();
      assert.equal(await show().count(), 1, 'failed refresh preserves the recovery control');
      failed = false;
      setWait(zero, 0);
      snapshot.fetched_at = new Date().toISOString();
      await page.evaluate(() => window.dispatchEvent(new Event('online')));
      await primary(zero).waitFor();
      assert.equal(await primary(zero).innerText(), '0', 'new zero report returns without resetting the user filter');
      await search.fill('zz-no-crossing-match-zz');
      await page.getByText(es ? /^No hay cruces que coincidan con/ : /^No crossings match/).waitFor();
      assert.equal(await show().count() + await hide().count(), 0, 'true no-match search stays distinct');
      await page.getByRole('button', { name: es ? 'Borrar búsqueda' : 'Clear search', exact: true }).click();
      setWait(zero, null);
      snapshot.fetched_at = new Date(Date.now() - 120 * 60_000).toISOString();
      // A fresh document starts with this stale input; the service correctly
      // refuses to replace an already-cached newer reading with an older one.
      await page.reload();
      await hide().click();
      await empty.waitFor();
      await show().click();
      await primary(zero).waitFor();
      assert.equal(await primary(zero).innerText(), '—');
      assert.equal(await primary(closed).innerText(), '—');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
    await context.unroute(matcher, feed);
  }
  console.log('[hidden-crossings] PASS: EN/ES hidden-only search/region recovery, keyboard/focus, detail/Back, absent/zero/closed reports, failed refresh, recovery, stale input and genuine no-match');
}
