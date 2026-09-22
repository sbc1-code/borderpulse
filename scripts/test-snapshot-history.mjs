import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('snapshot history is an explicit build input', () => {
  const artifact = JSON.parse(fs.readFileSync('public/data/snapshot-history.json', 'utf8'));
  assert.equal(artifact.source, 'public/data/crossings.json');
  assert.equal(artifact.lookback_days, 30);
  assert.ok(Array.isArray(artifact.snapshots));
  assert.ok(artifact.snapshots.length > 0);

  for (const snapshot of artifact.snapshots) {
    assert.ok(!Number.isNaN(new Date(snapshot.fetched_at).getTime()));
    assert.ok(Array.isArray(snapshot.crossings));
    assert.ok(snapshot.crossings.every((crossing) => 'port_number' in crossing));
  }
});

test('aggregate builds do not read Git history', () => {
  const source = fs.readFileSync('scripts/build-aggregates.mjs', 'utf8');
  assert.doesNotMatch(source, /git\s+(log|show)/);
  assert.match(source, /snapshot-history\.json/);
});
