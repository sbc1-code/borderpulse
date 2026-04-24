# Security policy

## Reporting a vulnerability

If you find a security issue in BorderPulse (borderpulse.com) or this repository, please report it privately before opening a public issue.

**Preferred channel:** open a GitHub security advisory via the repository's Security tab, or email **sebastianmbecerra5+security@gmail.com** with:

- A clear description of the issue
- Steps to reproduce
- Potential impact
- Any proposed fix (optional)

Please do NOT open a public GitHub issue for vulnerabilities. Public issues get indexed by search engines within minutes.

## Scope

In scope:
- `borderpulse.com` (live site)
- Build pipeline and GitHub Actions workflows in this repository
- Client-side code: `src/`, `public/`, `scripts/`
- Data files under `public/data/`

Out of scope:
- Third-party services BorderPulse depends on (report those to the upstream vendor):
  - U.S. Customs and Border Protection feeds
  - Google Maps Platform (Distance Matrix API)
  - Umami Cloud analytics
  - Adsterra ad network
  - GitHub Pages hosting
- Denial of service via the public CBP feed (upstream)
- Attacks requiring physical access to the maintainer's machine

## What to expect

- Acknowledgement within 72 hours
- Status update within 7 days
- Coordinated disclosure after a fix ships

BorderPulse is a solo project maintained by Sebastian Becerra. Response time reflects that.

## Data handling

- BorderPulse stores no user accounts and no personal data on a server.
- Client-side favorites are stored in `localStorage` only; they never leave the browser.
- Analytics is privacy-first (Umami Cloud, no cookies, no personal identifiers).
- Border wait time data is sourced from the public CBP feed; see [cbp.gov copyright notice](https://www.cbp.gov/site-policy-notices/copyright-notice).

## Credentials and secrets

- All API keys live in GitHub Actions secrets, never in code or committed files.
- No `.env` files are tracked; see `.gitignore`.
- Secret scanning and push protection are enabled on this repository.
