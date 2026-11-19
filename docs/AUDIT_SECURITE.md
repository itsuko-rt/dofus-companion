# Security, privacy and QA audit — 2026-11-19

Scope: local dev server (localhost:3000) and a local production build (:3100) only. No external site was tested.

## Attack surface
- Next.js 16 App Router, one Node process. User data: `data/app.sqlite` (`node:sqlite`). Game data: read-only SQLite.
- Endpoints that change state: `/api/auth/{register,login,logout,forgot,reset,delete}` and `/api/characters/[id]` (PUT, DELETE). Reads: `/api/auth/me`, `/api/characters`.
- Public read-only endpoints: graph, quests, achievements, items search, builds (proxy to Dofus Fashionista).
- No admin interface, no file upload to the server: the OCR runs in the browser (Tesseract.js); the model is downloaded from jsDelivr.
- Third parties: Dofus Fashionista (server-side), jsDelivr (scanner only), Cloudflare Web Analytics and AdSense (both off until env vars are set).

## Findings and status
| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | HIGH | Login throttle keyed on client-supplied `X-Forwarded-For`: rotating it allowed unlimited password guesses (12/12 attempts got through live) | Fixed: address only from `TRUSTED_IP_HEADER` (set `cf-connecting-ip` behind Cloudflare), plus a per-e-mail cap of 30 per 15 min. Live: 429 after 8 |
| 2 | HIGH | Shared browser: characters of account A left in localStorage were merged into account B when B signed in | Fixed (`owner` stored with local characters; logout wipes them once they are saved). Verified in Edge by `e2e/account.spec.ts` |
| 3 | MEDIUM | Reset link built from the request's origin (Host-header poisoning once e-mail is sent) | Fixed: `NEXT_PUBLIC_SITE_URL`. Test added |
| 4 | MEDIUM | No request size limit: an 8 MB character body was stored | Fixed: 16 KB auth, 2 MB character, streamed and cut. Live: 413 |
| 5 | MEDIUM | No account deletion (GDPR art. 17); policy said "write to us" | Fixed: `POST /api/auth/delete` with password, cascades sessions, reset links and characters; UI on /compte. Tests added |
| 6 | MEDIUM | No rate limit on registration or reset requests | Fixed: 10/h per address (100/h site-wide without a trusted IP header); 3 links/h per e-mail |
| 7 | MEDIUM | No Content-Security-Policy, no HSTS, `X-Powered-By` exposed | Fixed: CSP in `next.config.ts` (scanner verified working under it), HSTS when the site URL is https, header removed |
| 8 | MEDIUM | Session cookie `Secure` depended on Node seeing https (missing behind a TLS proxy) | Fixed: always Secure in production |
| 9 | MEDIUM | Build links from the Fashionista API rendered as `href` without checking the scheme | Fixed: only `https://dofusfashionista.gg/` builds kept |
| 10 | LOW | Used and expired reset links never deleted; other pending links stayed valid after a reset | Fixed |
| 11 | LOW | Scanner: no size cap (a huge image could freeze the tab); raw English decoder error | Fixed: 25 MB / 40 Mpx caps, French messages |
| 12 | LOW | Privacy policy: hashed throttle data described as raw e-mail/IP, no sessions/reset/hosting entries, CNIL only | Fixed: policy matches code, AEPD added |
| 13 | LOW | Registration reveals that an e-mail has an account (409) | Accepted: unavoidable without e-mail verification; mitigated by #6 |
| 14 | LOW | Reset links are written to the server log (no e-mail provider yet) | Open: configure an e-mail provider before launch |
| 15 | INFO | 30-day sessions, no "log out everywhere" or password change while signed in | Open recommendation |
| 16 | INFO | CSP keeps `'unsafe-inline'` scripts (Next.js without nonces) | Open recommendation |
| 17 | MEDIUM | Home, Succès and Builds sent no `<h1>` or content in the server HTML (rendered only after the browser storage is read): invisible to search engines and screen readers until JavaScript runs | Fixed: titles are server-rendered; the E2E sitemap test checks one h1 on every page |
| 18 | LOW | Quest tracker nested a second `<main>` inside the layout's | Fixed: `<section aria-label="Carte des quêtes">` |
| 19 | LOW | Contrast below WCAG AA: `faint` text 4.0–4.48:1, white on the green button 4.43:1 | Fixed: `faint` #a08f74 (≥ 4.99:1 on every surface), parchment faint #735836, button #567f0b (4.73:1) |
| 20 | MEDIUM (perf) | Succès rendered all 743 rows of the default category: 910 ms of blocked main thread on mobile | Fixed: pages of 100 with "Afficher les suivants"; deep links still reach their row |
| 21 | INFO | `next start` listens on every interface (the LAN address was reachable) | Run it as `next start -H 127.0.0.1` behind the Cloudflare Tunnel |

## Browser tests (Playwright, `npm run e2e`)
18 tests run in Edge against the production build. All pass. They cover:
- **Account:** registration, wrong password, duplicate account, logout, session kept across a reload.
- **Account isolation:** shared-browser isolation (#2), account deletion from the page, and authorization between two accounts.
- **Every sitemap page:** status 200, one h1, no script error and no CSP violation.
- **Navigation and keyboard:** the navigation bar and the skip link, on desktop and on a phone-sized screen with no horizontal scroll.
- **Quest map:** right-click to complete, undo, search, status filter, persistence after reload.
- **Achievements:** search, opening one, manual completion, the "Obtenus" filter.
- **Characters:** creation, a separate progression per character, deletion.
- **Scanner:** invalid and executable files are refused, and a hostile file name is shown as plain text.
- **Builds:** the page shows builds or an explicit error, never a blank page.

## Lighthouse (mobile profile, production build)
| Page | Before: perf / a11y | After: perf / a11y | Notes |
|---|---|---|---|
| / | 67 / 96 | 71 / 100 | LCP 5.9 s: the hero's class artwork only starts loading after hydration |
| /progression/quetes | 72 / 97 | 74 / 100 | LCP limited by client rendering of the map |
| /progression/succes | 75 / 97 | 92 / 97→100* | TBT 910 → 240 ms |
| /guides/quetes/incarnam | 97 / 96 | 97 / 100* | |
| /builds | 97 / 95 | 97 / 100 | |

\* After the button colour change, which came after this measurement. The only remaining failure was that button's 4.42:1 contrast.

Best practices: 96–100. SEO: 100, except /personnage, which is intentionally `noindex`. The bf-cache "failure" comes from Lighthouse's own browser flags, not from the site.

## Tools
- **OWASP ZAP:** not available on this machine (it needs Docker or Java). `scripts/security-probe.mjs` covers the same baseline against your own server:
  - authorization (IDOR) between two accounts;
  - CSRF and CORS;
  - throttling;
  - request body size;
  - injection;
  - exposed files;
  - security headers.
- `npm audit`: 0 vulnerabilities. `scripts/check-links.ts`: 138 pages, no problem.

## Before going public
- Set `TRUSTED_IP_HEADER=cf-connecting-ip` and `NEXT_PUBLIC_SITE_URL=https://…` on the server.
- Connect an e-mail provider for reset links (#14).
- Home page LCP: serving the class artwork as WebP, or not showing it on mobile, would be the next measured gain.

## Verified without problems
- **Authorization:** user B could not list, change or delete user A's characters; tested live and in unit tests.
- **CSRF:** cross-origin writes get 403. **CORS:** no CORS headers are sent.
- **Passwords:** stored as scrypt hashes (N=16384, r=8, p=1) and compared in constant time. Session and reset tokens are stored only as hashes.
- **SQL:** every query uses parameters. SQL injection, XSS and path-traversal payloads had no effect. React escapes stored names.
- **Public files:** `.env`, the `.sqlite` files, `.git` and `package.json` all return 404.
- **Dependencies:** `npm audit` reports 0 vulnerabilities. No secrets in the repository or its history.
- **Consent:** ads stay off until the env vars are set, and premium accounts are excluded. Analytics only load when a token is set. Screenshots never leave the browser.
