import assert from 'node:assert/strict';

export async function checkComparisonGuide(page, context, baseUrl) {
  const versions = [
    { slug: 'san-ysidro-vs-otay-mesa', lang: 'en', title: 'San Ysidro vs Otay Mesa: compare current waits before choosing',
      notice: 'Editorial update, October 11, 2026:', cta: 'Compare current standard-passenger waits at San Ysidro and Otay Mesa',
      twin: 'san-ysidro-vs-otay-cual-es-mas-rapida', twinLabel: 'Español' },
    { slug: 'san-ysidro-vs-otay-cual-es-mas-rapida', lang: 'es', title: 'San Ysidro vs Otay Mesa: compara las esperas antes de elegir',
      notice: 'Actualización editorial, 11 de octubre de 2026:', cta: 'Compara las esperas actuales del carril estándar de pasajeros en San Ysidro y Otay Mesa',
      twin: 'san-ysidro-vs-otay-mesa', twinLabel: 'English' },
  ];
  for (const version of versions) {
    const url = new URL(`/blog/${version.slug}/`, baseUrl).href;
    await page.goto(url);
    await page.getByRole('heading', { level: 1, name: version.title, exact: true }).waitFor();
    await page.getByText(version.notice, { exact: true }).waitFor();
    const article = page.locator('#root article');
    const content = await article.innerText();
    assert.equal(await article.getAttribute('lang'), version.lang);
    assert.ok(!/Default to Otay|Default a Otay|almost always Otay|casi siempre Otay|trucker rush|traileros congestionan/.test(content), 'dated route rules must not return');
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `https://borderpulse.com/blog/${version.slug}/`);
    const schema = await page.locator('script[type="application/ld+json"]').allTextContents();
    const articleSchema = schema.map(value => JSON.parse(value)).find(value => value['@type'] === 'BlogPosting');
    assert.ok(articleSchema, 'BlogPosting metadata must exist');
    assert.equal(articleSchema.author.name, 'Sebastian Becerra');
    assert.equal(articleSchema.datePublished, '2026-04-24T12:00:00Z');
    assert.equal(articleSchema.dateModified, '2026-10-11T12:00:00Z');
    const byline = await article.locator('header').innerText();
    assert.ok(byline.includes('Sebastian Becerra'), 'original author stays visible');
    assert.ok(byline.includes(version.lang === 'en' ? 'April 24, 2026' : '24 de abril de 2026'), 'original publication date stays visible');
    assert.ok(byline.includes(version.lang === 'en' ? 'Updated October 11, 2026' : 'Actualizado 11 de octubre de 2026'), 'revision date stays visible');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'guide must fit viewport');
    await page.getByRole('link', { name: version.cta, exact: true }).click();
    await page.waitForURL(value => value.pathname === '/compare/san-ysidro-vs-otay-mesa/');
    await page.goBack();
    await page.getByRole('heading', { level: 1, name: version.title, exact: true }).waitFor();
    await page.getByRole('link', { name: version.twinLabel, exact: true }).click();
    await page.waitForURL(value => value.pathname === `/blog/${version.twin}/`);
  }
  console.log('[comparison-guide] PASS: EN/ES correction, current comparison CTA, Back, translation, original publication and revision metadata');
}

