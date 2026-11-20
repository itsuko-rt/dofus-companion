# Pre-launch security audit, 2026-11-20

**Scope:** the whole application at the current working tree (after the map removal).

**Method:**
- read the actual code (not earlier reports);
- run the unit tests;
- run a live probe (`scripts/security-probe.mjs`) against a local production build (`next start`, `NODE_ENV=production`) with two throwaway accounts;
- run Playwright E2E, `npm audit`, lockfile inspection, a secret scan of the files and the full git history, a client-bundle scan, and header checks.

**Not run:**
- **OWASP ZAP:** Docker and Java aren't available on this machine. Nothing was claimed in its place.
- **Production or staging:** nothing was tested there. The real deployment (TLS, proxy, hosting) is untested; see `RELEASE_READINESS.md`.

Fixes are detailed in `SECURITY_FIXES.md`. The earlier audit (`AUDIT_SECURITE.md`) was re-verified rather than trusted.

## Attack surface
| Entry point | Auth | Notes |
|---|---|---|
| `POST /api/auth/{register,login,logout,forgot,reset,delete}`, `GET /api/auth/me` | session cookie where needed | scrypt, throttling, same-origin check, body limit 16 KB |
| `GET /api/characters`, `PUT/DELETE /api/characters/:id` | session required | owner-scoped queries, body limit 2 MB, `sanitizeCharacter` |
| `GET /api/items/search`, `/api/quests/:id`, `/api/achievements`, `/api/professions/:slug`, `/api/graph`, `/api/achievements/objectives` | public, read-only game data | parameterised SQL, numeric or regex-validated input |
| `GET /api/builds?breed=` | public | server fetches a **fixed** host (dofusfashionista.gg) with an allow-listed class; build URLs filtered to `https://dofusfashionista.gg/` |
| Scanner (OCR) | none: in browser | see the OCR section |
| Pages | static, user data in the browser only | React escaping; one `dangerouslySetInnerHTML` (JSON-LD) |

**No admin interface, no debug endpoints, no server actions, no file upload to the server.**

## Findings
| ID | Severity | Finding | Status |
|---|---|---|---|
| F1 | **High** (production) | **Password-reset links written to the server log** with the account's e-mail. A reset link is equivalent to the password: anyone with log access (host dashboard, log shipping) could take over any account that asks for a reset. | **Fixed:** link and address logged only in development; production logs only that a request happened. |
| F2 | **Medium** | **Unbounded concurrent password hashing.** Each scrypt hash uses about 16 MB and noticeable CPU. Logins with ever-new e-mail addresses are not throttled per account (and per IP only when `TRUSTED_IP_HEADER` is set), so a burst of requests could exhaust memory or CPU. | **Fixed:** at most 4 hashes run at once and 32 wait; beyond that, `503` with `Retry-After`. Tested. |
| F3 | Low | **The JSON-LD escape did nothing:** `'<'` in source is the character `<`, so `</script>` in the data was not neutralised. The data is game data and page names, not user input, so this wasn't exploitable today. | **Fixed:** escapes to the JSON sequence `<`. Tested. |
| F4 | Info | `/api/achievements?categories=` accepted any number of ids. Node's 16 KB header limit (431) stops it before SQLite's parameter limit, so there was no actual 500. | Hardened: deduplicated, capped at 200 ids. |
| F5 | **Medium (operational)** | **Password reset cannot work in production:** no e-mail provider is configured, and links are no longer logged (F1). Users who forget their password are locked out. | **Open: decision before launch** (choose a provider; a DPA is needed). |
| F6 | Medium (configuration) | Without `TRUSTED_IP_HEADER`, failed logins are counted per e-mail address only. Anyone can lock a victim's login for 15 minutes with 8 wrong passwords, and register is throttled site-wide (100/h). | **Open: set `TRUSTED_IP_HEADER=cf-connecting-ip` behind Cloudflare** (the per-address limit then becomes 30 per 15 min, and 8 per IP). |
| F7 | Low | **Account enumeration** through registration ("Un compte existe déjà", 409). Login and reset do not reveal accounts (same answer; a dummy hash equalises timing: 55 ms for an unknown user). | Accepted trade-off without e-mail verification; registration throttled to 10/h per IP. |
| F8 | Low | **No e-mail verification:** someone can register with another person's address. | Open: comes with the e-mail provider (F5). |
| F9 | Low | **CSP allows `'unsafe-inline'` scripts** (Next.js static pages without nonces). | Accepted: no user-supplied HTML anywhere, and React escapes all text. Revisit with nonces if pages become dynamic. |
| F10 | Low | **Sessions:** fixed 30-day lifetime, no idle timeout, no "log out other devices". An older session survives a new login; all sessions end on password reset or account deletion. | Accepted for launch; a candidate improvement. |
| F11 | Low | **Storage per account:** 20 characters × 2 MB each. Account creation is throttled, but there is no global storage quota. | Accepted; monitor the database size. |
| F12 | Info | The session cookie has no `__Host-` prefix (it is HttpOnly, SameSite=Lax, Secure in production, Path=/). | Optional hardening. |
| F13 | Info | HSTS is sent only when `NEXT_PUBLIC_SITE_URL` is https (by design: a wrong HSTS locks browsers out). It has no `includeSubDomains` or preload. | Set the https site URL in production. |

**Nothing was found** for:
- IDOR or broken access control;
- SQL injection, stored, reflected or DOM XSS;
- CSRF and CORS;
- SSRF, open redirects, path traversal, insecure deserialisation, mass assignment;
- secrets in the repository, its history or the client bundles;
- exposed source maps.

The evidence follows.

## Authentication and sessions (verified)
- **Passwords:**
  - scrypt (N=16384, r=8, p=1), 16-byte salt, constant-time comparison;
  - at least 10 characters (a weak password gets 400);
  - unknown users are checked against a dummy hash.
- **Session token:** 32 random bytes; only its SHA-256 is stored. The cookie is `HttpOnly; SameSite=Lax; Secure` in production (seen in the live probe), with Max-Age 30 days.
- **Session fixation:** a new token is issued at login and registration; tokens cannot be chosen by the client.
- **Logout:** deletes the session row; the old cookie afterwards gets `401` (live probe).
- **Expired and forged cookies:** expired sessions are rejected by the query and purged at login; a forged cookie gets `401`.
- **Password reset:**
  - single-use, 60-minute token stored as a hash;
  - the link is built from `SITE_URL`, never the Host header (forged-host tests; unit test);
  - all of the account's reset tokens and sessions are deleted after a reset;
  - a forged token gets `400`.
- **Brute force:** 8 failures per e-mail and IP, and 30 per e-mail, per 15 minutes. Rotating `X-Forwarded-For` does not reset it (live: `401×8, 429…`).
- **Account deletion:** requires the password, is throttled, and cascades to sessions, reset tokens and characters (unit test).

## Authorization and data isolation (two accounts, live)
| Attempt | Result |
|---|---|
| B lists characters | sees 0 of A's |
| B deletes A's character id | `200` but a no-op (query scoped to B); A still has it |
| B PUTs A's character id with a newer date | creates **B's own** row (primary key = owner + id); A's name unchanged ("A-original") |
| A's cookie, delete-account without or with a wrong password | `401` |
| No cookie, or a forged cookie | `401` |

Every character query filters on the session's user id (`src/server/auth.ts`). The client never sends a user id.

## Injection and application checks
- **SQL:** every query uses `?` parameters, including generated `IN (?,?,…)` lists; no user input is concatenated. Payloads such as `' OR 1=1--` and `1 OR 1=1` return empty results or `404`.
- **XSS:**
  - React escapes all text; the only raw HTML sink is JSON-LD, now escaped (F3);
  - a stored `<img onerror>` character name is kept as text and rendered escaped;
  - build URLs must start with `https://dofusfashionista.gg/`, so `javascript:` URLs are dropped (live probe);
  - external links use `rel="noopener noreferrer"`.
- **CSRF:** state-changing routes require Origin to match the host or `SITE_URL`, or `Sec-Fetch-Site: same-origin`; cookies are SameSite=Lax. Evil-origin PUT and logout get `403`.
- **CORS:** no CORS headers are sent; a preflight from another origin gets no `Access-Control-Allow-*`.
- **SSRF:** the only server-side fetch goes to a constant host, with the class from an allow-list and an encoded id.
- **Open redirects:** none (redirects are constant paths in `next.config.ts`).
- **Path traversal:** `/.env`, `/.git/config`, `/data/app.sqlite`, `/package.json` and `/_next/../package.json` all return `404`; `/api/quests/..%2F..` returns `404`.
- **Deserialisation:** `JSON.parse` only, results validated by `sanitizeCharacter`.
- **Mass assignment:** characters are rebuilt field by field; `plan` cannot be set by any route.
- **Body limits:** an 8 MB character gets `413` while streaming; malformed JSON gets `400`.

## Scanner (OCR) privacy (verified in code)
- **Where images are read:** files are decoded with `createImageBitmap` and read by tesseract.js in a Web Worker **in the browser**. No code sends images to our server or anywhere else; the scanner makes no `fetch` with image data.
- **What the browser downloads:** the tesseract worker, core and French model come from `cdn.jsdelivr.net` (allowed by the CSP). The visitor's IP reaches jsDelivr, and the privacy policy says so.
- **Storage and logs:** no image is stored, logged or reported; no temporary files exist (everything is in memory).
- **Screen capture:** stops right after one frame (`track.stop()`).
- **Limits:** 25 MB per file, 40 MP; `accept="image/*"`. A malicious image can only reach the browser's image decoder, never server code.
- **Visible to others:** no, nothing leaves the device.
- **What users are told:** the scanner page says the image is read in the browser and sent nowhere, which matches the code.

## Secrets, configuration, logging
- **Tracked files:** only `.env.example` (empty values); `.env*` and `data/` are git-ignored.
- **History:** a scan for key patterns found 0 hits, and no `.env`, `.sqlite` or `.pem` was ever committed.
- **Client bundles (`.next/static`):** contain no server variable names (`APP_DB_PATH`, `TRUSTED_IP_HEADER`, `LEGAL_*`) and no column names like `password_hash`. No `.map` files are built or served.
- **Logging:** the only server log is the reset notice (F1, fixed). Error responses are generic; Next.js hides stack traces in production.
- **Database:**
  - SQLite file at `APP_DB_PATH`, outside `public/`, with no credentials;
  - only the app process opens it;
  - forward-only migrations run in transactions;
  - foreign keys ON, WAL journal.

## HTTP headers (production build)
| Header | Value |
|---|---|
| Content-Security-Policy | `default-src 'self'`, `frame-src 'none'`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` (scripts: self, inline, jsDelivr, Cloudflare beacon) |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| X-Frame-Options | DENY |
| Permissions-Policy | camera=(), microphone=(), geolocation=() |
| Strict-Transport-Security | only with an https `NEXT_PUBLIC_SITE_URL` (absent locally, by design) |
| X-Powered-By | removed |
| API cache | `no-store` on auth and character responses; public game data `max-age=3600` |

## Dependencies
- **`npm audit`:** 0 vulnerabilities, production and all.
- **Lockfile:** 167 packages, all resolved from `registry.npmjs.org`.
- **Install scripts:** only `fsevents` (macOS, optional) and `tesseract.js` (`opencollective-postinstall || true`, a donation banner).
- **Outdated:**
  - `@playwright/test` 1.56 → 1.65 (dev only) and `lucide-react` (minor): low-risk updates, not applied;
  - `tesseract.js` 6 → 7 is a major version and **not applied**: it needs a scanner retest.
- **Unused dependencies:** none (each one is imported by a live feature).

## Backups and restore (procedure, not automated in the repo)
The only user data is the `APP_DB_PATH` SQLite file.
- **Back up while running:** `sqlite3 "$APP_DB_PATH" ".backup '/backups/app-$(date +%F).sqlite'"`. This is consistent with WAL; copying the file alone is not.
- **Restore:** stop the app, put the backup at `APP_DB_PATH`, delete the stale `-wal` / `-shm` files, then start; migrations bring an older backup forward.
- **Retention:** backups contain deleted accounts until they expire. Set and state a retention period (the privacy policy already mentions host backups).
