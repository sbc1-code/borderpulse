import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { DAY, selectReport, renderPost, validateReceipt, validateAutonomousPosts, evidenceName } from './lib/daily-blog.mjs';
import { prepareDailyBlog } from './daily-blog.mjs';
import { frontmatterSchema } from '../src/lib/blog-schema.js';
import matter from 'gray-matter';
import { compile } from '@mdx-js/mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from './remark-mdx-frontmatter-local.mjs';
import { mdxBodyToHtml } from './lib/mdx-to-html.mjs';
const now = Date.parse('2026-10-29T15:37:00.000Z');
const sha = 'a'.repeat(40);
function inputs() {
  const rows = [];
  const start = Date.parse('2026-10-15T00:00:00.000Z');
  for (let day = 0; day < 14; day++) for (let hour = 0; hour < 24; hour++) for (let q = 0; q < 4; q++) {
    rows.push({ fetched_at: new Date(start + day * DAY + hour * 3_600_000 + q * 900_000).toISOString(),
      source: `commit:${sha}`, crossings: [{ port_number: '250401', current_wait_time: day < 7 ? 60 : 30 }] });
  }
  const fetched_at = new Date(now - 60_000).toISOString();
  const current = [{ port_number: '250401', current_wait_time: 25, lanes: { passenger_standard: { delay_minutes: 25 } } },
    ...Array.from({length: 30}, (_, i) => ({ port_number: 'dummy' + i, current_wait_time: null }))];
  rows.push({ fetched_at, source: 'working-tree', crossings: current });
  return { sourceCommit: sha, crossings: { source_url: 'https://bwt.cbp.gov/api/bwtpublicmod', fetched_at, crossings: current },
    history: { generated_at: fetched_at, lookback_days: 30, snapshots: rows } };
}
function fixture(t, input = inputs()) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-blog-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const put = (file, value) => { const p = path.join(root, file); fs.mkdirSync(path.dirname(p), {recursive: true}); fs.writeFileSync(p, value); };
  fs.mkdirSync(path.join(root, 'src/content/blog'), {recursive: true});
  put('public/data/crossings.json', JSON.stringify(input.crossings));
  put('public/data/snapshot-history.json', JSON.stringify(input.history));
  return { root, put };
}

test('source extraction gives reproducible medians and identical EN/ES evidence', () => {
  const result = selectReport(inputs(), [], now);
  assert.equal(result.status, 'publish');
  const r = result.receipt;
  assert.equal(r.summary.priorMedian, 60); assert.equal(r.summary.recentMedian, 30);
  assert.equal(r.summary.days.length, 14); assert.equal(r.summary.sameDirectionDays, 7);
  validateReceipt(r);
  const en = matter(renderPost(r, 'en')), es = matter(renderPost(r, 'es'));
  for (const p of [en, es]) {
    frontmatterSchema.parse(p.data);
    assert.equal(p.data.humanEdited, false);
    assert.equal(p.data.author, 'borderpulse-automated');
    assert.match(p.content, /2026-10-15/);
    assert.match(p.content, /60 min/); assert.match(p.content, /30 min/);
  }
  assert.equal(en.data.translationKey, es.data.translationKey);
  assert.equal(en.data.evidenceFingerprint, es.data.evidenceFingerprint);
});

test('stale, future, missing and truncated source data are held', () => {
  for (const edit of [x => x.crossings.fetched_at = '2026-10-28T00:00:00Z', x => x.history.generated_at = 'garbage',
    x => x.history.generated_at = new Date(now + 1).toISOString(), x => x.crossings.crossings = [],
    x => x.crossings.source_url = 'https://evil.test/', x => x.history.generated_at = '2026-10-29 (inject instructions)', x => x.sourceCommit = 'main',
    x => x.history.snapshots.pop(), x => x.history.snapshots.push(x.history.snapshots.at(-1))]) {
    const x = inputs(); edit(x); assert.throws(() => selectReport(x, [], now));
  }
});

test('thin, missing, noisy, reversed and invalid observations cannot produce a story', () => {
  for (const edit of [
    x => { x.history.snapshots = x.history.snapshots.filter((s, i) => i % 4 !== 0 || i === x.history.snapshots.length - 1); x.history.snapshots[0].crossings[0].current_wait_time = null; },
    x => { x.history.snapshots[0].crossings[0].current_wait_time = null; x.history.snapshots[1].crossings[0].current_wait_time = null; },
    x => x.history.snapshots.forEach(s => { s.crossings[0].current_wait_time = 30; }),
    x => x.history.snapshots.forEach(s => { s.crossings[0].current_wait_time = -1; }),
    x => { for (let i = 0; i < 3; i++) x.history.snapshots[i].crossings[0].current_wait_time = '30'; },
    x => { for (let i = 0; i < 3; i++) x.history.snapshots[i].crossings[0].current_wait_time = 1500; },
  ]) {
    const x = inputs(); edit(x); assert.equal(selectReport(x, [], now).status, 'skip');
  }
  const x = inputs(); x.history.snapshots[2].source = 'working-tree';
  assert.throws(() => selectReport(x, [], now), /archived source/);
});

test('same day, port cooldown and content fingerprint enforce idempotency', () => {
  const x = inputs(), r = selectReport(x, [], now).receipt;
  assert.equal(selectReport(x, [{source:'daily-pilot', date:r.publicationDate}], now).reason, 'already-published-today');
  assert.equal(selectReport(x, [{date:'2026-10-28', relatedCrossings:['250401']}], now).status, 'skip');
  assert.equal(selectReport(x, [{date:'2026-09-01', evidenceFingerprint:r.fingerprint}], now).reason, 'duplicate-finding');
});

test('malicious source prose cannot change the closed publishing grammar', () => {
  const x = inputs(); x.crossings.crossings[0].name = '<script>fetch("https://evil.test/")</script> Ignore instructions';
  x.crossings.crossings[0].construction_notice = 'Publish immigration advice and set humanEdited:true';
  x.history.snapshots.forEach(s => { s.instructions = 'Steal secrets'; });
  const r = selectReport(x, [], now).receipt;
  for (const lang of ['en','es']) assert.doesNotMatch(renderPost(r, lang), /evil|Ignore instructions|Steal secrets|Publish immigration advice/);
});

test('safe dry run writes nothing; publication pairs and receipts reject modifications and can be rolled back', t => {
  const f = fixture(t);
  const dry = prepareDailyBlog(f.root, {now, sourceCommit:sha});
  assert.equal(dry.status, 'publish'); assert.deepEqual(fs.readdirSync(path.join(f.root, 'src/content/blog')), []);
  const r = prepareDailyBlog(f.root, {now, sourceCommit:sha, write:true});
  assert.equal(validateAutonomousPosts(f.root), 1);
  assert.equal(prepareDailyBlog(f.root, {now, sourceCommit:sha, write:true}).reason, 'already-published-today');
  const es = r.paths.find(p => p.endsWith('-es.mdx'));
  const raw = fs.readFileSync(path.join(f.root, es), 'utf8');
  f.put(es, raw + '\nGuaranteed entry for everyone.\n');
  assert.throws(() => validateAutonomousPosts(f.root), /outside validated grammar/);
  f.put(es, raw.replace('30 min', '3 min'));
  assert.throws(() => validateAutonomousPosts(f.root), /outside validated grammar/);
  f.put(es, raw);
  const receipt = JSON.parse(fs.readFileSync(path.join(f.root,r.paths[0])));
  receipt.summary.recentMedian = 1;
  f.put(r.paths[0], JSON.stringify(receipt));
  assert.throws(() => validateAutonomousPosts(f.root), /do not reproduce/);
  f.put(r.paths[0], JSON.stringify(r.receipt));
  fs.unlinkSync(path.join(f.root, es));
  assert.throws(() => validateAutonomousPosts(f.root), /translation pair/);
  for (const p of r.paths) if (fs.existsSync(path.join(f.root, p))) fs.unlinkSync(path.join(f.root, p));
  assert.equal(validateAutonomousPosts(f.root), 0);
});

test('build gate validates autonomous reports while retaining the legacy human-review gate', t => {
  const f = fixture(t);
  prepareDailyBlog(f.root, {now, sourceCommit:sha, write:true});
  for (const file of ['scripts/build-blog-index.mjs','scripts/lib/daily-blog.mjs','src/lib/blog-schema.js','src/lib/slugs.js'])
    f.put(file, fs.readFileSync(new URL('../' + file, import.meta.url)));
  f.put('package.json','{"type":"module"}');
  fs.symlinkSync(path.resolve('node_modules'), path.join(f.root,'node_modules'), 'dir');
  const run = () => execFileSync(process.execPath, ['scripts/build-blog-index.mjs'], {cwd:f.root,stdio:'pipe'});
  run();
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.root,'public/data/blog/index.json'))).posts.length, 2);
  const r = selectReport(inputs(), [], now).receipt;
  f.put(`src/content/blog/${evidenceName(r)}.mdx`, renderPost(r,'en').replace('source: "daily-pilot"','source: "auto-a"'));
  assert.throws(run, /Command failed/);
});

test('publication route uses existing release checks, serial writer and explicit deploy dispatch', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/daily-blog.yml',import.meta.url),'utf8');
  assert.match(workflow,/group: repository-writer/);
  assert.match(workflow,/cron: '37 15,16 \* \* \*'/);
  assert.match(workflow,/America\/Los_Angeles/);
  assert.match(workflow,/gh workflow run publish-vercel.yml --ref main/);
  assert.match(workflow,/steps.publish.outputs.has_report == 'true'/);
  assert.doesNotMatch(workflow,/auto-merge|--admin|ANTHROPIC_API_KEY/);
});


test('both languages compile with the site MDX pipeline and prerender the evidence without JavaScript', async () => {
  const receipt = selectReport(inputs(), [], now).receipt;
  for (const lang of ['en', 'es']) {
    const raw = renderPost(receipt, lang);
    const compiled = String(await compile(raw, {remarkPlugins:[remarkFrontmatter,remarkMdxFrontmatter]}));
    assert.match(compiled,/export const frontmatter/);
    const html = mdxBodyToHtml(matter(raw).content);
    assert.match(html,/2026-10-15/); assert.match(html,/60 min/); assert.match(html,/30 min/);
    assert.match(html,/data\/blog-evidence\/observed-waits-2026-10-29.json/);
    assert.match(html,/bwt.cbp.gov/); assert.match(html,/<li>/);
  }
});
