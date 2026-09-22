#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function git(args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function readActiveTask(file) {
  try {
    const lines = fs.readFileSync(path.resolve(root, file), 'utf8')
      .split('\n')
      .map((line) => line.trim());
    return lines.find((line) => /^- \[~\]/.test(line))
      || lines.find((line) => /^- \[ \]/.test(line))
      || '(no open task)';
  } catch {
    return '(missing)';
  }
}

async function checkLiveSite() {
  try {
    const response = await fetch('https://borderpulse.com/', {
      headers: { 'user-agent': 'borderpulse-operator-status/1.0' },
      signal: AbortSignal.timeout(10_000),
    });
    return {
      state: response.ok ? 'reachable' : `HTTP ${response.status}`,
      server: response.headers.get('server') || '(not reported)',
      updated: response.headers.get('last-modified') || '(not reported)',
    };
  } catch (error) {
    return { state: `unreachable (${error.message})`, server: '(unknown)', updated: '(unknown)' };
  }
}

const branch = git(['branch', '--show-current']) || '(detached)';
const head = git(['rev-parse', '--short', 'HEAD']) || '(unknown)';
const remote = git(['rev-parse', '--short', 'origin/main']) || '(not fetched)';
const clean = git(['status', '--short']) === '';
const relation = git(['rev-list', '--left-right', '--count', 'HEAD...origin/main']) || '(unknown)';
const live = await checkLiveSite();

console.log('BorderPulse operator status');
console.log('===========================');
console.log(`Active task: ${readActiveTask('tasks/ACTIVE.md')}`);
console.log(`Branch:      ${branch}`);
console.log(`Local code:  ${head}`);
console.log(`Remote main: ${remote}`);
console.log(`Sync:        ${relation} (left=local-only, right=remote-only)`);
console.log(`Worktree:    ${clean ? 'clean' : 'has uncommitted changes'}`);
console.log(`Live site:   ${live.state}`);
console.log(`Live server: ${live.server}`);
console.log(`Live update: ${live.updated}`);
console.log('');

if (!clean) console.log('Next safe move: inspect the worktree before starting another task.');
else if (relation !== '0\t0') console.log('Next safe move: reconcile local and remote code before shipping.');
else console.log('Next safe move: continue the first unchecked item in tasks/ACTIVE.md.');
