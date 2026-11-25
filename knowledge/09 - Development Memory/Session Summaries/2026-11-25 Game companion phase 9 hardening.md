---
type: session
date: 2026-11-25
---
# 2026-11-25 Game companion phase 9 hardening

## What changed
- **Data finding, and a new rule.** In the game data, 13 achievements share their name with an achievement category, 207 with a subarea and 16 with an area; 1 quest shares its name with an area. Such a heading on screen would have been read as a certain completion.
  - Now a name that is also a heading or a place is never certain. It is still proposed « à confirmer ».
  - The names come from a new static route, `/api/compagnon/titres`.
- **The companion's log is its own tested module** (`companion/log.mjs`): restored after a restart, crash-cut lines dropped, answers to pruned events dropped.
- **Electron lockdown:** no pop-ups, no navigation.
- **Hostile text** in names is checked to stay text.
- **API preflight tests,** including the local-network header.
- **Dependency audits:** 0 vulnerabilities (site and companion).

Full report: [[Game Companion Design#15. Phase 9: hardening and test report]].

## Why
Phase 9 of the approved plan: test false detections, duplicate events, disconnected sessions, character switching and restarts, and fix what the tests find.

## Files affected
- **New:**
  - `companion/log.mjs`;
  - `app/api/compagnon/titres/route.ts`;
  - `tests/companion-log.test.ts`.
- **Changed:**
  - `src/companion-read.ts`, `src/load.ts` (`loadHeadingNames`);
  - `companion/main.mjs`, `companion/read.mjs`;
  - `tests/companion-read.test.ts`, `tests/companion-api.test.ts`;
  - `CLAUDE.md`.
- **Vault:** [[Game Companion Design]], [[API Documentation]], [[Security Overview]], [[Integrations]], [[01 - PROJECT ROADMAP]], [[03 - DEVELOPMENT STATUS]].

## Tests performed and results
- Typecheck clean. `npm test`: **132/132**.
- `npx playwright test`: **66 passed, 1 skipped** by design, 0 failed.
- **Companion self-tests:**
  - synthetic quests: 7/7 certain;
  - synthetic achievements: 3 certain + 1 « à confirmer » (heading) out of 5;
  - UI: no error; lockdown and hostile-text checks pass; overlay topmost and not focusable.
- `npm audit`: 0 and 0.

## Remaining issues
See the limitations list in [[Game Companion Design#15. Phase 9: hardening and test report]]. The main one: accuracy on real game lists has not been measured.

## Next recommended actions
1. **Owner:** pair the companion and the site. Then, in game, open « Terminées » and choose « Quêtes terminées » in the companion. Frame the list and press Ctrl+Shift+F9. Do the same with the obtained achievements.
2. **Calibration from that test,** with the « Voir le texte lu » text if names are missed.
3. **Merge order** (owner): `feature/atlas-ecosystem` → `develop`, then docs/vault-cleanup, then feature/game-companion.
