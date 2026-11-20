# Security audit summary

Detailed reports in the repository:
- `docs/AUDIT_SECURITE.md` (2026-11-19, first audit);
- `docs/SECURITY_AUDIT.md` (2026-11-20, pre-launch audit);
- `docs/SECURITY_FIXES.md` (fixes).

## Pre-launch audit (2026-11-20)
Method: code review, unit tests, a live probe against a local production build with two accounts (`scripts/security-probe.mjs`), Playwright, `npm audit`, and secret scans of files, git history and bundles. **OWASP ZAP not run** (no Docker or Java). Production and staging not tested.

| ID | Severity | Finding | Status |
|---|---|---|---|
| F1 | High | Reset links (with e-mail) written to server logs | fixed |
| F2 | Medium | Unbounded concurrent password hashing (memory/CPU) | fixed (4 running, 32 queued) |
| F3 | Low | JSON-LD escape did nothing | fixed |
| F4 | Info | Unbounded achievement category list | hardened |
| F5 | Medium | Password reset can't work in production (no e-mail provider) | **open** |
| F6 | Medium | Without `TRUSTED_IP_HEADER`, anyone can lock a victim's login for 15 min | **open (configuration)** |
| F7 | Low | Registration reveals existing addresses | accepted |
| F8 | Low | No e-mail verification | open |
| F9 | Low | CSP allows inline scripts | accepted |
| F10 | Low | 30-day sessions, no idle timeout | accepted |
| F11 | Low | No global storage quota | accepted |
| F12–13 | Info | No `__Host-` cookie prefix; HSTS needs an https site URL | optional / configuration |

**Nothing was found** for IDOR, SQL injection, XSS, CSRF, CORS, SSRF, open redirects, path traversal, mass assignment, secrets or exposed source maps.
