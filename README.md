# Border Pulse

Real-time US-Mexico border wait times. Static site on GitHub Pages at [borderpulse.com](https://borderpulse.com).

## Stack
- Vite + React 18 + Tailwind + shadcn/ui
- Data: U.S. Customs and Border Protection official feed (`bwt.cbp.gov/api/waittimes`)
- Exchange rate: `exchangerate.host` / `open.er-api.com`
- Hosting: GitHub Pages (static), no backend
- Monetization: Adsterra Native Banner (to be wired)

## Data pipeline
`scripts/fetch-cbp.mjs` runs every 15 min via GitHub Actions. It hits the CBP JSON endpoint, filters `border === "Mexican Border"`, normalizes the shape, and commits `public/data/crossings.json`. Same cadence for `public/data/exchange-rate.json`.

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
```

## Deploy
Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and publishes to GitHub Pages. Custom domain `borderpulse.com` via `public/CNAME` + IONOS DNS (A records to GitHub Pages IPs).
