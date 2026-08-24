# Border Pulse

Real-time US-Mexico border wait times. Static site on GitHub Pages at [borderpulse.com](https://borderpulse.com).

## Stack
- Vite + React 18 + Tailwind + shadcn/ui
- Data: U.S. Customs and Border Protection official feed (`bwt.cbp.gov/api/bwtpublicmod`)
- Exchange rate: `exchangerate.host` / `open.er-api.com`
- Hosting: GitHub Pages (static), no backend
- Monetization: Adsterra Native Banner (live on `borderpulse.com`)

## Data pipeline
`scripts/fetch-cbp.mjs` runs on a scheduled GitHub Action. It hits the CBP JSON endpoint, accepts either English or Spanish localized border/status values, normalizes the shape, and commits `public/data/crossings.json`. Same cadence for `public/data/exchange-rate.json`.

Paid southbound Google Maps estimates are paused and are not part of the production workflow. The retained `scripts/fetch-sb.mjs` utility is historical/manual only; production serves the official northbound CBP feed.

The client (`src/components/utils/dataService.js`) reads those static JSON files. No API, no auth, no rate limits.

## Local dev
```bash
npm install
npm run dev
```

Refresh data locally:
```bash
npm run fetch:cbp
npm run fetch:fx
# Historical paid southbound utility; guarded and not used in production:
# ALLOW_PAID_SOUTHBOUND_FETCH=yes npm run fetch:sb
```

## Deploy
Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and publishes to GitHub Pages. Custom domain `borderpulse.com` via `public/CNAME` + IONOS DNS (A records to GitHub Pages IPs).
