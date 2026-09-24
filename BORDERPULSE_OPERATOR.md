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
  It must report source freshness honestly before traffic or revenue is
  interpreted.
- No paid wedge has been selected. Generic wait-time widgets, public CBP data,
  and basic consumer alerts are already well served. The first commercial
  hypothesis is one manually fulfilled, corridor-specific business workflow
  only after five qualified conversations identify the same downstream job and
  one buyer makes a written paid commitment.
- A consumer product based on saved crossings and email alerts remains a
  separate, preserved technical option. It cannot resume merely because the
  code exists: it needs the stricter consumer demand gate in `docs/PMF-TEST.md`
  and a revised product contract for the job actually chosen.
- Vercel is the next deployment and compute candidate because the repository
  already has a protected preview and official-data function. Keep the static
  Pages fallback until an authorized preview readback supports a domain
  decision. Do not add Firebase, SMS, or paid southbound maps.
- The repository contains test-only Supabase migrations, Vercel API handlers,
  and a protected server-side alert evaluator. Treat them as preserved
  implementation work, not proof that accounts, billing, email, or paid access
  exist. Supabase, Stripe, and transactional email are justified only if a
  proven paid workflow requires them.
- Production deployment and live billing are separate approvals. A green local
  test is not proof of either one.
- `docs/VALIDATION-OPERATIONS.md` is the weekly evidence, discovery, and
  cost record. `docs/LAUNCH-GATES.md` applies only after that evidence selects
  a real offer. Keep all provider, legal, support, marketing, and
  authenticated-QA gates open even when code verification is green.
- `docs/OWNER-APPROVAL.md` is the plain-language reactivation gate. Use it
  only after product evidence warrants test-provider setup; it does not
  authorize production, live charges, or marketing.

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
