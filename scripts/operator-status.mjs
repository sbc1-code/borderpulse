#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { freshnessOf } = await import('../src/lib/trustState.js');

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

async function checkLiveData() {
  try {
    const response = await fetch('https://borderpulse.com/data/crossings.json', {
      headers: { 'user-agent': 'borderpulse-operator-status/1.0' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { state: `HTTP ${response.status}`, age: null, count: null };
    const snapshot = await response.json();
    const { state, age } = freshnessOf(snapshot?.fetched_at);
    return { state, age, count: snapshot?.count ?? snapshot?.crossings?.length ?? null };
  } catch (error) {
    return { state: `unreachable (${error.message})`, age: null, count: null };
  }
}

const branch = git(['branch', '--show-current']) || '(detached)';
const head = git(['rev-parse', '--short', 'HEAD']) || '(unknown)';
const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']) || 'origin/main';
const remote = git(['rev-parse', '--short', upstream]) || '(not fetched)';
const clean = git(['status', '--short']) === '';
const relation = git(['rev-list', '--left-right', '--count', `HEAD...${upstream}`]) || '(unknown)';
const live = await checkLiveSite();
const data = await checkLiveData();

console.log('BorderPulse operator status');
console.log('===========================');
console.log(`Active task: ${readActiveTask('tasks/ACTIVE.md')}`);
console.log(`Branch:      ${branch}`);
console.log(`Local code:  ${head}`);
console.log(`Remote ref:  ${upstream} (${remote})`);
console.log(`Sync:        ${relation} (left=local-only, right=remote-only)`);
console.log(`Worktree:    ${clean ? 'clean' : 'has uncommitted changes'}`);
console.log(`Live site:   ${live.state}`);
console.log(`Live server: ${live.server}`);
console.log(`Live update: ${live.updated}`);
console.log(`Live data:   ${data.state}${data.age == null ? '' : ` (${data.age} min old)`}`);
console.log(`Data count:  ${data.count ?? '(unknown)'}`);
console.log('');

if (!clean) console.log('Next safe move: inspect the worktree before starting another task.');
else if (relation !== '0\t0') console.log('Next safe move: reconcile local and remote code before shipping.');
else console.log('Next safe move: continue the first unchecked item in tasks/ACTIVE.md.');
