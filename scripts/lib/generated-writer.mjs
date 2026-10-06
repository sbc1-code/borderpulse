import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const git = (cwd, args) => execFileSync('git', args, {
  cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
}).trim();

/**
 * Generate on current main in an isolated worktree. Never rebase generated
 * JSON: after a rejected push, throw the candidate away and rebuild against
 * the new main (including its code, lockfile and committed data/history).
 * The invoking checkout and unrelated work are never reset or cleaned.
 */
export async function publishGeneratedData({
  root, paths, message, generate, maxAttempts = 3, preserveWorktree = false,
  author = { name: 'borderpulse-bot', email: 'borderpulse-bot@users.noreply.github.com' },
}) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) throw new Error('Invalid attempt limit');
  if (!paths?.length) throw new Error('No generated paths supplied');
  const refreshMain = () => {
    // An explicit refspec avoids checkout's stale event SHA in origin/main.
    git(root, ['fetch', 'origin', '+refs/heads/main:refs/remotes/origin/main']);
    return git(root, ['rev-parse', 'refs/remotes/origin/main']);
  };
  let base = refreshMain();
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'borderpulse-writer-'));
    const worktree = path.join(directory, 'repo');
    let keep = false;
    let added = false;
    try {
      git(root, ['worktree', 'add', '--detach', worktree, base]);
      added = true;
      console.log(`[writer] attempt ${attempt}/${maxAttempts} from ${base}`);
      await generate(worktree, { attempt, base });
      git(worktree, ['add', '--', ...paths]);
      const staged = git(worktree, ['diff', '--cached', '--name-only', '-z']).split('\0').filter(Boolean);
      if (staged.some(file => !paths.includes(file))) {
        throw new Error(`Unexpected staged files: ${staged.filter(file => !paths.includes(file)).join(', ')}`);
      }
      let commitSha = base;
      if (staged.length) {
        git(worktree, ['-c', `user.name=${author.name}`, '-c', `user.email=${author.email}`, 'commit', '-m', message]);
        commitSha = git(worktree, ['rev-parse', 'HEAD']);
        try {
          git(worktree, ['push', 'origin', 'HEAD:refs/heads/main']);
        } catch (error) {
          const latest = refreshMain();
          // A push can reach the server even if its response is lost. Treat
          // confirmed remote acceptance as success, without duplicating it.
          let accepted = false;
          try {
            git(root, ['merge-base', '--is-ancestor', commitSha, latest]);
            accepted = true;
          } catch { /* The remote does not contain this candidate. */ }
          if (!accepted) {
            if (latest === base) throw error; // Authentication/policy/network, not a race.
            if (attempt === maxAttempts) {
              throw new Error(`Main advanced during all ${maxAttempts} attempts; no snapshot published`, { cause: error });
            }
            console.log(`[writer] main advanced to ${latest}; regenerating instead of rebasing`);
            base = latest;
            continue;
          }
        }
      } else {
        // A no-op is only current if main did not change while it was built.
        const latest = refreshMain();
        if (latest !== base) {
          if (attempt === maxAttempts) throw new Error('Main kept advancing while validating an unchanged snapshot');
          base = latest;
          continue;
        }
      }
      keep = preserveWorktree;
      return { changed: staged.length > 0, commitSha, worktree: keep ? worktree : null };
    } finally {
      if (!keep) {
        // Remove only the temporary worktree we created, including generated
        // build outputs. No blanket reset/clean of the caller's checkout.
        try {
          if (added) git(root, ['worktree', 'remove', '--force', worktree]);
          fs.rmSync(directory, { recursive: true, force: true });
        } catch (error) {
          // Cleanup must not hide a successful push and prevent its exact-SHA
          // Pages dispatch. The disposable runner removes remaining files.
          console.warn(`[writer] temporary worktree cleanup failed: ${error.message}`);
        }
      }
    }
  }
}
