import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildSlugMap } from '../src/lib/slugs.js';
import { canonicalPortNumber } from '../src/lib/portIdentity.js';
import { getPortTimezone, nowInTz } from '../src/components/utils/crossingMeta.js';
import { accumulateSnapshot } from '../src/lib/laneFlips.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = 'public/data/crossings.json';
const OUTPUT_FILE = path.resolve(root, 'public/data/lane-flips.json');
const LOOKBACK_DAYS = 30;

function git(args, options = {}) {
  return execFileSync('git', args, {
    cwd: root,
    maxBuffer: options.maxBuffer || 20 * 1024 * 1024,
    input: options.input,
  });
}

function parseBatch(buffer) {
  const docs = [];
  let offset = 0;
  while (offset < buffer.length) {
    const newline = buffer.indexOf(0x0a, offset);
    if (newline < 0) break;
    const header = buffer.toString('utf8', offset, newline);
    offset = newline + 1;
    const parts = header.split(' ');
    if (parts.length < 3 || parts[1] === 'missing') continue;
    const size = Number(parts[2]);
    if (!Number.isFinite(size) || size < 0) continue;
    docs.push(buffer.toString('utf8', offset, offset + size));
    offset += size + 1;
  }
  return docs;
}

function readBlobs(shas) {
  const bodies = [];
  const chunkSize = 80;
  for (let index = 0; index < shas.length; index += chunkSize) {
    const chunk = shas.slice(index, index + chunkSize);
    const spec = `${chunk.map(sha => `${sha}:${DATA_FILE}`).join('\n')}\n`;
    const output = git(['cat-file', '--batch'], { input: spec, maxBuffer: 32 * 1024 * 1024 });
    bodies.push(...parseBatch(output));
  }
  return bodies;
}

export function writeLaneFlips({ includeCurrent = false } = {}) {
  const shallow = git(['rev-parse', '--is-shallow-repository']).toString('utf8').trim();
  if (shallow === 'true') {
    throw new Error('Refusing to rebuild lane flips from a shallow clone');
  }
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const log = git(['log', `--since=${since.toISOString()}`, '--format=%H', '--', DATA_FILE]).toString('utf8');
  const shas = log.split('\n').map(sha => sha.trim()).filter(Boolean);
  const currentDoc = JSON.parse(fs.readFileSync(path.resolve(root, DATA_FILE), 'utf8'));
  const { portToSlug } = buildSlugMap(currentDoc.crossings || []);
  const portMeta = new Map();
  for (const crossing of currentDoc.crossings || []) {
    const port = canonicalPortNumber(crossing.port_number);
    if (!portToSlug[port]) continue;
    portMeta.set(port, {
      slug: portToSlug[port],
      name: crossing.name,
      timezone: getPortTimezone(crossing),
    });
  }

  const ports = new Map();
  const seen = new Set();
  let snapshotCount = 0;
  let earliest = null;
  let latest = null;

  const consume = (raw) => {
    let doc;
    try { doc = JSON.parse(raw); } catch { return; }
    const fetchedAt = doc?.fetched_at;
    const stamp = fetchedAt ? new Date(fetchedAt) : null;
    if (!stamp || Number.isNaN(stamp.getTime()) || stamp < since || !Array.isArray(doc.crossings)) return;
    const key = stamp.toISOString();
    if (seen.has(key)) return;
    seen.add(key);
    snapshotCount += 1;
    if (!earliest || key < earliest) earliest = key;
    if (!latest || key > latest) latest = key;
    accumulateSnapshot(ports, doc.crossings, key, portMeta, (timezone, date) => nowInTz(timezone, date).hour);
  };

  for (const raw of readBlobs(shas)) consume(raw);
  if (includeCurrent) consume(JSON.stringify(currentDoc));

  const crossings = [...ports.values()]
    .filter(entry => entry.slug)
    .sort((a, b) => a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug));
  const artifact = {
    source: DATA_FILE,
    lookback_days: LOOKBACK_DAYS,
    generated_at: new Date().toISOString(),
    requested_window_start: since.toISOString(),
    window_start: earliest,
    normalization: 'legacy-normalized-no-raw-reconstruction',
    window_end: latest,
    snapshot_count: snapshotCount,
    crossings,
  };
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(artifact)}\n`);
  return crossings.length;
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  try {
    const count = writeLaneFlips({ includeCurrent: true });
    console.log(`[lane-flips] wrote ${count} crossings → ${OUTPUT_FILE}`);
  } catch (error) {
    console.error(`[lane-flips] ${error.message}`);
    process.exit(1);
  }
}
