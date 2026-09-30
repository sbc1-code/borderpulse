import assert from 'node:assert/strict';
import fs from 'node:fs';

// Run against the built app with external requests blocked by the route suite.
export async function checkGrowthInteractions(page, context, baseUrl) {
  const posts = JSON.parse(fs.readFileSync(new URL('../public/data/blog/index.json', import.meta.url))).posts;
  await context.addInitScript(() => {
    window.testEvents = [];
    window.umami = { track: (event, data) => window.testEvents.push({ event, data }) };
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (value) => {
        if (window.failCopy) throw new Error('clipboard denied');
        window.copiedLink = value;
      } },
    });
  });
  for (const lang of ['en', 'es']) {
    await page.evaluate((value) => {
      localStorage.setItem('borderPulse_language', value);
      localStorage.setItem('borderPulse_favorites', '[]');
      localStorage.setItem('borderPulse_region', 'ALL');
    }, lang);
    const add = lang === 'en' ? 'Add to favorites' : 'Agregar a favoritos';
    const remove = lang === 'en' ? 'Remove from favorites' : 'Quitar de favoritos';
    await page.goto(new URL('/crossing/san-ysidro/', baseUrl).href);
    await page.getByRole('button', { name: add, exact: true }).click();
    await page.getByRole('button', { name: remove, exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('borderPulse_favorites'))), ['250401']);
    assert.equal(await page.evaluate(() => window.testEvents.filter(e => e.event === 'favorite-toggle' && e.data.action === 'add').length), 1);
    // Follow the actual client-side route back to the dashboard.
    await page.getByRole('link', { name: lang === 'en' ? 'All crossings' : 'Todos los cruces', exact: true }).click();
    await page.getByRole('button', { name: remove, exact: true }).waitFor();
    await page.reload();
    await page.getByRole('button', { name: remove, exact: true }).waitFor();
    await page.goto(new URL('/crossing/san-ysidro/', baseUrl).href);
    await page.getByRole('button', { name: remove, exact: true }).click();
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('borderPulse_favorites'))), []);
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key === 'borderPulse_favorites') throw new Error('storage denied');
        return original.call(this, key, value);
      };
    });
    await page.getByRole('button', { name: add, exact: true }).click();
    await page.getByText(lang === 'en'
      ? 'Your browser could not save this change. Allow site storage and try again.'
      : 'Tu navegador no pudo guardar este cambio. Permite el almacenamiento del sitio e inténtalo de nuevo.', { exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('borderPulse_favorites'))), []);

    const pair = 'san-ysidro-vs-otay-mesa';
    await page.goto(new URL(`/compare/${pair}/`, baseUrl).href);
    await page.getByRole('button', { name: lang === 'en' ? 'Copy link' : 'Copiar enlace', exact: true }).click();
    assert.equal(await page.evaluate(() => window.copiedLink), `https://borderpulse.com/compare/${pair}/`);
    await page.getByRole('button', { name: lang === 'en' ? 'Yes' : 'Sí', exact: true }).click();
    assert.deepEqual(await page.evaluate(() => window.testEvents.filter(e => e.event === 'compare-feedback')), [
      { event: 'compare-feedback', data: { pair, answer: 'yes' } },
    ]);
    await page.evaluate(() => { window.failCopy = true; });
    await page.getByRole('button', { name: lang === 'en' ? 'Link copied' : 'Enlace copiado', exact: true }).click();
    await page.getByText(lang === 'en'
      ? 'Copy failed. You can share this page from your browser.'
      : 'No se pudo copiar. Puedes compartir esta página desde tu navegador.', { exact: true }).waitFor();

    const post = posts.find(p => p.lang === lang);
    await page.goto(new URL(`/blog/${post.slug}/`, baseUrl).href);
    await page.getByRole('button', { name: lang === 'en' ? 'Copy guide link' : 'Copiar enlace de la guía', exact: true }).click();
    assert.equal(await page.evaluate(() => window.copiedLink), `https://borderpulse.com/blog/${post.slug}/?utm_source=copy&utm_medium=share&utm_campaign=guide`);
    const whatsapp = new URL(await page.getByRole('link', { name: 'WhatsApp', exact: true }).getAttribute('href'));
    assert.ok(whatsapp.searchParams.get('text').includes(`https://borderpulse.com/blog/${post.slug}/?utm_source=whatsapp&utm_medium=share&utm_campaign=guide`));
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `https://borderpulse.com/blog/${post.slug}/`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'guide must fit viewport');
    await page.getByRole('link', { name: lang === 'en' ? 'Current wait times' : 'Tiempos de espera actuales', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/');
    assert.equal(await page.evaluate(() => window.testEvents.filter(e => e.event === 'blog-to-waits').length), 1);
  }
  console.log('[growth] PASS: EN/ES favorites, storage failure, sharing, feedback, guide-to-waits and attribution');
}
