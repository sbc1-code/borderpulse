import assert from 'node:assert/strict';
import { sponsorFor, sponsorUrl, whatsappUrl } from '../src/lib/sponsors.js';

async function captureClicks(page) {
  await page.evaluate(() => {
    window.sponsorEvents = [];
    window.umami = { track: (event, data) => window.sponsorEvents.push({ event, data }) };
    // Exercise the actual handlers without opening WhatsApp, the clinic, or checkout.
    document.addEventListener('click', e => e.preventDefault(), true);
  });
}

export async function checkSponsorExample(page, baseUrl) {
  const placement = 'city-juarez-dental';
  const date = '2026-11-26';
  const sponsor = sponsorFor('juarez', 'dental', date);
  await page.clock.setFixedTime(new Date(date + 'T12:00:00Z'));
  for (const [lang, featurePath, cityPath, label] of [
    ['en', '/feature-your-business/', '/city/juarez/', 'Example sponsored listing'],
    ['es', '/anunciate/', '/ciudad/juarez/', 'Ejemplo de anuncio patrocinado'],
  ]) {
    await page.goto(new URL(featurePath, baseUrl).href);
    const example = page.getByRole('region', { name: label });
    await example.waitFor();
    assert.equal(await example.getByText(sponsor.name, { exact: true }).count(), 0);
    assert.equal(await example.locator('a, [data-sponsor], [tabindex="0"]').count(), 0);
    assert.equal(await example.getByRole('button').count(), 2);
    assert.equal(await example.getByRole('button', { disabled: true }).count(), 2);
    await captureClicks(page);
    await example.getByRole('heading').click();
    await example.getByRole('button').evaluateAll(buttons => buttons.forEach(button => button.click()));
    assert.deepEqual(await page.evaluate(() => window.sponsorEvents), []);

    const checkout = page.locator('#root a[href*="client_reference_id="]').first();
    const slot = new URL(await checkout.getAttribute('href')).searchParams.get('client_reference_id');
    assert.ok(slot);
    await checkout.click();
    assert.deepEqual(await page.evaluate(() => window.sponsorEvents), [{ event: 'sponsor-checkout', data: { slot } }]);

    await page.goto(new URL(cityPath, baseUrl).href);
    const card = page.locator(`#root [data-sponsor="${sponsor.id}"]`);
    await card.waitFor();
    await captureClicks(page);
    for (const href of [whatsappUrl(sponsor, lang), sponsorUrl(sponsor, placement)]) {
      await card.locator(`a[href="${href}"]`).click();
    }
    assert.deepEqual(await page.evaluate(() => window.sponsorEvents), ['whatsapp', 'site'].map(action => ({
      event: 'sponsor-click', data: { sponsor: sponsor.id, placement, action },
    })));
  }
}
