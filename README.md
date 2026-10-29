# Border Pulse

Reported northbound US-Mexico border waits and historical planning views at [borderpulse.com](https://borderpulse.com). Check each lane’s report clock and the snapshot retrieval date.

## Stack
- Vite + React 18 + Tailwind + shadcn/ui
- Data: U.S. Customs and Border Protection official feed (`bwt.cbp.gov/api/bwtpublicmod`)
- Exchange rate: `exchangerate.host` / `open.er-api.com`
- Serving: static Vite frontend, with a configured Vercel current-data endpoint and a dated bundled-data fallback; see [refresh operations](docs/REFRESH-OPERATIONS.md) for deployment evidence.
- Advertising: Adsterra banner integration; Google Ads is separately gated. Integration code does not establish ad fill, approval or revenue.

## Data pipeline
`scripts/fetch-cbp.mjs` runs on a scheduled GitHub Action. It hits the CBP JSON endpoint, accepts either English or Spanish localized border/status values, normalizes the shape, and commits `public/data/crossings.json`. Same cadence for `public/data/exchange-rate.json`.

Paid southbound Google Maps estimates are paused and are not part of the production workflow. The retained `scripts/fetch-sb.mjs` utility is historical/manual only; production serves the official northbound CBP feed.

The shared data service reads `/api/public/crossings` when the public API build
flag is enabled, with a dated `/data/crossings.json` fallback. Static builds use
the bundled snapshot. Both preserve retrieval timestamps; lane report clocks
are separate. The API implementation is in `api/public/crossings.js`. No account
is required for the free crossing reports.

The collector also materializes rolling 30-day history. Bundled frontend/history
publication and current-data retrieval are separate. The existing Vercel publisher
is gated by repository variables; inspect its actual run, source commit and public
manifest before reporting a release. See [refresh operations](docs/REFRESH-OPERATIONS.md)
and [the publisher workflow](.github/workflows/publish-vercel.yml). Do not infer
enabled, disabled, preview or production state from this checkout alone.

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
Use the existing guarded [publication workflow](.github/workflows/publish-vercel.yml)
and [refresh runbook](docs/REFRESH-OPERATIONS.md). The older Pages workflow remains
in the repository; its presence does not prove which artifact serves the public
host. Work on a branch, preserve publication/security gates, and obtain the owner’s
explicit approval before a production release. A source commit is not a deployment.
