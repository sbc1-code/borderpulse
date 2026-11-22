# Map selection and lane-summary QC correction

Base: `4c906a6cc70926811147744be55e509eaeb45b3f`, current main with the released border-wide map and newer feed snapshots. This patch changes no geographic catalog, data feed, dependency, workflow or access setting. The unrelated resize patch remains excluded. Final exact-head checks and release receipts are recorded in the correction PR.

## Confirmed problems and behavior

Selecting a lower map-list result focused the report's Back control with scroll prevention. The document could leave that control above the desktop viewport; on a phone, the report pane retained an old scroll position and the native sticky header clipped the control. Local production-mode reproduction measured desktop Back top at about -29 px and phone top at about 49 px, with neither control hit-testable. The patch resets the report pane and reveals the focused control with the existing 86 px header clearance, immediately in both motion preferences. It retains the original document/pane position and restores it with keyboard focus after Escape, the Back button or browser Back. Camera motion is unchanged.

The List sidebar, commuter summary and border chart read Standard summary fields even when another lane was selected. The patch passes the normalized selected lane through all three. Reporting totals, mean, median, shortest/longest and delay status use the existing reported-lane availability rule: real zero counts, missing/pending/closed lanes do not count, and a port closure overrides retained numbers. Official port openness remains a separate labeled metric. Existing direction-only consumers keep their old contract.

List continues to show labeled **latest reports** when leaving recorded replay. The current summary follows its lane; historical baselines remain explicitly Standard-only. Standard ghosts are not displayed behind SENTRI, Ready or pedestrian ticks. A fresh saved API fallback cannot claim current summary conditions. The affected sidebar widget uses the existing React Suspense pattern so these corrections retain the unchanged initial-bundle gate; its loading and asset-failure states leave crossing cards usable, and reload recovers a failed asset.

## Actual before/after captures

[Desktop focus before](map-qc-review/before-focus-1440.png) · [after](map-qc-review/after-focus-1440.png) · [Phone focus before](map-qc-review/before-focus-390.png) · [after](map-qc-review/after-focus-390.png)

[Desktop Texas SENTRI summary before](map-qc-review/before-summary-TX-1440.png) · [after](map-qc-review/after-summary-1440.png) · [Phone before](map-qc-review/before-summary-TX-390.png) · [after](map-qc-review/after-summary-390.png) · [Capture receipt](map-qc-review/capture-receipt.json)

These are local production-mode captures of the actual dated repository snapshot retrieved November 1 at 23:37:51.353 UTC, with no fixture waits or frozen clock. That snapshot's selected SENTRI reports are 8/26 with a rounded 5-minute mean; the old sidebar incorrectly displayed the Standard 20/26 and 58-minute mean. Those values are capture evidence, not implementation constants. New tests use deliberately different four-port observations.

## Regression and security review

Focused browser checks run EN/ES, desktop/phone and normal/reduced motion. They inspect actual client geometry, clipping and painted hit targets, not only document.activeElement. They verify lower-result selection plus Escape/button/browser-Back focus and exact document/pane position restoration. Summary cases check all four lanes, count/mean/median/tier, real tick paint, missing/zero/closed overrides, Standard-only ghosts, replay-to-latest List and API fallback neutrality. A model case checks the optional lane helper while preserving existing direction-only behavior. Existing full map, route, freshness, sharing, camera and editorial checks remain required.

Manual scoped source/security review covers controlled focus/scroll restoration, nullable finite lane values, closed-port overrides, React-rendered labels and source confidence. No new executable URL, HTML injection, tracking, location collection, external request, credential or access change is introduced. No new exploitable issue identified in this scope. The installed Codex Security preflight resource remains unavailable, so no automated security scan is claimed; the existing audit and release gates still apply.

The independent Mac screenshots/report supplied the findings. This worker reproduced and inspected its own local captures; it does not claim to have materialized those Library files or completed a public browser recheck. Hosted browser access remains blocked in this executor; the coordinating Mac owner will independently recheck the released correction.
