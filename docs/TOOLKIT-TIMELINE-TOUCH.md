# Toolkit application: historical replay touch target

Q applied Scout/Grokbot catalog resource **DT-004**, Jakub Krehel's
[Make Interfaces Feel Better](https://github.com/jakubkrehel/make-interfaces-feel-better),
on November 17, 2026 (Pacific).

## Selection and source check

The official repository's SKILL.md describes mobile controls with a 44px touch
area and warns against overlapping adjacent targets. Its LICENSE is MIT,
copyright 2026 Jakub Krehel, checked at the official repository on this date.
This change applies that general design principle in BorderPulse's existing CSS;
it does not vendor code, install the skill, run third-party commands, add a
package, upload project data or connect an external service. No dependency or
credential surface is added. The full third-party project has not been security
audited or approved for installation.

## Actual improvement

The historical replay range input had a 24px-high box, unlike adjacent 44px
controls. It now reserves 44px in normal document flow, leaving the chart and
labels separate. Native range behavior, keyboard access, values, labels, dark
mode colors and reduced-motion behavior are unchanged.

The Node regression fails before the CSS fix and passes after it. The existing
browser console check now checks the slider's rendered height and verifies its
box does not overlap the chart or labels, before exercising End/ArrowLeft.

## Verification boundary

Local production build and prerender passed. The focused console suite passed
11 tests. Local Chromium could not start because this executor denies its local
socket operation, so full browser interaction/layout verification is still
required in a working browser runner. Do not represent this as visually approved
or deployed. Preserve all release/security gates, including the existing
picomatch audit hold. No merge or production deployment is included.
