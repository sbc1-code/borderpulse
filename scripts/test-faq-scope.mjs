import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertNoGlobalFaq, checkHtmlFaqScope, parseJsonLd } from './check-faq-scope.mjs';

const script = (value) => `<script type="application/ld+json">${JSON.stringify(value).replace(/<\/script/gi, '<\\/script')}</script>`;

test('parses every JSON-LD block with arrays, graphs, and safe script escaping', () => {
  const graph = { '@graph': [{ '@type': 'WebSite', name: 'Border Pulse' }] };
  const array = [{ '@type': 'Place', name: '</script><script>example</script>' }];
  const html = `${script(graph)}<script>not JSON</script>${script(array).replace('type="application/ld+json"', "id='route' type='application/ld+json'")}`;
  assert.deepEqual(parseJsonLd(html, 'fixture'), [graph, array]);
});

test('fails on a malformed later JSON-LD block rather than reading only the first', () => {
  assert.throws(() => parseJsonLd(`${script({ '@type': 'WebSite' })}<script type="application/ld+json">{bad}</script>`, 'fixture'), /fixture: invalid JSON-LD block 2/);
});

test('rejects each removed homepage question, including escaped JSON text', () => {
  const questions = [
    'Where do northbound wait times come from?',
    'How are southbound delays estimated?',
    'What does no current wait time mean?',
    'What runs in my browser?',
  ];
  for (const name of questions) {
    const faq = { '@graph': [{ '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name }] }] };
    // Escape inside the JSON body, leaving the script tag intact.
    const escaped = script(faq).replace(name, name.replaceAll(' ', '\\u0020'));
    assert.throws(() => assertNoGlobalFaq(parseJsonLd(escaped, 'fixture'), 'fixture'), /removed global question/);
  }
});

test('rejects the active-southbound claim even without the original questions', () => {
  const schema = { '@type': 'FAQPage', mainEntity: [{ acceptedAnswer: {
    text: 'CBP does not publish southbound wait times. Border Pulse estimates delay at major crossings using live routing conditions and crossing-specific baseline travel times.',
  } }] };
  assert.throws(() => assertNoGlobalFaq([schema], 'fixture'), /active southbound routing claim/);
});

test('allows a crossing-specific FAQ and leaves visible homepage answers outside schema checks', () => {
  const crossingFaq = { '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'What hours is San Ysidro open?' }] };
  const html = '<details>Where do northbound wait times come from? Southbound estimates are paused.</details>' + script(crossingFaq);
  assert.doesNotThrow(() => checkHtmlFaqScope(html, 'fixture'));
});


test('rejects the stale active-southbound claim outside JSON-LD too', () => {
  const html = '<p>Border Pulse estimates delay at major crossings using live routing conditions and crossing-specific baseline travel times.</p>';
  assert.throws(() => checkHtmlFaqScope(html, 'fixture'), /active southbound routing claim/);
});
