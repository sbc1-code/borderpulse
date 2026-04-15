# Border Pulse

Real-time US-Mexico border wait times. Static site on GitHub Pages at [borderpulse.com](https://borderpulse.com).

## Stack
- Vite + React 18 + Tailwind + shadcn/ui
- Data: U.S. Customs and Border Protection official feed (`bwt.cbp.gov/api/bwtpublicmod`)
- Exchange rate: `exchangerate.host` / `open.er-api.com`
- Hosting: GitHub Pages (static), no backend
- Monetization: Adsterra Native Banner (live on `borderpulse.com`)

## Data pipeline
`scripts/fetch-cbp.mjs` runs every 15 min via GitHub Actions. It hits the CBP JSON endpoint, filters `border === "Mexican Border"`, normalizes the shape, and commits `public/data/crossings.json`. Same cadence for `public/data/exchange-rate.json`.

`scripts/fetch-sb.mjs` runs on the same cadence and writes `public/data/crossings-sb.json`. It uses `GOOGLE_MAPS_API_KEY` to estimate southbound (US -> MX) delay at major passenger crossings from Google Maps Distance Matrix traffic snapshots. These values are estimates, not an official government feed.

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
npm run fetch:sb
```

## Deploy
Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and publishes to GitHub Pages. Custom domain `borderpulse.com` via `public/CNAME` + IONOS DNS (A records to GitHub Pages IPs).
