import assert from 'node:assert/strict';
import test from 'node:test';
import { frontmatterSchema } from '../src/lib/blog-schema.js';

const valid = {
  title: 'A border crossing guide',
  description: 'Check current official crossing reports before traveling. This guide explains the steps and sources to verify.',
  slug: 'a-border-crossing-guide',
  date: '2026-10-24',
  author: 'sebastian',
  pillar: 'crossing-guides',
  lang: 'en',
};

test('EN/ES frontmatter keeps defaults and strips unknown fields', () => {
  for (const lang of ['en', 'es']) {
    assert.deepEqual(frontmatterSchema.parse({ ...valid, lang, extra: 'ignored' }), {
      ...valid,
      lang,
      tags: [],
      relatedCrossings: [],
      officialSources: [],
      draft: false,
      source: 'human',
      humanEdited: true,
    });
  }
});

test('draft metadata retains explicit values and official sources', () => {
  const input = {
    ...valid,
    lang: 'es',
    tags: ['planning'],
    relatedCrossings: ['san-ysidro'],
    officialSources: [{ label: 'CBP', url: 'https://www.cbp.gov/' }],
    draft: true,
    source: 'auto-a',
    humanEdited: false,
  };
  assert.deepEqual(frontmatterSchema.parse(input), input);
});

test('invalid frontmatter still supplies field diagnostics used by build and drafters', () => {
  const result = frontmatterSchema.safeParse({
    ...valid,
    title: '',
    description: 'short',
    slug: 'Invalid Slug',
    lang: 'fr',
    officialSources: [{ label: 'CBP', url: 'invalid-url' }],
  });
  assert.equal(result.success, false);
  const fields = result.error.flatten().fieldErrors;
  assert.deepEqual(Object.keys(fields).sort(), ['description', 'lang', 'officialSources', 'slug', 'title']);
  assert.ok(Object.values(fields).every(messages => messages.length > 0));
});

test('the existing six-tag limit accepts its boundary and rejects the next item', () => {
  assert.equal(frontmatterSchema.safeParse({ ...valid, tags: Array(6).fill('planning') }).success, true);
  assert.equal(frontmatterSchema.safeParse({ ...valid, tags: Array(7).fill('planning') }).success, false);
});

test('oversized invalid tags report the size bound without accumulating element errors', () => {
  // Exercise the advisory on the real bounded schema, with a small controlled input.
  // This verifies bounded diagnostics rather than timing or exhausting the process.
  const result = frontmatterSchema.safeParse({ ...valid, tags: Array(10_000).fill(0) });
  assert.equal(result.success, false);
  assert.equal(result.error.issues.length, 1);
  assert.equal(result.error.issues[0].code, 'too_big');
  assert.deepEqual(result.error.issues[0].path, ['tags']);
});
