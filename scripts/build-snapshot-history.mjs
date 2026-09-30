#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = 'public/data/crossings.json';
const OUTPUT_FILE = path.resolve(root, 'public/data/snapshot-history.json');
const LOOKBACK_DAYS = 30;

function git(args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  }).trim();
}

function compactSnapshot(raw, source) {
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch {
    return null;
  }
  const fetchedAt = doc?.fetched_at;
  const timestamp = fetchedAt ? new Date(fetchedAt) : null;
  if (!timestamp || Number.isNaN(timestamp.getTime()) || !Array.isArray(doc.crossings)) return null;

  return {
    fetched_at: timestamp.toISOString(),
    source,
    crossings: doc.crossings.map((crossing) => ({
      port_number: String(crossing.port_number),
      current_wait_time: typeof crossing.current_wait_time === 'number'
        ? crossing.current_wait_time
        : null,
    })),
  };
}

function main() {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString();
  const snapshots = new Map();
  const log = git(['log', `--since=${sinceIso}`, '--format=%H', '--', DATA_FILE]);
  const shas = log.split('\n').map((sha) => sha.trim()).filter(Boolean);

  for (const sha of shas) {
    try {
      const snapshot = compactSnapshot(git(['show', `${sha}:${DATA_FILE}`]), `commit:${sha}`);
      if (snapshot && new Date(snapshot.fetched_at) >= since) snapshots.set(snapshot.fetched_at, snapshot);
    } catch {
      // A malformed historical commit must not make a valid current artifact
      // disappear. The live fetch and its validation remain the hard gate.
    }
  }

  if (process.argv.includes('--include-current')) {
    const current = compactSnapshot(
      fs.readFileSync(path.resolve(root, DATA_FILE), 'utf8'),
      'working-tree',
    );
    if (current && new Date(current.fetched_at) >= since) snapshots.set(current.fetched_at, current);
  }

  const ordered = [...snapshots.values()].sort((a, b) => a.fetched_at.localeCompare(b.fetched_at));
  if (ordered.length === 0) {
    throw new Error('No valid snapshots found for the explicit history artifact');
  }

  const artifact = {
    source: DATA_FILE,
    lookback_days: LOOKBACK_DAYS,
    generated_at: new Date().toISOString(),
    snapshots: ordered,
  };
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(artifact)}\n`);
  console.log(`[history] wrote ${ordered.length} snapshots → ${OUTPUT_FILE}`);
}

try {
  main();
} catch (error) {
  console.error(`[history] ${error.message}`);
  process.exit(1);
}
