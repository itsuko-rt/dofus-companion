---
type: session
date: 2026-11-25
---
# 2026-11-25 Game companion phase 7 characters and accounts

## What changed
- **The companion follows the DOFUS window in front** (`companion/foreground.mjs`), so with two accounts the site's active profile follows the character being played. Readings always carry the character of the captured window.
- **Login and character-selection screens** are recognised. Their real title is « Dofus <version> - <channel> »; the parser assumed another form.
- **Site, « Profils liés au jeu »:** server and account labels, « en jeu » and « profil actif » tags, last seen, and **Délier**.
- **Fixed** (found by the new E2E test): typing an account remounted the row and lost the server typed next.

Details: [[Game Companion Design#13. Phase 7: built (several characters and accounts)]].

## Why
Phase 7 of the approved plan: several accounts and several characters per account, with no progress ever crossing between them.

## Files affected
- **New:** `companion/foreground.mjs`.
- **Changed:**
  - `companion/main.mjs` (active window, `setActive`);
  - `src/game-window.ts`, `tests/game-window.test.ts`;
  - `components/companion/CompanionSyncPanel.tsx`;
  - `e2e/companion-sync.spec.ts` (new test; the mode change now waits for the companion).
- **Vault:** [[Game Companion Design]], [[01 - PROJECT ROADMAP]], [[03 - DEVELOPMENT STATUS]].

## Tests performed and results
- Typecheck clean. `npm test`: 125/125.
- `e2e/companion-sync.spec.ts`: 3/3. Full E2E: 66 passed, 1 skipped by design, 0 failed.
- **Real game:**
  - the foreground reader works;
  - the character-selection screen is now detected (it was « DOFUS non détecté » before the fix).

## Remaining issues
- Not checked with two real DOFUS windows at once.
- Two characters with the same name on two servers cannot be told apart: one stays unlinked.

## Next recommended actions
1. **Owner:** pair the companion with the site (« Copier le code », then « Relier » on `/compagnon`). Enter the game with a character, and check that its card appears.
2. **Phase 8:** the always-on-top overlay.
3. **Phase 9:** hardening.
