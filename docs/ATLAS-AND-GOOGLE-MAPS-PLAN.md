# Crossing Atlas, Google Maps API ($10/mo Cap), and Monetization Plan

**Owner:** Sebastian Becerra (`sbc1-code`)  
**Status:** Active roadmap (pilot staged in `drafts/atlas-pilot/`)  
**Scope:** Multi-agent engineering and business handoff for `borderpulse.com`

---

## 1. Business & Monetization Trajectory

BorderPulse operates as a fast, bilingual (EN/ES) utility for US-Mexico and US-Canada land border crossings.

1. **Current Monetization (Adsterra + Direct Local Sponsors)**
   - Keep Adsterra active while traffic and Search Console CTR compound across crossing dashboards and bilingual guides.
   - Keep direct local business placements (`src/lib/sponsors.js`, e.g., dental/pharmacy/city services) under strict UX rules:
     - Maximum **one** commercial spot per page.
     - A sponsor card replaces the programmatic ad slot on that page; never render both together.
     - Never place ads above the primary wait-time answer or CTAs.
     - No adult, gambling, or deceptive creatives (`scripts/check-ads.mjs` enforces slot invariants).
2. **AdSense Transition Path**
   - Transition eligible guide and city-directory slots from Adsterra to **Google AdSense** once traffic volume, Search Console impression share, and editorial depth hit AdSense RPM efficiency.
   - Pre-transition requirements:
     - Maintain clean Core Web Vitals (`npm run test:bundle` JS/CSS budgets).
     - Continue growing original bilingual crossing, SENTRI/Ready Lane, medical, and return-trip guides with `<CrossingWaitLinks />` funnels into live wait dashboards.
     - Keep `ads.txt`, Privacy, About, and Methodology pages accurate before submitting/switching placements.
3. **Bilingual Content Expansion**
   - Prioritize high-impression Search Console pages first: sharpen EN/ES titles/descriptions for search intent, add direct `<CrossingWaitLinks />` to live port dashboards, and expand corridor/city guides in natural US English and Mexican Spanish.

---

## 2. Google Cloud Services & Google Maps API ($10/month Hard Cap)

BorderPulse will reactivate the **Google Maps API** under Google Cloud Services strictly as a **capped, high-value enhancement** while keeping core wait-time pages zero-cost and resilient.

### Non-Negotiable Cost & Security Guardrails

> **Rule for AI agents:** Never create GCP billing accounts, uncap API quotas, commit API keys, or spend money programmatically. Sebastian configures GCP billing, quotas, and API credentials manually in Google Cloud Console and provides restricted keys via environment variables/Vercel secrets.

Before any Google Maps feature ships to production, all five controls must be active:

1. **Hard API Request Quotas (True Spend Ceiling)**
   - GCP Budgets & Alerts only send notifications; **API Quotas stop requests**.
   - Under *Google Cloud Console -> APIs & Services -> Quotas*, set explicit **per-day** and **per-minute** request limits on every enabled Google Maps SKU (e.g., Maps JavaScript API, Static Maps, Geocoding/Places if ever enabled) so worst-case full-quota monthly consumption cannot exceed **$10.00/month** (accounting for current Google Maps Platform monthly free-tier credit).
   - Keep expensive SKUs (`Places Autocomplete`, `Routes / Directions`, `Street View`) **disabled** until a specific feature requires them with its own dedicated daily cap.
2. **GCP Billing Budget Alerts**
   - Configure a monthly GCP Billing Budget at **$10.00/month** with alert thresholds at **50% ($5)**, **80% ($8)**, **95% ($9.50)**, and **100% ($10)**.
3. **API & HTTP Referrer Key Restrictions**
   - Production browser key restricted by HTTP referrer strictly to `https://borderpulse.com/*` and `https://www.borderpulse.com/*` (separate restricted key for local development).
   - Restrict each key to the exact allowlisted Maps API(s) only.
4. **Zero-Cost Fallback Architecture**
   - The core wait-time feed (`public/data/latest.json`, `public/data/history.json`, CBSA snapshots) and the offline Crossing Atlas globe (`drafts/atlas-pilot/`) must **never** fail if the Google Maps key is missing, disabled, or hits its daily quota.
   - Any Google Maps view is progressive enhancement (e.g., port approach lanes, nearby staging/parking geometry, street-level corridor inspect) with automatic fallback to the zero-cost SVG/Canvas Atlas.
5. **Terms of Service & Performance Compliance**
   - Respect Google Maps Platform ToS (no unauthorized tile scraping/caching or re-hosting Google response payloads in git).
   - Lazy-load Google Maps JS only after user interaction or on dedicated interactive map routes so SSR pages and `npm run test:bundle` stay within strict byte budgets.

### Evaluating Other Google Services
- **Google Search Console + GA4 (or Umami):** Use Search Console query/impression exports to pick the next highest-leverage guide title and internal-link updates before expanding ad surface.
- Keep static build/collector telemetry self-hosted on GitHub Actions + Vercel so recurring platform cost remains **$0**.

---

## 3. Crossing Atlas Rollout Plan (`drafts/atlas-pilot/` -> Production)

### Phase 0 — Completed Pilot (`drafts/atlas-pilot/`)
- Self-contained bilingual EN/ES two-country Atlas pilot matching live BorderPulse visual tokens (`#f6f8f7` shell, white `#d8e2df` cards, `#065f46` emerald controls, `#0f172a`/`#020617` globe canvas, system sans-serif, vertical-bar + sage-dot brand mark).
- Covers 27 US CBP ports, CBSA Canadian ports, and 42 MX corridor entries, with a two-direction mobile glance strip (`#direction-glance`), bounded midnight-rollover fixture clock (`scripts/us-fixture.mjs`), and a 4-checkpoint CBSA+CBP replay suite (`scripts/test-replay-sequence.mjs`).
- Verified offline (`node --test drafts/atlas-pilot/scripts/test-*.mjs`, 15/15 passing) and in headless Chrome across `1440x900`, `390x844`, and `320x700` with zero HTTP errors and zero horizontal overflow.

### Phase 1 — Live Telemetry Unification
- Bridge `public/data/latest.json` (US CBP), CBSA `bwt.csv` ingest, and curated port geometry/coordinates into one validated build/collector schema.
- Standardize bidirectional corridor pairing (SB/NB, US<->MX and US<->CA) plus closure/rollover/staleness badges verified against deterministic replay fixtures.

### Phase 2 — Production `/atlas` Route + Quota-Capped Google Maps Layer
- Promote the pilot into a lazy-loaded production route (e.g., `/atlas` and `/es/atlas` or integrated map explorer) preserving bundle budgets.
- Add an opt-in / progressive street-level port-approach layer powered by the $10/mo-capped Google Maps JS API, falling back cleanly to the offline vector globe when capped or offline.

### Phase 3 — Commercial & SEO Integration
- Cross-link top crossing guides (`<CrossingWaitLinks />`) and sponsor city corridors into the Atlas so high-intent search visitors convert into multi-page engaged sessions (improving both sponsor inquiries and future AdSense RPM).

---

## 4. Multi-Agent Handoff Contract

Any coding or research agent picking up BorderPulse work must follow these conventions:

1. **Read canonical docs first:** `AGENTS.md`, `DECISIONS.md`, `ROADMAP.md`, `CHANGELOG.md`, and this file (`docs/ATLAS-AND-GOOGLE-MAPS-PLAN.md`).
2. **Never commit to `main` directly** and never modify `/Users/sebastianbecerra/Projects/code/borderpulse` if a dirty local checkout exists — work in a fresh branch/worktree off `origin/main`.
3. **Avoid collector churn conflicts:** `fetch-cbp.yml` commits to `public/data/` every 15 minutes. Restore unrelated generated `public/` prebuild diffs before staging; commit only source files, docs, drafts, and intentionally updated OG images.
4. **Required verification before PR/merge:**
   - `npm run build`
   - `npm test` (validates MDX, editorial rules, metadata, writer checks, trust invariants, ad slot rules, JS/CSS bundle budgets, security audit, and headless browser route smoke tests)
   - `node --test drafts/atlas-pilot/scripts/test-*.mjs` (whenever modifying `drafts/atlas-pilot/`)
5. **Copy & policy guardrails:** Plain US English and natural Mexican Spanish, no em dashes in user-facing copy, no team pronouns ("we"/"our team"), no unverified wait/sponsor claims, and no secrets committed.
