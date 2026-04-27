# Working notes for AI agents on this repo

This file is auto-loaded by Claude Code when a session starts in this
directory. If you're a different AI (Codex, ChatGPT in browser, etc.)
that *isn't* auto-loading this — read it manually first.

## Catch-up ritual (start of every session)

Before doing anything else, read these three files:

1. **CHANGELOG.md** — what shipped, by date. Tells you the latest state.
2. **ROADMAP.md** — what's next, what's deferred, what's already live.
3. **DECISIONS.md** — *why* things are the way they are. Don't unwind a
   decision listed there without flagging it.

If the user just says **"what's new"** or **"catch me up"** or
**"what's next"** — the answer comes from those three files plus
`git log --oneline -10`. Don't ask the user to re-explain.

## End-of-session ritual

- Commit and push everything that matters. If it's not on `origin/main`,
  it didn't happen — the next session won't see it.
- Append today's shipped work to **CHANGELOG.md** under a date heading
  (Added / Fixed / Performance / etc.).
- If a non-obvious decision was made, append a one-liner to
  **DECISIONS.md**.
- Move shipped backlog items in **ROADMAP.md** from "Next up" to
  "Shipped" (or strike-through). Add new follow-up items if any
  surfaced.
- Leave the working tree clean (`git status` shows nothing modified
  except intentional artifacts).

## Quick repo facts

- **Hosted on GitHub Pages** at borderpulse.com.
  Deploys via `.github/workflows/deploy.yml` on push to `main`.
- **Scheduled CBP refresh** runs `.github/workflows/fetch-cbp.yml`
  every 90 min — those commits use `chore(data): refresh ...` and are
  intentionally skipped by `deploy.yml` to avoid double-runs.
- **Vite + React + Tailwind + shadcn/ui.** Code-split leaf routes
  via `React.lazy`; main bundle ~161 KB.
- **Public JSON feeds** at `/data/crossings.json`, `/data/aggregates/{slug}.json`,
  `/data/timelines/...`, `/data/blog/...`, `/data/stats.json`.
- **No backend.** No auth, no database, no SMS, no email. Anything that
  needs persistence lives in browser localStorage. Anything that needs
  cron lives in GitHub Actions.

## Constraints to respect

These are listed in DECISIONS.md but worth surfacing here too:

- **No personal-brand framing.** The site reads as a project, not a person.
- **No forward-looking privacy promises** ("we don't / never / ever").
  Describe what's running today, not what we commit to do/not-do tomorrow.
- **No fake contact paths.** No `hello@borderpulse.com` until that
  inbox actually exists. Same for any other CTA pointing at infra
  that doesn't exist yet.
- **Embed pages are `noindex`** — they're for iframe use, not search
  competition with the canonical `/crossing/:slug` pages.
- **Branches and worktrees:** when running multiple agents in parallel,
  each gets its own worktree under `.claude/worktrees/`. Coordinate file
  ownership in the brief or you'll hit merge conflicts.

## When in doubt

Ask the user before:
- Pushing destructive git commands (`reset --hard`, `push --force`,
  `branch -D`).
- Adding new npm dependencies or third-party services (analytics,
  email, anything that loads remote scripts).
- Making promises in user-facing copy. Default to descriptive language.
- Wiring up auth, accounts, or anything that holds user data
  server-side.
