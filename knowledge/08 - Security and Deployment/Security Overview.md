# Security overview

| Area | Control | Note |
|---|---|---|
| Accounts | scrypt, hashed session tokens, throttling, same-origin checks | [[Authentication]] |
| Data isolation | Every character query is scoped by the session's user id | Tested with two accounts |
| Input | Body size limits, `sanitizeCharacter`, parameterised SQL, regex-checked route params | |
| Output | React escaping; JSON-LD escapes `<` | |
| Headers | CSP, nosniff, Referrer-Policy, X-Frame-Options DENY, Permissions-Policy, HSTS (with an https site URL), no X-Powered-By | `next.config.ts` |
| Secrets | `.env*` and `data/` git-ignored; no secrets in history or bundles (scanned 2026-11-20) | |
| Logging | No reset links or addresses in production logs | |
| Third parties | See [[Integrations]] | |

Full findings: [[Security Audit]]. Privacy: [[GDPR and Privacy]].
