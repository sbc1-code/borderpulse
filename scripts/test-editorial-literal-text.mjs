import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import matter from 'gray-matter';
import { compile } from '@mdx-js/mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from './remark-mdx-frontmatter-local.mjs';
import EditorialArticle from '../src/components/blog/EditorialArticle.js';
import { checkBundle, verifyBundle, renderEditorial, validateEditorialPosts } from './lib/editorial-bundle.mjs';
import { prepareEditorial } from './editorial-bundle.mjs';

const now = Date.parse('2026-10-29T22:30:00.000Z');
const at = new Date(now).toISOString();
const actor = { system: 'chatgpt-scheduled-task', runId: 'benign-text-roundtrip', model: null, at };
const english = 'CBP notices should be read alongside their publication date and the place named in the notice. Keep the original source available so another reader can inspect its complete wording. A dated notice describes the information as issued, and later updates may add context. Read the complete source before applying a statement about one crossing to a different location.';
const spanish = 'Los avisos de CBP deben leerse junto con su fecha de publicación y el lugar mencionado. Conserva la fuente original para que otra persona pueda consultar el texto completo. Un aviso fechado describe la información emitida y las actualizaciones posteriores pueden agregar contexto. Lee la fuente completa antes de aplicar una declaración sobre un cruce a un lugar diferente.';
const captions = { en: ' The printed caption reads **A & B** (northbound), [notice], and “opening hours”.', es: ' El rótulo impreso dice **A & B** (hacia el norte), [aviso] y «horario».' };
function bundle() {
  return {
    version: 'borderpulse-editorial-v1', id: '2026-10-29-benign-text-fixture', topicKey: 'benign-notice-reading', category: 'source-explainer', createdAt: at,
    synthesizedBy: actor, title: { en: 'Reading an official crossing notice', es: 'Cómo leer un aviso oficial de cruce' },
    readerValue: { en: 'Read the original notice with its date and named crossing.', es: 'Leer el aviso original con su fecha y el cruce mencionado.' }, relatedCrossings: ['250401'],
    sources: [{ id: 'cbp', url: 'https://www.cbp.gov/newsroom/fixture-only?utm_source=fixture', title: 'CBP: “A & B” (notice)', role: 'primary', publishedDate: '2026-10-28', publishedAt: null, checkedAt: at, publicationDateEvidence: 'October 28, 2026' }],
    claims: [
      { id: 'date', type: 'background', text: { en: english + captions.en, es: spanish + captions.es }, evidence: [{ sourceId: 'cbp', excerpt: 'Official crossing notices include a publication date.' }], basisClaimIds: [], preserveTerms: ['CBP'] },
      { id: 'scope', type: 'inference', text: { en: english, es: spanish }, evidence: [{ sourceId: 'cbp', excerpt: 'Check the named port and the notice scope.' }], basisClaimIds: ['date'], preserveTerms: ['CBP'] },
    ], articleClaimIds: ['date', 'scope'],
    review: { performedBy: actor, method: 'ai-source-and-language-review', claimIdsChecked: ['date', 'scope'], semanticSupport: 'pass', scopeAndDates: 'pass', riskClassification: 'routine-factual-reporting', translationConsistency: 'pass', duplicateTopicCheck: 'pass', headlineAndReaderValue: 'pass', sourceInstructionsIgnored: true, holds: [], rationale: 'Synthetic benign fixture for ordinary text roundtrip checks only; this is not a real editorial review or publishable article.' },
  };
}
const fetcher = async () => new Response('October 28, 2026. Official crossing notices include a publication date. Check the named port and the notice scope.', { headers: { 'content-type': 'text/plain' } });
const textHtml = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }[char]));
function temporaryRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'editorial-benign-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'src/content/blog'), { recursive: true });
  fs.mkdirSync(path.join(root, 'public/data'), { recursive: true });
  fs.writeFileSync(path.join(root, 'public/data/crossings.json'), JSON.stringify({ crossings: [{ port_number: '250401' }] }));
  return root;
}

test('benign EN/ES text stays in frontmatter data and compiles through the fixed MDX body', async () => {
  const b = bundle();
  const receipt = await verifyBundle(b, { now, fetcher });
  for (const lang of ['en', 'es']) {
    const raw = renderEditorial(receipt, lang);
    const { content, data } = matter(raw);
    assert.equal(data.editorialArticle.paragraphs[0].text, b.claims[0].text[lang]);
    assert.equal(data.editorialArticle.paragraphs[0].sources[0].label, b.sources[0].title);
    assert.equal(content.trim(), "import EditorialArticle from '@/components/blog/EditorialArticle.js';\n\n<EditorialArticle article={frontmatter.editorialArticle} />");
    assert.equal(content.includes(b.claims[0].text[lang]), false);
    let program;
    await compile(raw, { remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter], providerImportSource: '@mdx-js/react', recmaPlugins: [() => tree => { program = tree; }] });
    assert.deepEqual(program.body.filter(node => node.type === 'ExportNamedDeclaration').flatMap(node => node.declaration.declarations.map(declaration => declaration.id.name)), ['frontmatter']);
    assert.deepEqual(program.body.filter(node => node.type === 'ImportDeclaration').map(node => node.source.value).sort(), ['@/components/blog/EditorialArticle.js', '@mdx-js/react', 'react/jsx-runtime'].sort());
  }
});

test('the shared component preserves ordinary punctuation, citations and localized labels', async () => {
  const b = bundle();
  const receipt = await verifyBundle(b, { now, fetcher });
  for (const lang of ['en', 'es']) {
    const { data } = matter(renderEditorial(receipt, lang));
    const html = renderToStaticMarkup(createElement(EditorialArticle, { article: data.editorialArticle }));
    assert.ok(html.includes(textHtml(b.claims[0].text[lang])));
    assert.ok(html.includes('**A &amp; B**'));
    assert.ok(html.includes(textHtml(b.sources[0].title)));
    assert.equal((html.match(/href="https:\/\/www.cbp.gov\/newsroom\/fixture-only"/g) || []).length, 3);
    assert.ok(html.includes(`<strong>${lang === 'es' ? 'Interpretación:' : 'Interpretation:'} </strong>`));
    assert.ok(html.includes(lang === 'es' ? '2026-10-28 (hora no indicada)' : '2026-10-28 (time not stated)'));
    assert.ok(html.includes(`<h2>${lang === 'es' ? 'Fuentes y límites' : 'Sources and limits'}</h2>`));
    assert.ok(html.includes('/data/editorial-evidence/' + b.id + '.json'));
  }
});

test('benign data rendering retains the existing publication, receipt and review gates', async t => {
  const root = temporaryRoot(t);
  const b = bundle();
  const plan = await prepareEditorial(root, b, { now, fetcher });
  assert.equal(plan.status, 'eligible');
  assert.equal(plan.files.length, 3);
  assert.deepEqual(fs.readdirSync(path.join(root, 'src/content/blog')), []);
  await prepareEditorial(root, b, { now, fetcher, write: true });
  assert.equal(validateEditorialPosts(root), 1);
  assert.equal((await prepareEditorial(root, b, { now, fetcher })).reason, 'automated-report-already-published-today');
  const enPath = path.join(root, 'src/content/blog', b.id + '.mdx');
  fs.appendFileSync(enPath, '\nAn extra ordinary paragraph.\n');
  assert.throws(() => validateEditorialPosts(root), /differs/);
  const held = bundle();
  held.review.holds.push('Needs more context');
  assert.throws(() => checkBundle(held, { now }), /held/);
  const incomplete = bundle();
  incomplete.review.claimIdsChecked = ['date', 'date'];
  assert.throws(() => checkBundle(incomplete, { now }), /cover every claim/);
});

test('ordinary bilingual articles bundle with the repository Vite configuration', async t => {
  const root = temporaryRoot(t);
  fs.symlinkSync(fileURLToPath(new URL('../node_modules', import.meta.url)), path.join(root, 'node_modules'), 'dir');
  const receipt = await verifyBundle(bundle(), { now, fetcher });
  for (const lang of ['en', 'es']) fs.writeFileSync(path.join(root, `${lang}.mdx`), renderEditorial(receipt, lang));
  fs.writeFileSync(path.join(root, 'entry.js'), "export { default as English } from './en.mdx';\nexport { default as Spanish } from './es.mdx';\n");
  const { build } = await import('vite');
  const result = await build({ configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)), root, logLevel: 'warn', build: { write: false, minify: false, rollupOptions: { input: path.join(root, 'entry.js'), preserveEntrySignatures: 'strict', output: { manualChunks: undefined } } } });
  const chunks = result.output.filter(file => file.type === 'chunk');
  assert.ok(chunks.length > 0);
  assert.ok(chunks.some(chunk => chunk.code.includes('borderpulse-editorial-article-v1')));
});
