---
type: session
date: 2026-11-20
---
# 2026-11-20 Profession calculator and drop sources

## What changed
- `src/craft-calc.ts`: XP calculator logic with input validation. It is shown on every profession page (`components/professions/JobGuide.tsx`, `Calculator`).
- **Loot ingredients** list up to 3 monsters that drop them, with the base chance (`src/professions.ts`, `DropSource`). The calculator and the recipe list share one `SourceLabel`.
- Decision recorded: [[ADR-0007 Profession XP comes from the player's screen]].

## Why
Phase 4 of the owner's plan. The game files have no profession XP data, so the XP numbers come from the player's screen.

## Files affected
`src/craft-calc.ts`, `src/professions.ts`, `src/professions-shared.ts`, `components/professions/JobGuide.tsx`, `tests/craft-calc.test.ts`, `e2e/professions.spec.ts`.

## Tests performed and results
- Typecheck clean; `npm test` 80/80; production build OK.
- E2E 26/26 passed and 1 skipped (the new calculator test included).
- Screenshot on Tailleur level 40: 6,000 XP at 120 per craft gives 50 Abracape and 250 Racines d'Abraknyde, with their drop monsters.

## Remaining issues
- Only up to the next level (no XP table).
- Drop chances are base values, before prospection. The prospection formula exists in the files but is unchecked.
- No "most efficient recipe" ranking: that would need the XP per craft.

## Next recommended actions
Phase 5: XP routes (zones by level, monster XP) and kamas sources (drops, recipes), always without prices.
