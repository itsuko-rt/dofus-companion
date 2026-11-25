# Security overview

| Area | Control | Note |
|---|---|---|
| Accounts | scrypt, hashed session tokens, throttling, same-origin checks | [[Authentication]] |
| Data isolation | Every character query is scoped by the session's user id | Tested with two accounts |
| Input | Body size limits, `sanitizeCharacter`, parameterised SQL, regex-checked route params | |
| Output | React escaping; JSON-LD escapes `<` | |
| Windows companion | Loopback only (127.0.0.1:47120), pairing token, Host and Origin checks, size limits; the site validates every event (`src/companion-sync.ts`). CSP `connect-src` allows only `http://127.0.0.1:47120` for it. Companion windows: sandboxed, no pop-ups, no navigation, text rendered as text. `npm audit` 0 (2026-11-25) | [[Game Companion Design]] |
| Headers | CSP, nosniff, Referrer-Policy, X-Frame-Options DENY, Permissions-Policy, HSTS (with an https site URL), no X-Powered-By | `next.config.ts` |
| Secrets | `.env*` and `data/` git-ignored; no secrets in history or bundles (scanned 2026-11-20) | |
| Logging | No reset links or addresses in production logs | |
| Third parties | See [[Integrations]] | |

Full findings: [[Security Audit]]. Privacy: [[GDPR and Privacy]].
