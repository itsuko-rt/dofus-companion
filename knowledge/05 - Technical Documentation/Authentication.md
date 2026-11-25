---
type: technical
---
# Authentication

Site accounts only, never Ankama accounts. Code: `src/server/auth.ts`; tests: `tests/auth.test.ts`, `tests/security.test.ts`, `e2e/account.spec.ts`.

| Mechanism | Implementation |
|---|---|
| Passwords | scrypt (N=16384, r=8, p=1), 16-byte salt, constant-time comparison; 10–200 characters |
| Hash load | At most 4 hashes at once and 32 queued; beyond that, `503` |
| Sessions | 32 random bytes in an `HttpOnly; SameSite=Lax; Secure` (production) cookie `adz_session`; only the SHA-256 is stored; 30 days |
| CSRF | Origin must match the host or `SITE_URL` (or `Sec-Fetch-Site: same-origin`) on every state-changing route |
| Throttling | 8 failures per e-mail + IP and 30 per e-mail, per 15 min; IP read only from `TRUSTED_IP_HEADER`; events stored as hashes and purged after 1 h |
| Enumeration | Login and reset answer the same way (dummy hash for unknown users). Registration does reveal an existing address (accepted trade-off) |
| Reset | Single-use token, 60 min, link built from `SITE_URL`, ends all sessions. **Production can't send it yet** (no e-mail provider); links are logged only in development |
| Deletion | Password required; cascades to sessions, reset tokens and characters |

**Known gaps:**
- no e-mail verification;
- no "log out other devices";
- no idle timeout.

See [[01 - PROJECT ROADMAP]] and [[Security Audit]].
