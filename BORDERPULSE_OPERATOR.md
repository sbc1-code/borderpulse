# BorderPulse operator guide

This is the control panel for running BorderPulse with an AI coding agent.
Sebastian makes the business and launch decisions. Codex or Claude Code does
the investigation, implementation, testing, and evidence gathering.

## The two commands to remember

```bash
npm run operator:status
npm run operator:verify
```

`operator:status` is a quick, read-only answer to “where are we?”
`operator:verify` builds a fresh artifact and runs the release checks. It is the
answer to “is this safe to hand off for review?” Neither command deploys or
charges anyone.

## How to ask an agent

Use plain requests such as:

- “Run the BorderPulse status check and tell me the next safe task.”
- “Continue the active BorderPulse task. Make the smallest complete change,
  run the relevant checks, and show me evidence.”
- “Prepare the paid beta, but stop before live Stripe, production deployment,
  or customer email and list the decisions I must approve.”
- “Audit whether BorderPulse is actually live and accepting paid users. Check
  the site, deployment, Stripe entitlements, and the active task file.”

The agent should explain results in business language first. Technical details
belong underneath as evidence.

## Current operating rules

- Free BorderPulse remains the public northbound border-intelligence product.
- The proposed paid wedge is saved crossings plus email alerts and alert
  delivery history. It is not live until the product, data, privacy, billing,
  and QA gates pass.
- The planned v1 stack is Vercel, Supabase, Stripe, one transactional email
  provider, and the existing data pipeline. Do not add Firebase, SMS, or paid
  southbound maps unless the product decision changes.
- The repository now contains a test-only Supabase migration, Vercel API
  foundation, and a protected server-side alert evaluator. Treat them as
  implementation work, not proof that accounts, billing, email, or paid access
  exist.
- Production deployment and live billing are separate approvals. A green local
  test is not proof of either one.
- `docs/LAUNCH-GATES.md` is the current cross-functional checklist. Keep its
  unchecked provider, legal, support, marketing, and authenticated-QA gates
  open even when the code verifier is green.
- `docs/OWNER-APPROVAL.md` is the plain-language decision sheet. Use it when
  the owner wants to unlock test-provider setup without authorizing production,
  live charges, or marketing.

## What “done” means

A task is done only when the agent can point to:

1. the changed file or external system,
2. a passing check or direct runtime readback,
3. the user-facing or operational result,
4. the next task or an explicit approval gate.

“The code is written” is not the same as “the feature is live.”

## Where the state lives

- `tasks/ACTIVE.md`: current execution queue and gates
- `CHANGELOG.md`: shipped repository work
- `ROADMAP.md`: product backlog
- `DECISIONS.md`: durable reasons and boundaries
- `CLAUDE.md`: repository-specific engineering constraints

Do not put credentials, Stripe secrets, private account details, or customer
data in these files.
