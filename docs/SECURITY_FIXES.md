# Security fixes, 2026-11-20

Each fix was retested: unit tests (`node --test tests/`), the live probe against a production build, and E2E.

## F1 — Reset links no longer written to production logs (High)
- **File:** `app/api/auth/[action]/route.ts`.
- **Before:** `console.info('[password reset] <e-mail>: <link>')` in every environment.
- **After:**
  - in development, the link is still printed so the flow can be tested;
  - in production, only `[password reset] requested, but no e-mail provider is configured: no link was sent` is logged, with no address and no token.
- **Side effect:** reset is unavailable in production until an e-mail provider is added (F5 in the audit). Plugging one in means replacing `deliver`.

## F2 — Bounded password hashing (Medium)
- **File:** `src/server/auth.ts`.
- **Change:** `scrypt` goes through a small limiter: 4 running, 32 waiting, and further calls throw `Busy`. A finishing hash hands its slot directly to the next waiter, so concurrency never exceeds 4.
- **API behaviour:** the auth route turns `Busy` into `503 {"error":"Serveur occupé…"}` with `Retry-After: 5`.
- **Test:** `tests/security.test.ts`. Of 50 simultaneous hashes, 36 finish and 14 are refused; peak concurrency is ≤ 4 and the limiter is idle afterwards.

## F3 — JSON-LD escape (Low)
- **Files:** `src/jsonld.ts` (new) and `components/JsonLd.tsx`.
- **Change:** `JSON.stringify(data).replace(/</g, '\\u003c')`. The old code replaced `<` with `<`.
- **Test:** `tests/security.test.ts`. No raw `<` remains, and the JSON parses back to the same value.

## F4 — Bounded achievement category list (Info)
- **File:** `app/api/achievements/route.ts`.
- **Change:** ids are positive integers, deduplicated, at most 200.

## Probe extended
`scripts/security-probe.mjs` now also checks:
- B overwriting A's character id;
- account deletion without, or with the wrong, password;
- a session reused after logout;
- logout from another origin;
- a forged reset token;
- weak-password registration.

All results are as expected; see the tables in `SECURITY_AUDIT.md`.

## Attack surface removed
The map removal deleted `GET /api/world/:id`, a public endpoint serving about 385 KB of JSON per request.

## Not changed on purpose
- **F7 (registration reveals that an account exists):** UX trade-off; throttled.
- **F9 (CSP `'unsafe-inline'`):** needs nonce-based rendering.
- **F10 (session lifetime):** product decision.
- **F5, F6, F8:** need deployment or provider decisions.

`RELEASE_READINESS.md` lists what must be decided.
