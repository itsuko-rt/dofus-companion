---
type: session
date: 2026-11-20
---
# 2026-11-20 Game data and product audit

## What changed
- Audit written: `docs/GAME_DATA_AND_PRODUCT_AUDIT.md`. No application code changed.
- Vault notes updated:
  - class-specific quests in [[Quests]];
  - the first-visit bug and the Succès slowness in [[03 - DEVELOPMENT STATUS#Known limitations]];
  - two lines in [[Feature Backlog]].

## Why
The owner asked to analyse the game data, support every class, and find the cause of slow Quêtes and Succès navigation, before any development.

## Files affected
`docs/GAME_DATA_AND_PRODUCT_AUDIT.md`, [[Quests]], [[03 - DEVELOPMENT STATUS]], [[Quick Links]], [[Feature Backlog]], [[Session Summaries]].

## Tests performed and results
- **Data:** SQL on the 3.7.14.18 database and reads of the raw files.
- **Classes:** 19 classes with 44 spells each; 40 quests with a class condition.
- **Performance:** production build driven by Playwright in Edge, at normal and 4× slower CPU.
  - Home → Quêtes: 145 ms (711 ms at 4×).
  - Succès Donjons API: about 220 ms on the server, caused by a missing index.
- **First visit:** `/personnage` and `/builds` blank, reproduced in a fresh profile.
- `node scripts/check-knowledge.ts` passes.

## Remaining issues
- Phase 0 was done afterwards (below). Phases 1–4 have not started.
- The "232 en cours" shown on an empty profile needs checking.
- The Fashionista names of the other 17 classes are unverified.

## Next recommended actions
Owner approval of phase 0 (fixes and measurement), then phases 1–2 (all classes, class hub).

## Phase 0 (approved the same day)
- **What changed:**
  - [[Blank pages on a first visit]] fixed;
  - Succès achievements loaded with one query per table plus 3 indexes;
  - quest graph and statuses built once per page;
  - `BuildCard` remounts removed.
- **Files:** `components/useCharacter.ts`, `src/load.ts`, `scripts/import.ts`, `components/quests/useGame.ts`, `components/builds/BuildsView.tsx`, `tests/data.test.ts`, `e2e/ui.spec.ts`.
- **Tests:**
  - typecheck clean;
  - `npm test` 73/73;
  - E2E 24/24, including the new first-visit test;
  - Succès Donjons API 220 → 28 ms;
  - returning to Quêtes at 4× CPU: 629 → 423 ms. Full table in the audit, "Phase 0 results".
- **Not done:** first Quêtes load still downloads the whole graph (P3). Nothing committed.
