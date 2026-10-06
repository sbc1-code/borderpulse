#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { publishGeneratedData } from './lib/generated-writer.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2];
const modes = {
  cbp: {
    paths: ['public/data/crossings.json', 'public/data/exchange-rate.json', 'public/data/snapshot-history.json'],
    message: 'chore(data): refresh CBP + FX snapshot',
    commands: [
      ['node', 'scripts/fetch-cbp.mjs'],
      ['node', 'scripts/fetch-fx.mjs'],
      ['npm', 'run', 'history:build', '--', '--include-current'],
      ['npm', 'run', 'build'],
    ],
  },
  anomaly: {
    paths: ['public/data/anomalies.json'],
    message: 'chore(data): refresh anomalies',
    author: { name: 'borderpulse-bot', email: '207095575+sbc1-code@users.noreply.github.com' },
    commands: [
      ['node', 'scripts/build-aggregates.mjs'],
      ['node', 'scripts/detect-anomalies.mjs'],
    ],
  },
};

try {
  if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('This writer is for disposable GitHub Actions runners only');
  if (!modes[mode]) throw new Error('Expected writer mode: cbp or anomaly');
  const { commands, ...config } = modes[mode];
  const result = await publishGeneratedData({
    root, ...config,
    // The manual drafter must use the exact final candidate's queue and code.
    // GitHub discards the isolated runner/worktree when this job finishes.
    preserveWorktree: mode === 'anomaly' && process.env.GITHUB_EVENT_NAME === 'workflow_dispatch',
    generate(worktree) {
      // Each attempt installs its own current lockfile, never stale deps from
      // the triggering SHA or the rejected candidate.
      for (const [command, ...args] of [['npm', 'ci'], ...commands]) {
        execFileSync(command, args, { cwd: worktree, stdio: 'inherit' });
      }
    },
  });
  const output = `changed=${result.changed}\ncommit_sha=${result.commitSha}\n${result.worktree ? `worktree=${result.worktree}\n` : ''}`;
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
  console.log(`[writer] ${result.changed ? 'Published' : 'Unchanged'} validated snapshot ${result.commitSha}`);
} catch (error) {
  console.error(`[writer] ${error.message}`);
  if (error.stderr) console.error(String(error.stderr));
  process.exitCode = 1;
}
