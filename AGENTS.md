# BorderPulse agent instructions

This repository is managed by Sebastian with Codex and Claude Code. Read
`BORDERPULSE_OPERATOR.md` and `tasks/ACTIVE.md` before meaningful work, then
read `CHANGELOG.md`, `ROADMAP.md`, and `DECISIONS.md` for project history.

## How to operate

- Continue the first unchecked task in `tasks/ACTIVE.md` unless Sebastian gives
  a different priority.
- Work from a branch or worktree. Keep one clear change per task.
- Prefer existing dependencies and services. Ask before adding a new package,
  third-party service, auth system, database, or analytics integration.
- Never claim a feature is live, paid, deployed, or verified without checking
  the relevant runtime, CI, billing, or user-facing evidence.
- Do not deploy production, enable live Stripe charges, send customer email,
  or delete data without Sebastian's explicit approval.
- At the end of a meaningful task, update the task state and project docs,
  run the relevant verification, and report what is proven and what remains.

## Useful commands

```bash
npm run operator:status   # plain-English current state; read-only
npm run operator:verify   # release checks; may take several minutes
```

The operator guide is the human-facing contract. Keep it short, current, and
safe for an agent to execute.
