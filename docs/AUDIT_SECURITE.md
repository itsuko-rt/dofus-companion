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
| 2 | HIGH | Shared browser: characters of account A left in localStorage were merged into account B when B signed in | Fixed in code (`owner` stored with local characters; logout wipes them once they are saved). Typechecks, **not yet verified in a browser** |
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

## Verified without problems
- **Authorization:** user B could not list, change or delete user A's characters; tested live and in unit tests.
- **CSRF:** cross-origin writes get 403. **CORS:** no CORS headers are sent.
- **Passwords:** stored as scrypt hashes (N=16384, r=8, p=1) and compared in constant time. Session and reset tokens are stored only as hashes.
- **SQL:** every query uses parameters. SQL injection, XSS and path-traversal payloads had no effect. React escapes stored names.
- **Public files:** `.env`, the `.sqlite` files, `.git` and `package.json` all return 404.
- **Dependencies:** `npm audit` reports 0 vulnerabilities. No secrets in the repository or its history.
- **Consent:** ads stay off until the env vars are set, and premium accounts are excluded. Analytics only load when a token is set. Screenshots never leave the browser.

## Not done in this pass
- Playwright E2E suite: not installed. Coverage comes from `node:test` (66 tests) and manual checks in the browser.
- Lighthouse and profiling, OWASP ZAP baseline scan.
- Browser verification of #2.
- A full click-through of every page and form.
