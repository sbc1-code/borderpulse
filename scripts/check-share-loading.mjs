import assert from 'node:assert/strict';

export async function checkShareLoading(browser, baseUrl, viewport) {
  for (const language of ['en', 'es']) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    await context.addInitScript(lang => { localStorage.setItem('borderPulse_language', lang); localStorage.setItem('borderPulse_geoConsent', 'denied'); }, language);
    await context.route('**/*', route => new URL(route.request().url()).origin === baseUrl.origin ? route.continue() : route.abort('blockedbyclient'));
    const page = await context.newPage(); page.setDefaultTimeout(10_000);
    let release, requested;
    const sawRequest = new Promise(resolve => { requested = resolve; });
    const hold = new Promise(resolve => { release = resolve; });
    const chunkPattern = '**/assets/ShareModalContent-*.js';
    await page.route(chunkPattern, async route => { requested(); await hold; await route.abort('failed'); });
    const share = () => page.getByRole('button', { name: language === 'es' ? 'Compartir' : 'Share', exact: true });
    try {
      await page.goto(new URL('/?area=san-diego-tijuana&lane=passenger_sentri', baseUrl).href);
      await share().click(); await sawRequest;
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('status').filter({ hasText: language === 'es' ? 'Cargando opciones' : 'Loading sharing' }).waitFor();
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(new URL(page.url()).searchParams.get('lane'), 'passenger_sentri');
      await share().click();
      release();
      await dialog.getByRole('button', { name: language === 'es' ? 'Recargar para reintentar' : 'Reload to retry' }).waitFor();
      await dialog.getByRole('button', { name: language === 'es' ? 'Cancelar' : 'Cancel', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      await page.getByLabel(language === 'es' ? 'Tu carril' : 'Your lane', { exact: true }).selectOption('passenger_ready');
      await share().click();
      await page.unroute(chunkPattern);
      await dialog.getByRole('button', { name: language === 'es' ? 'Recargar para reintentar' : 'Reload to retry' }).click();
      await page.waitForLoadState();
      await share().click();
      await dialog.getByRole('button', { name: language === 'es' ? 'Copiar para WhatsApp' : 'Copy for WhatsApp' }).waitFor();
      assert.equal(new URL(page.url()).searchParams.get('lane'), 'passenger_ready');
      assert.ok((await dialog.innerText()).includes('Ready Lane'));
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    } finally { release(); await context.close(); }
  }
  console.log(`[share-loading] PASS: EN/ES at ${viewport.width}px: delayed load, Escape/cancel, repeated open, local failure, usable lane controls and reload recovery`);
}
