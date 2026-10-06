import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { publishGeneratedData } from './lib/generated-writer.mjs';

const git = (cwd, ...args) => execFileSync('git', args, {
  cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'fixture', GIT_AUTHOR_EMAIL: 'fixture@example.test',
    GIT_COMMITTER_NAME: 'fixture', GIT_COMMITTER_EMAIL: 'fixture@example.test' },
}).trim();
const put = (cwd, file, value) => {
  fs.mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
  fs.writeFileSync(path.join(cwd, file), value);
};
function fixture(t) {
  // Git resolves macOS temp-directory symlinks before includeIf matching.
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'writer-test-')));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const remote = path.join(directory, 'remote.git');
  const root = path.join(directory, 'root');
  const other = path.join(directory, 'other');
  git(directory, 'init', '--bare', '--initial-branch=main', remote);
  // Keep hook-rejection coverage independent of the developer's hooksPath.
  git(remote, 'config', 'core.hooksPath', path.join(remote, 'hooks'));
  git(directory, 'clone', remote, root);
  put(root, 'input.json', JSON.stringify({ version: 1, history: [1] }));
  put(root, 'snapshot.json', '{}');
  put(root, 'derived.json', '{}');
  put(root, 'package-lock.json', '{"version":1}');
  put(root, '.gitignore', 'dist/\nqueue.json\n');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'initial');
  git(root, 'push', 'origin', 'main');
  git(directory, 'clone', remote, other);
  const advance = (version, snapshot = null) => {
    git(other, 'pull', '--ff-only');
    put(other, 'input.json', JSON.stringify({ version, history: Array.from({ length: version }, (_, i) => i + 1) }));
    put(other, 'package-lock.json', JSON.stringify({ version }));
    if (snapshot !== null) put(other, 'snapshot.json', snapshot);
    git(other, 'add', '.');
    git(other, 'commit', '-m', `advance ${version}`);
    git(other, 'push', 'origin', 'main');
    return git(other, 'rev-parse', 'HEAD');
  };
  const options = { root, paths: ['snapshot.json'], message: 'generated data' };
  const show = file => git(remote, 'show', `main:${file}`);
  const worktrees = () => git(root, 'worktree', 'list', '--porcelain').split('\n').filter(line => line.startsWith('worktree '));
  return { root, remote, other, advance, options, show, worktrees };
}

function generate(worktree) {
  const input = JSON.parse(fs.readFileSync(path.join(worktree, 'input.json')));
  const lock = JSON.parse(fs.readFileSync(path.join(worktree, 'package-lock.json')));
  assert.equal(input.version, lock.version, 'generation sees the matching current lockfile');
  put(worktree, 'snapshot.json', JSON.stringify({ ...input, validated: true }));
  put(worktree, 'derived.json', 'unstaged build output');
  put(worktree, 'dist/index.html', '<html>ignored build output</html>');
  put(worktree, 'new-derived.json', 'untracked build output');
}

test('resolves current main after queueing and preserves the caller checkout', async t => {
  const f = fixture(t);
  const oldHead = git(f.root, 'rev-parse', 'HEAD');
  put(f.root, 'derived.json', 'unrelated caller edit');
  put(f.root, 'personal.txt', 'untracked caller file');
  const latest = f.advance(2);
  const result = await publishGeneratedData({ ...f.options, generate });
  assert.equal(result.changed, true);
  assert.equal(git(f.remote, 'rev-parse', 'main^'), latest);
  assert.deepEqual(JSON.parse(f.show('snapshot.json')), { version: 2, history: [1, 2], validated: true });
  assert.equal(f.show('derived.json'), '{}');
  assert.equal(git(f.root, 'rev-parse', 'HEAD'), oldHead);
  assert.equal(fs.readFileSync(path.join(f.root, 'derived.json'), 'utf8'), 'unrelated caller edit');
  assert.equal(fs.readFileSync(path.join(f.root, 'personal.txt'), 'utf8'), 'untracked caller file');
  assert.equal(result.worktree, null);
  assert.equal(f.worktrees().length, 1);
});

test('a racing update discards generated JSON and rebuilds/validates on new code and history', async t => {
  const f = fixture(t);
  const versions = [];
  const result = await publishGeneratedData({ ...f.options, generate(worktree, { attempt }) {
    generate(worktree);
    versions.push(JSON.parse(fs.readFileSync(path.join(worktree, 'input.json'))).version);
    if (attempt === 1) f.advance(2, '{"newerCommittedSnapshot":true}');
  } });
  assert.deepEqual(versions, [1, 2]);
  assert.deepEqual(JSON.parse(f.show('snapshot.json')), { version: 2, history: [1, 2], validated: true });
  assert.equal(git(f.remote, 'rev-parse', 'main'), result.commitSha);
  assert.equal(git(f.remote, 'log', '--format=%s', '-2'), 'generated data\nadvance 2');
  assert.equal(f.worktrees().length, 1);
});

test('failed validation never commits or pushes and cleans its worktree', async t => {
  const f = fixture(t);
  const head = git(f.remote, 'rev-parse', 'main');
  await assert.rejects(publishGeneratedData({ ...f.options, generate(worktree) {
    generate(worktree);
    throw new Error('freshness/build check failed');
  } }), /freshness\/build check failed/);
  assert.equal(git(f.remote, 'rev-parse', 'main'), head);
  assert.equal(f.worktrees().length, 1);
});

test('failed validation after a rejected push cannot publish the old candidate', async t => {
  const f = fixture(t);
  let advanced;
  await assert.rejects(publishGeneratedData({ ...f.options, generate(worktree, { attempt }) {
    generate(worktree);
    if (attempt === 1) advanced = f.advance(2);
    else throw new Error('new source fails validation');
  } }), /new source fails validation/);
  assert.equal(git(f.remote, 'rev-parse', 'main'), advanced);
  assert.equal(f.show('snapshot.json'), '{}');
  assert.equal(f.worktrees().length, 1);
});

test('a stable no-op reports unchanged without creating a commit', async t => {
  const f = fixture(t);
  const head = git(f.remote, 'rev-parse', 'main');
  const result = await publishGeneratedData({ ...f.options, generate() {} });
  assert.deepEqual(result, { changed: false, commitSha: head, worktree: null });
  assert.equal(git(f.remote, 'rev-parse', 'main'), head);
  assert.equal(f.worktrees().length, 1);
});

test('a no-op on an outdated base retries against current main', async t => {
  const f = fixture(t);
  let calls = 0;
  const result = await publishGeneratedData({ ...f.options, generate(worktree, { attempt }) {
    calls++;
    if (attempt === 1) f.advance(2);
    else generate(worktree);
  } });
  assert.equal(calls, 2);
  assert.equal(result.changed, true);
  assert.equal(JSON.parse(f.show('snapshot.json')).version, 2);
});

test('a policy rejection with no main advance fails instead of retrying blind', async t => {
  const f = fixture(t);
  put(f.remote, 'hooks/pre-receive', '#!/bin/sh\nexit 1\n');
  fs.chmodSync(path.join(f.remote, 'hooks/pre-receive'), 0o755);
  let calls = 0;
  await assert.rejects(publishGeneratedData({ ...f.options, generate(worktree) {
    calls++;
    generate(worktree);
  } }), /push/);
  assert.equal(calls, 1);
  assert.equal(f.show('snapshot.json'), '{}');
  assert.equal(f.worktrees().length, 1);
});

test('repeated races stop safely at the bounded attempt limit', async t => {
  const f = fixture(t);
  let calls = 0;
  await assert.rejects(publishGeneratedData({ ...f.options, maxAttempts: 3, generate(worktree, { attempt }) {
    calls++;
    generate(worktree);
    f.advance(attempt + 1);
  } }), /Main advanced during all 3 attempts/);
  assert.equal(calls, 3);
  assert.equal(f.show('snapshot.json'), '{}');
  assert.equal(f.worktrees().length, 1);
});

test('manual anomaly work keeps only the final successful candidate and queue', async t => {
  const f = fixture(t);
  const result = await publishGeneratedData({ ...f.options, preserveWorktree: true, generate(worktree, { attempt }) {
    generate(worktree);
    put(worktree, 'queue.json', JSON.stringify({ attempt }));
    if (attempt === 1) f.advance(2);
  } });
  assert.equal(f.worktrees().length, 2);
  assert.equal(git(result.worktree, 'rev-parse', 'HEAD'), result.commitSha);
  assert.equal(JSON.parse(fs.readFileSync(path.join(result.worktree, 'queue.json'))).attempt, 2);
  const retainedDirectory = path.dirname(result.worktree);
  t.after(() => fs.rmSync(retainedDirectory, { recursive: true, force: true }));
  git(f.root, 'worktree', 'remove', '--force', result.worktree);
});

test('unexpected staged files fail closed before push', async t => {
  const f = fixture(t);
  await assert.rejects(publishGeneratedData({ ...f.options, generate(worktree) {
    generate(worktree);
    git(worktree, 'add', 'derived.json');
  } }), /Unexpected staged files: derived.json/);
  assert.equal(f.show('snapshot.json'), '{}');
});

test('writer workflows resolve main and share one queue; manual drafts use final worktree', () => {
  for (const workflow of ['fetch-cbp', 'anomaly-scan', 'fetch-news']) {
    const text = fs.readFileSync(new URL(`../.github/workflows/${workflow}.yml`, import.meta.url), 'utf8');
    assert.match(text, /group: repository-writer\n  cancel-in-progress: false/);
    assert.match(text, /uses: actions\/checkout@v7\n        with:\n          ref: main\n          fetch-depth: 0/);
    assert.doesNotMatch(text, /git rebase|git push[^\n]*--force|git stash/);
    if (workflow !== 'fetch-news') assert.match(text, /node scripts\/write-data-snapshot\.mjs /);
    if (workflow === 'anomaly-scan') {
      assert.equal((text.match(/working-directory: \$\{\{ steps.snapshot.outputs.worktree \}\}/g) || []).length, 3);
      assert.match(text, /git -c user.name="borderpulse-bot" -c user.email="207095575\+sbc1-code@users.noreply.github.com" commit -m "Mode A:/);
    }
  }
});

test('checkout v7 worktree-scoped config is inherited without copying credentials', async t => {
  const f = fixture(t);
  const config = path.join(path.dirname(f.root), 'test-checkout.config');
  fs.writeFileSync(config, '[writerfixture]\n  included = yes\n');
  git(f.root, 'config', `includeIf.gitdir:${f.root}/.git/worktrees/*.path`, config);
  const originalConfig = fs.readFileSync(path.join(f.root, '.git/config'), 'utf8');
  await publishGeneratedData({ ...f.options, generate(worktree) {
    assert.equal(git(worktree, 'config', 'writerfixture.included'), 'yes');
    generate(worktree);
  } });
  assert.equal(fs.readFileSync(path.join(f.root, '.git/config'), 'utf8'), originalConfig);
});

test('an accepted push with a lost response is verified without duplicating the commit', async t => {
  const f = fixture(t);
  const executable = execFileSync('which', ['git'], { encoding: 'utf8' }).trim();
  const shims = path.join(path.dirname(f.root), 'shims');
  const wrapper = path.join(shims, 'git');
  put(shims, 'git', `#!/bin/sh\n"${executable}" "$@"\nstatus=$?\nif [ "$1" = push ] && [ "$status" = 0 ]; then exit 1; fi\nexit "$status"\n`);
  fs.chmodSync(wrapper, 0o755);
  const originalPath = process.env.PATH;
  let calls = 0;
  try {
    process.env.PATH = `${shims}:${originalPath}`;
    const result = await publishGeneratedData({ ...f.options, generate(worktree) {
      calls++;
      generate(worktree);
    } });
    assert.equal(result.changed, true);
    assert.equal(git(f.remote, 'rev-parse', 'main'), result.commitSha);
  } finally { process.env.PATH = originalPath; }
  assert.equal(calls, 1);
  assert.equal(git(f.remote, 'rev-list', '--count', 'main'), '2');
});

test('the executable refuses local use before fetching or pushing', () => {
  assert.throws(() => execFileSync(process.execPath, [new URL('./write-data-snapshot.mjs', import.meta.url).pathname, 'cbp'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GITHUB_ACTIONS: 'false' },
  }), error => error.status === 1 && /disposable GitHub Actions runners only/.test(error.stderr));
});
