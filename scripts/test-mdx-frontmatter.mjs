import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { compile } from '@mdx-js/mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from './remark-mdx-frontmatter-local.mjs';

test('local MDX frontmatter plugin exports YAML metadata', async () => {
  const source = fs.readFileSync('src/content/blog/best-time-to-cross-tecate.mdx', 'utf8');
  const compiled = String(await compile(
    { path: 'fixture.mdx', value: source },
    { remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter] },
  ));

  assert.match(compiled, /export const frontmatter/);
  assert.match(compiled, /best-time-to-cross-tecate/);
  assert.doesNotMatch(compiled, /toml/);
});
