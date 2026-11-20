---
type: session
date: 2026-11-20
---
# 2026-11-20 Map removal and pre-launch security audit

## What changed
- Removed the in-site map completely; `/carte` lists DofusDB and Dofus Maps; saved routes dropped from characters.
- Profession code moved to `src/professions.ts`, `src/professions-shared.ts` and `scripts/professions-import.ts`.
- Security fixes:
  - F1: reset links kept out of production logs;
  - F2: password hashing capped at 4 running and 32 queued;
  - F3: JSON-LD escape;
  - F4: achievement id cap.
- Privacy page lists the two map sites.

## Why
- **Map:** the owner no longer wants an in-site map ([[ADR-0005 Remove the in-site map]]).
- **Audit:** release readiness.

## Files affected
components/world and app/api/world (both deleted), `app/carte/page.tsx`, `src/professions*.ts`, `scripts/professions-import.ts`, `src/character.ts`, `components/useCharacter.ts`, `components/professions/JobGuide.tsx`, `src/server/auth.ts`, `app/api/auth/[action]/route.ts`, `src/jsonld.ts`, `components/JsonLd.tsx`, `app/api/achievements/route.ts`, tests and the `docs/` reports.

## Tests performed and results
- Typecheck: clean.
- Unit tests: 72/72.
- E2E: 22/22 on desktop and mobile.
- Production build: succeeds.
- `npm audit`: 0 vulnerabilities.
- Live probe with two accounts: all expected results.
- **OWASP ZAP not run** (no Docker or Java).

## Remaining issues
- E-mail provider (password reset in production).
- `TRUSTED_IP_HEADER` and other production variables.
- Backups.
- Staging run.
- Legal review.
- Changes are uncommitted.

## Next recommended actions
Commit and push; then the [[Release Checklist]].
