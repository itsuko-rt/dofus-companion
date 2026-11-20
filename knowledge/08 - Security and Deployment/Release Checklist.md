# Release checklist

From `docs/RELEASE_READINESS.md` (2026-11-20). Tick only when actually done.

## Verified locally (2026-11-20)
- [x] Typecheck, 72 unit tests, 22 E2E tests, production build
- [x] `npm audit` with 0 vulnerabilities
- [x] Live security probe with two accounts
- [x] No secrets in the repository, its history or the bundles; no source maps served

## Before a public launch
- [ ] E-mail provider wired into password reset, with its DPA
- [ ] `NEXT_PUBLIC_SITE_URL` (https), `TRUSTED_IP_HEADER=cf-connecting-ip`, `APP_DB_PATH`, `LEGAL_*` set on the host
- [ ] Daily backup of `data/app.sqlite` scheduled; one restore tested
- [ ] Staging: OWASP ZAP baseline, headers over https, register / login / reset on the real domain
- [ ] Legal review: terms, DPAs, breach procedure, retention, minors, analytics consent
- [ ] Ankama fan-site terms checked (artwork, the DOFUS name); trademark check of "Atlas des Douze"
- [ ] Fashionista maintainers informed
- [ ] Google Search Console and Bing: domain verified, sitemap submitted

## Keep off until conditions are met
AdSense (certified CMP), Cloudflare Web Analytics (consent position for Spain).
