Blocked on: `/guide/*` and `/predictions` are not implemented in the current checkout; `/alerts` still needs a mobile LCP pass if the 2.5s threshold is strict.

# BorderPulse QC Report

Date: 2026-05-27
Scope: current `/Users/sebastianbecerra/projects/code/borderpulse` checkout, focused only on the Codex sprint surfaces: guide pages, predictions, and enhanced alerts.

## Executive Findings

1. **Blocker: guide and prediction routes are absent.**
   - `src/App.jsx` has no `/guide/:port` route and no `/predictions` route.
   - Unknown routes hit `<Navigate to="/" replace>`, so `/guide/san-ysidro`, `/guide/otay-mesa`, `/guide/tecate`, and `/predictions` all land on `/`.
   - Browser proof on built preview (`http://127.0.0.1:4173`): each target route final URL was `/`, with no guide or prediction content.
   - Because the pages are absent, hreflang, canonical, Place/FAQ schema, Buttondown placements, Pacific timezone handling, stale-data fallback, prediction confidence bands, and US/MX holiday logic are not testable.

2. **Fixed: `/alerts` accessibility regressions.**
   - Before axe on `/alerts`: 5 issues: low contrast on alert CTA/newsletter disclosure and one landmark/region issue.
   - After fixes: axe reports 0 violations on built preview.
   - Files changed: `src/Layout.jsx`, `src/pages/Alerts.jsx`, `src/components/marketing/EmailCapture.jsx`, `src/App.jsx`.

3. **Still flagged: `/alerts` mobile LCP is above target on built preview.**
   - Mobile Lighthouse after fixes: LCP 2.88s, CLS 0, TBT 14ms, accessibility 0.95.
   - Desktop Lighthouse after fixes: LCP 0.64s, CLS 0, TBT 0ms, accessibility 1.00.
   - I kept the fix scoped: Alerts now loads with the app shell because it is small and launch-critical, but the SPA baseline still leaves mobile LCP above 2.5s.

## Verification Matrix

### Routing

| URL | Result |
| --- | --- |
| `/guide/san-ysidro` | Fails: client redirects to `/` |
| `/guide/otay-mesa` | Fails: client redirects to `/` |
| `/guide/tecate` | Fails: client redirects to `/` |
| `/predictions` | Fails: client redirects to `/` |
| `/alerts` | Passes: route renders, title updates to `Alerts | Border Pulse` |

### Core Web Vitals

Guide and predictions Lighthouse results are invalid for those pages because they measured the dashboard fallback:

| Requested URL | Final URL | Mobile LCP | Desktop LCP | CLS |
| --- | --- | ---: | ---: | ---: |
| `/guide/san-ysidro` | `/` | 31056ms | 6218ms | 0 / 0.001 |
| `/predictions` | `/` | 30958ms | 5541ms | 0 / 0.001 |

Valid `/alerts` built-preview results:

| Run | LCP | CLS | TBT | Accessibility |
| --- | ---: | ---: | ---: | ---: |
| Before, mobile dev | 27845ms | 0 | 54ms | 0.91 |
| After, mobile preview | 2884ms | 0 | 14ms | 0.95 |
| Before, desktop dev | 4889ms | 0 | 0ms | 0.95 |
| After, desktop preview | 637ms | 0 | 0ms | 1.00 |

## Checklist

- **Component reuse:** no duplicated guide/prediction components found because those surfaces are absent. Existing `AdsterraBanner.jsx`, `EmailCapture.jsx`, and `usePersistentLanguage` are present.
- **Bilingual integrity:** not testable for guide pages. No `/docs/spanish-review.md` exists in this checkout. The global language toggle still exists, but there is no guide route to preserve.
- **Accessibility:** `/alerts` fixed to 0 axe violations. Guide/prediction axe results are not valid because they hit dashboard fallback.
- **Schema markup:** not testable. No Place or FAQPage JSON-LD exists for guide pages in the current checkout.
- **Data integrity:** not testable for guide/prediction surfaces. No new timestamp, timezone, stale-data fallback, or prediction engine code exists in the current checkout.
- **Predictions page:** not testable. No prediction route or holiday calendar code exists in the current checkout.
- **Email capture:** guide-page placements are absent. Existing `EmailCapture` now has contrast-safe disclosure text. Existing Buttondown helper treats network failures as queued soft-success; duplicate handling was not live-tested to avoid submitting real list data.
- **Mobile:** `/alerts` forms and layout render at 375px; axe clean. Ads/newsletter do not block the alert CTA. Guide/prediction mobile checks are blocked by missing routes.
- **No scope creep:** I did not modify Dashboard, CrossingDetail, BestTime, Blog, BRRRR, Compound Growth, or unrelated tools.
- **Routing:** current route table conflicts with the sprint requirement by redirecting `/guide/*` and `/predictions` to `/`.

## Commands Run

- `npx vite build`
- `npx vite preview --host 127.0.0.1 --port 4173`
- `npx lighthouse http://127.0.0.1:4173/alerts ...`
- `npx @axe-core/cli http://127.0.0.1:4173/alerts ...`
- Browser route checks against `/guide/san-ysidro`, `/guide/otay-mesa`, `/guide/tecate`, `/predictions`, `/alerts`

