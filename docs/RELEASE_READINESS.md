# Release readiness, 2026-11-20

## Checks run (local, production build)
| Check | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | ✓ no errors |
| Unit and integration tests (`node --test tests/`) | ✓ 72 / 72 (auth, isolation, reset, deletion, throttling, migrations, professions, security fixes, game data) |
| End-to-end (Playwright, Edge, desktop and mobile) | ✓ 22 / 22 (every sitemap page loads with one h1 and no script or CSP error; navigation; accounts; professions; the `/carte` external links) |
| Production build (`next build`) | ✓ |
| Dependency audit (`npm audit`) | ✓ 0 vulnerabilities |
| Live security probe (`scripts/security-probe.mjs`, two accounts) | ✓ all expected results (see `SECURITY_AUDIT.md`) |
| Authentication and user-data isolation | ✓ unit tests + live probe |
| Broken links | ✓ the sitemap crawl in E2E plus a grep for old `/carte?…` and `/api/world` links: none left |
| Secrets (files, git history, client bundles, source maps) | ✓ none found |
| OWASP ZAP baseline | ✗ **not run**: Docker and Java aren't available here. Run it against staging before launch: `docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t https://<staging>` |
| Production or staging environment | ✗ not tested (no staging URL was given): TLS, HSTS, proxy and IP header are unverified |

## Must do before a public launch
1. **Password reset (F5):** choose an e-mail provider, implement `deliver`, and sign its DPA. Until then, users who forget their password can't recover their account.
2. **Deployment environment variables:**
   - `NEXT_PUBLIC_SITE_URL=https://…` (turns on HSTS and the correct reset links);
   - `TRUSTED_IP_HEADER=cf-connecting-ip` behind Cloudflare (F6);
   - `APP_DB_PATH` on persistent storage;
   - `LEGAL_PUBLISHER`, `LEGAL_CONTACT`, `LEGAL_HOST`.
3. **Backups:** schedule the SQLite `.backup` of `APP_DB_PATH`, decide its retention, and test one restore (`SECURITY_AUDIT.md` § Backups).
4. **Staging run:** ZAP baseline, header check over https, and one register / login / reset on the real domain.
5. **⚖️ Legal review** (`PRIVACY_GDPR_REVIEW.md`): terms of service, a DPA with the host, Cloudflare and the e-mail provider, a breach procedure, inactive-account retention, minors, and the AEPD's position on analytics.

## Recommended, not blocking
- E-mail verification at sign-up (F8): it also removes the registration enumeration (F7).
- "Log out other devices" and an idle timeout (F10); `__Host-` cookie prefix (F12).
- Nonce-based CSP to drop `'unsafe-inline'` (F9).
- Update `@playwright/test` and `lucide-react`. Retest the scanner before moving to tesseract.js 7.

## Keep off until their conditions are met
- **AdSense:** a certified CMP must be published and the policy updated (`.env.example` says so).
- **Cloudflare Web Analytics:** confirm the consent position for Spain first.
