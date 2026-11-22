#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const validSha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value) && !/^0{40}$/.test(value);
const validPath = value => typeof value === 'string' && !/\s/.test(value)
  && /^drafts\/editorial\/inbox\/\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.json$/.test(value);
const runGit = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
  stdio: ['ignore', 'pipe', 'pipe'] });

export function resolveEditorialSubmission({ eventName, event, inputPath, git = runGit }) {
  let revision;
  let paths;
  if (eventName === 'workflow_dispatch') {
    paths = [inputPath];
    revision = git(['rev-parse', 'HEAD']).trim();
  } else if (eventName === 'push') {
    if (event.ref !== 'refs/heads/main' || !validSha(event.before) || !validSha(event.after)) {
      throw new Error('Expected an existing main push with valid before/after commits');
    }
    // Actions omits added/modified/removed from commit payloads. Read the real
    // commit trees; shallow checkouts fetch only missing exact commit objects.
    for (const sha of [event.before, event.after]) {
      try { git(['cat-file', '-e', `${sha}^{commit}`]); }
      catch {
        git(['fetch', '--no-tags', '--depth=1', 'origin', sha]);
        git(['cat-file', '-e', `${sha}^{commit}`]);
      }
    }
    paths = git(['diff', '--no-renames', '--name-only', '--diff-filter=AM', '-z', event.before, event.after,
      '--', 'drafts/editorial/inbox/']).split('\0').filter(Boolean);
    revision = event.after;
  } else {
    throw new Error('Unsupported editorial submission event');
  }
  const selected = [...new Set(paths)].filter(validPath);
  if (selected.length !== 1) throw new Error('Expected exactly one editorial submission; do not batch input files');
  const input = selected[0];
  const expectedBlob = git(['rev-parse', `${revision}:${input}`]).trim();
  const checkedOutBlob = git(['hash-object', '--', input]).trim();
  if (!validSha(expectedBlob) || expectedBlob !== checkedOutBlob) {
    throw new Error('Submission changed after the triggering revision; use its newer run');
  }
  return { path: input, blobSha: expectedBlob };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const resolved = resolveEditorialSubmission({eventName:process.env.GITHUB_EVENT_NAME,event,inputPath:process.env.INPUT_PATH});
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `path=${resolved.path}\nblob_sha=${resolved.blobSha}\n`);
    console.log(`[editorial] resolved ${resolved.path} at input blob ${resolved.blobSha}`);
  } catch (error) {
    console.error(`[editorial] held: ${error.message}`);
    process.exitCode = 1;
  }
}
