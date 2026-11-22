import assert from 'node:assert/strict';

// Uses a local destination fixture: never log in, submit an application or pay.
export async function checkSentriRenewal(page, context, baseUrl) {
  const versions = [
    { slug: 'sentri-renewal-2026-step-by-step', lang: 'en',
      title: 'SENTRI renewal: how to renew in the TTP portal',
      cta: 'Renew SENTRI in the official TTP portal (opens a new tab)',
      waits: 'Check current northbound crossing reports', twin: 'Español',
      published: 'May 9, 2026', updated: 'Updated October 22, 2026',
      late: 'do not assume that submitting late restores lane access',
      pending: 'For questions about continued benefits, consult the renewal FAQ and CBP support; this guide cannot confirm your lane access.',
      conditional: 'Conditional approval by itself is not a statement that you may use a SENTRI lane.' },
    { slug: 'renovacion-sentri-2026-paso-a-paso', lang: 'es',
      title: 'Renovación SENTRI: cómo renovar en el portal TTP',
      cta: 'Renueva SENTRI en el portal oficial TTP (abre otra pestaña)',
      waits: 'Consulta los reportes actuales de cruces hacia Estados Unidos', twin: 'English',
      published: '9 de mayo de 2026', updated: 'Actualizado 22 de octubre de 2026',
      late: 'no supongas que presentar tarde restablece el acceso al carril',
      pending: 'Si tienes dudas sobre la continuidad de beneficios, consulta la FAQ de renovación y el soporte CBP; esta guía no puede confirmar tu acceso al carril.',
      conditional: 'La aprobación condicional, por sí sola, no indica que puedas usar un carril SENTRI.' },
  ];
  const portalFixture = route => route.fulfill({ contentType: 'text/html',
    body: '<!doctype html><title>Portal navigation fixture</title><h1>Portal navigation fixture</h1>' });
  await context.route('https://ttp.dhs.gov/', portalFixture);
  try {
    for (const version of versions) {
      const route = `/blog/${version.slug}/`;
      // Search/crawler HTML must contain the same corrected answer and action.
      // Blog prerender is an offscreen crawler snapshot, not a no-JS user view.
      const response = await context.request.get(new URL(route, baseUrl).href);
      assert.equal(response.status(), 200);
      const html = await response.text();
      assert.ok(html.includes(version.cta), 'prerender must retain the official action');
      assert.ok(html.includes(version.conditional), 'prerender must retain the eligibility distinction');
      await page.goto(new URL(route, baseUrl).href);
      await page.getByRole('heading', { level: 1, name: version.title, exact: true }).waitFor();
      const article = page.locator('#root article');
      assert.equal(await article.getAttribute('lang'), version.lang);
      const content = await article.innerText();
      for (const answer of [version.late, version.pending, version.conditional]) assert.ok(content.includes(answer));
      assert.ok(!/If you see "Conditionally Approved", you are good|If you see "Pending Review" past|Si ves "Conditionally Approved", estás bien|Si ves "Pending Review" pasada|24-48|10 business days|10 días hábiles/.test(content), 'unsupported eligibility and timing promises must not return');
      const cta = article.getByRole('link', { name: version.cta, exact: true });
      assert.equal(await cta.getAttribute('href'), 'https://ttp.dhs.gov/');
      assert.equal(await cta.getAttribute('target'), '_blank');
      assert.match(await cta.getAttribute('rel'), /noopener/);
      assert.match(await cta.getAttribute('rel'), /noreferrer/);
      const box = await cta.boundingBox();
      assert.ok(box && box.y >= 0 && box.y + box.height <= page.viewportSize().height, 'official renewal action must fit on the first screen');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'guide must fit viewport');
      let reached = false;
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
        if (await cta.evaluate(el => document.activeElement === el)) { reached = true; break; }
      }
      assert.ok(reached, 'official action must be reachable by keyboard');
      const popupPromise = page.waitForEvent('popup');
      await page.keyboard.press('Enter');
      const popup = await popupPromise;
      try {
        await popup.getByRole('heading', { name: 'Portal navigation fixture', exact: true }).waitFor();
        assert.equal(popup.url(), 'https://ttp.dhs.gov/');
        assert.equal(await popup.evaluate(() => window.opener === null), true);
      } finally { await popup.close(); }
      assert.equal(new URL(page.url()).pathname, route, 'guide stays available after opening TTP');
      const byline = await article.locator('header').innerText();
      assert.ok(byline.includes(version.published));
      assert.ok(byline.includes(version.updated));
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `https://borderpulse.com${route}`);
      const schema = (await page.locator('script[type="application/ld+json"]').allTextContents())
        .map(text => JSON.parse(text)).find(value => value['@type'] === 'BlogPosting');
      assert.equal(schema.datePublished, '2026-05-09T12:00:00Z');
      assert.equal(schema.dateModified, '2026-10-22T12:00:00Z');
      await article.getByRole('link', { name: version.waits, exact: true }).click();
      await page.waitForURL(url => url.pathname === '/');
      await page.goBack();
      await page.getByRole('heading', { level: 1, name: version.title, exact: true }).waitFor();
      const other = versions.find(value => value.lang !== version.lang);
      await article.getByRole('link', { name: version.twin, exact: true }).click();
      await page.waitForURL(url => url.pathname === `/blog/${other.slug}/`);
      await page.getByRole('heading', { level: 1, name: other.title, exact: true }).waitFor();
    }
  } finally { await context.unroute('https://ttp.dhs.gov/', portalFixture); }
  console.log('[sentri-renewal] PASS: EN/ES first-screen official action, keyboard/new tab, timely/pending/late distinctions, prerender, dates, waits, Back and translation');
}
