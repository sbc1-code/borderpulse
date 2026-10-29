#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { publishGeneratedData } from './lib/generated-writer.mjs';
import { prepareDailyBlog } from './daily-blog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('Publisher only runs on disposable Actions runners');
  if (process.env.BLOG_PILOT_ENABLED !== 'true') throw new Error('Daily blog pilot disabled');
  const now = Date.now(), day = new Date(now).toISOString().slice(0, 10), baseName = `observed-waits-${day}`;
  let hasReport = false;
  const result = await publishGeneratedData({
    root,
    paths: [],
    optionalPaths: [`src/content/blog/${baseName}.mdx`, `src/content/blog/${baseName}-es.mdx`, `public/data/blog-evidence/${baseName}.json`],
    message: `blog: publish verified bilingual observed-wait report ${day}`,
    generate(worktree, { base }) {
      execFileSync('npm', ['ci'], { cwd: worktree, stdio: 'inherit' });
      const attemptNow = Date.now();
      if (new Date(attemptNow).toISOString().slice(0, 10) !== day) throw new Error('Publication date changed; rerun on the new day');
      const decision = prepareDailyBlog(worktree, { sourceCommit: base, write: true, now: attemptNow });
      hasReport = decision.status === 'publish' || decision.reason === 'already-published-today';
      console.log(`[daily-blog] ${decision.status}: ${decision.reason || decision.receipt.port}`);
      if (decision.status === 'publish') {
        // The same release checks used by production, before any main write.
        execFileSync('npm', ['run', 'build'], { cwd: worktree, stdio: 'inherit' });
        execFileSync('npm', ['test'], { cwd: worktree, stdio: 'inherit' });
        // Use the actual completion clock: a slow build cannot publish stale evidence.
        if (Date.now() - Date.parse(decision.receipt.fetchedAt) > 90 * 60_000) throw new Error('Evidence expired while verifying');
      }
    },
  });
  const output = `changed=${result.changed}\ncommit_sha=${result.commitSha}\nhas_report=${hasReport}\n`;
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
  console.log(`[daily-blog] ${result.changed ? 'Published source' : 'Skipped/no new source'} ${result.commitSha}`);
} catch (error) {
  console.error(`[daily-blog] held: ${error.message}`);
  process.exitCode = 1;
}
