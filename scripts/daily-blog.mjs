#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';
import { selectReport, renderPost, evidenceName, validateAutonomousPosts } from './lib/daily-blog.mjs';

export function prepareDailyBlog(root, { now = Date.now(), write = false, sourceCommit } = {}) {
  validateAutonomousPosts(root);
  const read = name => JSON.parse(fs.readFileSync(path.join(root, 'public/data', name), 'utf8'));
  const posts = fs.readdirSync(path.join(root, 'src/content/blog')).filter(f => f.endsWith('.mdx'))
    .map(f => matter(fs.readFileSync(path.join(root, 'src/content/blog', f), 'utf8')).data).filter(f => !f.draft);
  const result = selectReport({ crossings: read('crossings.json'), history: read('snapshot-history.json'), sourceCommit }, posts, now);
  if (result.status === 'publish') {
    const receipt = result.receipt;
    result.paths = [`public/data/blog-evidence/${evidenceName(receipt)}.json`, ...['en', 'es'].map(lang =>
      `src/content/blog/${evidenceName(receipt)}${lang === 'es' ? '-es' : ''}.mdx`)];
    if (result.paths.some(file => fs.existsSync(path.join(root, file)))) throw new Error('Daily content path already exists; refusing overwrite');
    if (write) {
      fs.mkdirSync(path.join(root, 'public/data/blog-evidence'), { recursive: true });
      fs.writeFileSync(path.join(root, result.paths[0]), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
      for (const lang of ['en', 'es']) fs.writeFileSync(path.join(root, result.paths[lang === 'en' ? 1 : 2]), renderPost(receipt, lang), { flag: 'wx' });
      validateAutonomousPosts(root);
    }
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  try {
    if (process.argv.includes('--validate')) {
      console.log(`[daily-blog] verified ${validateAutonomousPosts(root)} bilingual reports`);
    } else {
      const result = prepareDailyBlog(root, {
        sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
        write: process.argv.includes('--write'),
      });
      const { receipt, ...status } = result;
      console.log(JSON.stringify({ ...status, port: receipt?.port, summary: receipt?.summary, written: process.argv.includes('--write') }, null, 2));
      if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `decision=${result.status}\n`);
    }
  } catch (error) {
    console.error(`[daily-blog] held: ${error.message}`);
    process.exitCode = 1;
  }
}
