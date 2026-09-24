# BorderPulse tasks

This folder is the handoff layer between Sebastian and coding agents.

## Task states

- `[ ]` not started
- `[~]` in progress
- `[x]` complete with evidence
- `[!]` blocked by a real external dependency or approval

Agents should take the first `[ ]` item in `ACTIVE.md`, keep the scope narrow,
and update the evidence before moving on. If a task needs a consequential
approval, stop at that approval rather than silently taking the action.
