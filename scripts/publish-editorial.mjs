#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { publishGeneratedData } from './lib/generated-writer.mjs';
import { prepareEditorial } from './editorial-bundle.mjs';
import { hash, editorialBundleSchema } from './lib/editorial-bundle.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  if (process.env.GITHUB_ACTIONS !== 'true' || process.env.AI_EDITORIAL_INGEST_ENABLED !== 'true') {
    throw new Error('Editorial ingest not enabled on an Actions runner');
  }
  const inputPath = process.env.EDITORIAL_BUNDLE_PATH;
  if (!/^drafts\/editorial\/inbox\/\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.json$/.test(inputPath || '')) {
    throw new Error('Unsafe submission path');
  }
  const id = path.basename(inputPath, '.json');
  let eligible = false;
  const result = await publishGeneratedData({
    root,
    paths: [],
    optionalPaths: [
      `public/data/editorial-evidence/${id}.json`,
      `src/content/blog/${id}.mdx`,
      `src/content/blog/${id}-es.mdx`,
    ],
    message: `blog: publish source-reviewed AI editorial ${id}`,
    async generate(worktree) {
      execFileSync('npm', ['ci'], { cwd: worktree, stdio: 'inherit' });
      const input = JSON.parse(fs.readFileSync(path.join(worktree, inputPath), 'utf8'));
      if (input.id !== id) throw new Error('Submission id/path mismatch');
      const existing = path.join(worktree, `public/data/editorial-evidence/${id}.json`);
      // Recover a lost downstream dispatch without changing a published article.
      if (fs.existsSync(existing)) {
        const original = JSON.parse(fs.readFileSync(existing, 'utf8'));
        if (hash(original.bundle) !== hash(editorialBundleSchema.parse(input))) {
          throw new Error('Submission changed after publication; prepare an explicit correction');
        }
        execFileSync('node', ['scripts/editorial-bundle.mjs', 'check-published'], {
          cwd: worktree, stdio: 'inherit',
        });
        eligible = true;
        return;
      }
      const decision = await prepareEditorial(worktree, input, { write: true });
      eligible = decision.status === 'eligible';
      console.log(`[editorial] ${decision.status}: ${decision.reason || id}`);
      if (eligible) {
        execFileSync('npm', ['run', 'build'], { cwd: worktree, stdio: 'inherit' });
        execFileSync('npm', ['test'], { cwd: worktree, stdio: 'inherit' });
        if (Date.now() - Date.parse(decision.receipt.admittedAt) > 30 * 60_000) {
          throw new Error('Editorial verification expired during release checks');
        }
      }
    },
  });
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT,
      `changed=${result.changed}\ncommit_sha=${result.commitSha}\nhas_report=${eligible}\n`);
  }
  console.log(`[editorial] ${result.changed ? 'Published source' : 'No new source'} ${result.commitSha}`);
} catch (error) {
  console.error('[editorial] held: ' + error.message);
  process.exitCode = 1;
}
