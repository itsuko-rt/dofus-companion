# Current status

*Last updated: 2026-11-20 by Claude Code. Update this note after each significant session.*

## Where we are
**Pre-launch.** The site runs locally. All checks pass: typecheck, 72 unit tests, 22 E2E tests, production build, `npm audit` with 0 vulnerabilities.

## Latest changes (committed locally on 2026-11-20, not pushed)
- **In-site map removed:** `/carte` is now a directory of DofusDB and Dofus Maps ([[ADR-0005 Remove the in-site map]]).
- **Security audit and fixes:** reset links kept out of production logs, password hashing capped, JSON-LD escape fixed ([[Security Audit]]).
- **This knowledge base** and the project `CLAUDE.md`.

## Blocking a public launch
From [[Release Checklist]]:
1. **E-mail provider:** password reset can't send links in production.
2. **Hosting environment variables:** `NEXT_PUBLIC_SITE_URL` (https), `TRUSTED_IP_HEADER`, `APP_DB_PATH`, `LEGAL_*`.
3. **Backups** of `data/app.sqlite`, with one restore tested.
4. **Staging run:** OWASP ZAP baseline, headers over https.
5. **Legal review** ([[GDPR and Privacy]]): terms of service, DPAs, breach procedure, retention, minors.
6. **Ankama fan-site terms**, Fashionista maintainers informed, trademark check.

## Known limitations
- The scanner's OCR accuracy has not been measured on real Dofus screenshots (UNVERIFIED).
- 621 of 1,984 quests have conditions the engine can't fully interpret. They are shown as "à vérifier en jeu", never guessed.
- Builds come from Fashionista; budget, prices and verified damage are not available.
- Professions: resources are known per zone, not per map, and no spot counts.
- XP and kamas routes: no verified data, not implemented.

## What Claude Code is working on
Nothing in progress after this session. Next recommended actions are in the latest [[Session Summaries|session summary]].
