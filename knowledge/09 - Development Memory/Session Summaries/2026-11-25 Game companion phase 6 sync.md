---
type: session
date: 2026-11-25
---
# 2026-11-25 Game companion phase 6 sync

## What changed
- **The companion serves its events** on `127.0.0.1:47120`, with pairing token, Host and Origin checks, and size limits (`companion/api.mjs`, [[API Documentation]]).
- **The site reads them** (`components/companion/companion-sync.ts`):
  - polling on every page once paired;
  - exact-name profile matching;
  - Observation, Assisted and Automatic modes;
  - waiting confirmations;
  - « create / link a profile » cards;
  - idempotent writes (the `eventId` is kept in the history);
  - acknowledgements back to the companion.
- **The panel** « Compagnon Windows » on `/compagnon`, and a badge in the nav.
- **The character model** gains optional `gameName`, `server`, `account`, `lastSeenAt`, the `companion` source and `eventId`. No table change ([[Database Schema]]).
- **CSP:** `connect-src` allows `http://127.0.0.1:47120` ([[Security Overview]]).
- **Bug fixed:** the companion's pairing code was not saved, so every restart unpaired the site.

Details: [[Game Companion Design#12. Phase 6: built (sync with the site)]].

## Why
Phase 6 of the approved plan: the progress the companion reads must reach the player's profiles, safely and only once.

## Files affected
- **New:**
  - `src/companion-sync.ts`;
  - `companion/api.mjs`;
  - `components/companion/companion-sync.ts`, `components/companion/CompanionSyncPanel.tsx`;
  - `tests/companion-sync.test.ts`, `tests/companion-api.test.ts`;
  - `e2e/companion-sync.spec.ts`.
- **Changed:**
  - `src/character.ts`;
  - `components/useCharacter.ts` (edit by id, select, add);
  - `components/Nav.tsx`, `app/compagnon/page.tsx`;
  - `next.config.ts`;
  - `companion/main.mjs`, `companion/ui.html`, `companion/preload.cjs`.

## Tests performed and results
- Typecheck clean. `npm test`: 125/125.
- `e2e/companion-sync.spec.ts`: 2/2. Full E2E suite: 65 passed, 1 skipped by design, 0 failed.
- **Real companion:** API up (401 without a token); the pairing code is the same after two restarts; the panel renders on the real site with no console error.

## Remaining issues
- **Not checked:** pairing the real companion with the real site, so a real character arriving was not seen. Reading the code from the companion's settings file was refused by the session's permission rules; the owner pastes it.
- Events are applied only while a page of the site is open.
- Chrome's local-network prompt on an https production site: not tested.

## Next recommended actions
1. **Owner:** in the companion, click « Copier le code ». On `/compagnon`, paste it and click « Relier ». Then switch character in DOFUS and check the « Nouveau personnage » card.
2. **Phases 7–9:**
   - multi-account checks with two DOFUS windows;
   - the always-on-top overlay;
   - hardening (false readings, restarts).
