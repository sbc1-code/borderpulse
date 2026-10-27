import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import matter from 'gray-matter';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const valid = {
  title: 'A test crossing guide',
  description: 'Check current official crossing reports before traveling. This fixture explains the steps and sources to verify.',
  slug: 'test-crossing-guide', date: '2026-10-24', author: 'sebastian',
  pillar: 'data-analysis', lang: 'en',
};
const anomaly = {
  type: 'lowest_today', port_name: 'Test Port', port_slug: 'test-port',
  port_number: '9901', state: 'Test', finding: 'Controlled fixture',
  evidence: { day_label: 'Monday', best_hour: 7, best_median: 10,
    overall_median: 30, samples: 12, peak_hour: 18, ratio: 2, peak_median: 60 },
};
const mdx = fm => '---\n' + Object.entries(fm).map(([key, value]) =>
  key + ': ' + JSON.stringify(value)).join('\n') + '\n---\n\nFixture body.\n';

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-generation-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const put = (file, value) => {
    const full = path.join(directory, file);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, value);
  };
  put('package.json', '{"type":"module"}');
  for (const file of [
    'src/lib/blog-schema.js', 'src/lib/slugs.js', 'scripts/build-blog-index.mjs',
    'scripts/draft-from-anomaly.mjs', 'scripts/draft-from-anomaly-llm.mjs',
    'scripts/lib/anthropic-client.mjs', 'scripts/lib/prompts/anomaly-draft.md',
  ]) put(file, fs.readFileSync(path.join(root, file)));
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(directory, 'node_modules'), 'dir');
  fs.mkdirSync(path.join(directory, 'src/content/blog'), { recursive: true });
  put('public/data/crossings.json', '{"crossings":[]}');
  put('drafts/blog/auto-a/queue.json', JSON.stringify({ anomalies: [anomaly] }));
  // Run the real SDK/client while intercepting every fetch before it can use
  // the network. Child processes receive a dummy key and no inherited secrets.
  put('mock-fetch.mjs', [
    "import fs from 'node:fs';",
    "import assert from 'node:assert/strict';",
    'globalThis.fetch = async (url, options) => {',
    "  assert.equal(String(url), 'https://api.anthropic.com/v1/messages');",
    "  assert.equal(options.method, 'POST');",
    '  const request = JSON.parse(options.body);',
    "  assert.equal(request.tool_choice.name, 'write_post_draft');",
    '  assert.equal(request.max_tokens, 3000);',
    "  fs.appendFileSync('mock-calls.txt', 'intercepted\\n');",
    "  const content = JSON.parse(fs.readFileSync('mock-content.json', 'utf8'));",
    '  return new Response(JSON.stringify({',
    "    id: 'msg_fixture', type: 'message', role: 'assistant', model: 'fixture',",
    "    content, stop_reason: 'tool_use', stop_sequence: null,",
    '    usage: { input_tokens: 1, output_tokens: 1 },',
    "  }), { status: 200, headers: { 'content-type': 'application/json' } });",
    '};',
  ].join('\n'));
  const run = (script, { content } = {}) => {
    const args = [];
    const env = { PATH: process.env.PATH, TZ: 'UTC' };
    if (content) {
      put('mock-content.json', JSON.stringify(content));
      args.push('--import', path.join(directory, 'mock-fetch.mjs'));
      env.ANTHROPIC_API_KEY = 'test-only-no-network';
    }
    const result = spawnSync(process.execPath, [...args, path.join(directory, script)], {
      cwd: directory, env, encoding: 'utf8', timeout: 20_000,
    });
    assert.ifError(result.error);
    return result;
  };
  const drafts = () => fs.readdirSync(path.join(directory, 'drafts/blog/auto-a'))
    .filter(file => file.endsWith('.mdx')).map(file => matter(fs.readFileSync(
      path.join(directory, 'drafts/blog/auto-a', file), 'utf8')));
  return { directory, put, run, drafts };
}
const toolResponse = frontmatter => [{
  type: 'tool_use', id: 'tool_fixture', name: 'write_post_draft',
  input: { frontmatter, body: 'Mocked draft body.' },
}];

test('template generation writes validated drafts for both existing anomaly templates', t => {
  const f = fixture(t);
  f.put('drafts/blog/auto-a/queue.json', JSON.stringify({
    anomalies: [anomaly, { ...anomaly, type: 'sunday_spike' }],
  }));
  const result = f.run('scripts/draft-from-anomaly.mjs');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /2 drafts written, 0 skipped/);
  assert.equal(f.drafts().length, 2);
  for (const draft of f.drafts()) {
    assert.equal(draft.data.draft, true);
    assert.equal(draft.data.humanEdited, false);
    assert.equal(draft.data.source, 'auto-a');
  }
});

test('template generation reports invalid metadata and continues to a valid anomaly', t => {
  const f = fixture(t);
  f.put('drafts/blog/auto-a/queue.json', JSON.stringify({
    anomalies: [{ ...anomaly, port_name: 'x'.repeat(100) }, anomaly],
  }));
  const result = f.run('scripts/draft-from-anomaly.mjs');
  assert.equal(result.status, 0);
  assert.match(result.stderr, /frontmatter validation failed/);
  assert.match(result.stderr, /title/);
  assert.match(result.stdout, /1 drafts written, 1 skipped/);
  assert.equal(f.drafts().length, 1);
});

test('real SDK with mocked EN/ES tool responses retains the draft and human-review flags', t => {
  for (const lang of ['en', 'es']) {
    const f = fixture(t);
    const result = f.run('scripts/draft-from-anomaly-llm.mjs', {
      content: toolResponse({ ...valid, lang, draft: false, humanEdited: true }),
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /1 drafts written, 0 failed/);
    assert.equal(fs.readFileSync(path.join(f.directory, 'mock-calls.txt'), 'utf8'), 'intercepted\n');
    assert.equal(f.drafts().length, 1);
    assert.deepEqual({ ...f.drafts()[0].data }, {
      ...valid, lang, draft: true, humanEdited: false, source: 'auto-a',
    });
    assert.equal(fs.readdirSync(path.join(f.directory, 'src/content/blog')).length, 0);
  }
});

test('mocked LLM invalid fields retain flattened diagnostics and write no draft', t => {
  const f = fixture(t);
  const result = f.run('scripts/draft-from-anomaly-llm.mjs', {
    content: toolResponse({ ...valid, lang: 'fr', tags: Array(7).fill('tag'),
      officialSources: [{ label: 'CBP', url: 'invalid-url' }] }),
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /0 drafts written, 1 failed/);
  for (const field of ['lang', 'tags', 'officialSources']) assert.match(result.stderr, new RegExp(field));
  assert.equal(f.drafts().length, 0);
});

test('a mocked response without the draft tool is reported without creating a file', t => {
  const f = fixture(t);
  const result = f.run('scripts/draft-from-anomaly-llm.mjs', {
    content: [{ type: 'text', text: 'No tool in this fixture.' }],
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /0 drafts written, 1 failed/);
  assert.match(result.stderr, /Model did not call write_post_draft tool/);
  assert.equal(f.drafts().length, 0);
});

test('blog index retains draft exclusion and requires human review before publishing auto analysis', t => {
  const f = fixture(t);
  const frontmatter = { ...valid, draft: true, source: 'auto-a', humanEdited: false };
  const file = 'src/content/blog/test-crossing-guide.mdx';
  f.put(file, mdx(frontmatter));
  assert.equal(f.run('scripts/build-blog-index.mjs').status, 0);
  const index = path.join(f.directory, 'public/data/blog/index.json');
  assert.deepEqual(JSON.parse(fs.readFileSync(index)).posts, []);
  f.put(file, mdx({ ...frontmatter, draft: false }));
  const rejected = f.run('scripts/build-blog-index.mjs');
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /requires humanEdited: true/);
  assert.deepEqual(JSON.parse(fs.readFileSync(index)).posts, []);
  f.put(file, mdx({ ...frontmatter, draft: false, humanEdited: true }));
  assert.equal(f.run('scripts/build-blog-index.mjs').status, 0);
  const posts = JSON.parse(fs.readFileSync(index)).posts;
  assert.equal(posts.length, 1);
  assert.equal(posts[0].slug, valid.slug);
  assert.deepEqual(posts[0].tags, []);
});

test('blog index rejects malformed source metadata with the existing field diagnostics', t => {
  const f = fixture(t);
  f.put('src/content/blog/test-crossing-guide.mdx', mdx({ ...valid, lang: 'fr',
    officialSources: [{ label: 'CBP', url: 'invalid-url' }] }));
  const result = f.run('scripts/build-blog-index.mjs');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /frontmatter errors/);
  assert.match(result.stderr, /lang/);
  assert.match(result.stderr, /officialSources/);
  assert.equal(fs.existsSync(path.join(f.directory, 'public/data/blog/index.json')), false);
});
