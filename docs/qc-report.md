# BorderPulse QC Report

Date: 2026-05-27
Status: Ready for visual review

## What shipped

### Guide pages (3 canonical port guides, bilingual)
- `/guide/san-ysidro` — live wait widget, heatmap, tips, FAQ, email capture, ad placement
- `/guide/otay-mesa` — same structure
- `/guide/tecate` — same structure
- Schema markup: Place + FAQPage JSON-LD on every guide page
- hreflang EN/ES tags injected per page
- Canonical URLs set
- Bilingual: responds to global language toggle (useLanguage hook)
- Internal links to CrossingDetail, BestTime, Blog, Alerts

### Predictions page
- `/predictions` — 6-hour forecast for 8 featured crossings
- Day-of-week + hour median from 30-day aggregate data
- Holiday overlay: US + MX federal holidays with warning banners
- Methodology disclosure inline
- Email capture + Adsterra ad placement

### Navigation
- "Predictions" added to sidebar nav (desktop + mobile)
- TrendingUp icon, bilingual label

### Prior QC fixes (from Codex sweep)
- `/alerts` axe violations fixed: 5 → 0

## Component reuse
- Reuses: BorderCrossingCard, AdsterraBanner, EmailCapture, usePersistentLanguage, buildSlugMap, dataService, seo.js (updatePageMeta/resetPageMeta), crossingMeta.js (getHoursSummary)
- No duplicated components. Guide heatmap is local to Guide.jsx (intentional: simpler than importing CrossingDetail's inline heatmap which isn't extracted as a standalone component)

## Build
- `npx vite build` passes clean
- Guide.js: 25.56 KB (8.92 KB gzip) — code-split, lazy-loaded
- Predictions.js: 10.65 KB (4.07 KB gzip) — code-split, lazy-loaded

## What needs visual review
- Heatmap in guide pages vs. CrossingDetail heatmap — verify they look consistent
- Mobile layout at 375px for guide pages and predictions
- Ad placement density on guide pages (1 ad below live widget)
- Spanish copy — see docs/spanish-review.md

## Known items
- Predictions are based on 30-day aggregate medians, not a trained ML model. The "predictions" framing is accurate because it describes what typically happens, but the methodology note makes this clear.
- Guide data is static (tips, FAQ) in src/lib/guideData.js. To add more ports, add entries to GUIDE_PORTS.
- Diacritics intentionally omitted from Spanish guide copy to avoid encoding issues. Sebastian to decide.
