---
type: session
date: 2026-11-20
---
# 2026-11-20 PR 2 pre-merge fixes

## What changed
Fixed the four pre-merge blockers of the [[2026-11-20 PR 2 technical review]]. Full detail, root causes and before/after: `docs/PR2_TECHNICAL_REVIEW.md` §12.
- **Almanax (H1):** a season listing its days explicitly no longer replaces the day's offering (2026: 81 wrong days → 0). The season stays visible as a period bonus.
- **Level page XP (H2):** XP 0 in the files means "not set". It shows "XP non renseignée", never 0.
- **Level page zones (H2):** archmonsters, quest monsters (incl. Pwâk), wanted-notice targets, Dopeuls and summons are left out of the zone lists only; they stay in the database.
- **Demand ranking (H3):** uses every unconditional drop. Real impact was small (1 new top-10 entry at level 60).
- **Sitemap E2E (M9):** 6 batches; full suite 6.0 → 4.1 min, no failure.

## Why
The owner asked for trustworthy data before merging PR #2 and before building the equipment optimizer and progression planner on it.

## Files affected
`src/almanax-shared.ts`, `src/zones.ts`, `src/zones-shared.ts`, `components/progression/LevelView.tsx`, `e2e/ui.spec.ts`, `tests/almanax.test.ts`, `tests/data.test.ts`, `docs/PR2_TECHNICAL_REVIEW.md`, `docs/GAME_DATA_INVENTORY.md`, [[Current Status]], [[Feature Backlog]].

## Tests performed and results
Two full runs, the second on the clean commit `25f2a8a`:
- Typecheck exit 0. `npm test` 90/90. Build exit 0.
- E2E: 47 passed, 1 skipped (mobile skip by design), 0 failed, 4.1 and 5.4 min. Sitemap batches took at most 53.9 s against a 120 s budget.
- Integrity check ok; 0 dangling references; database not rewritten, counts unchanged.
- The new real-data tests fail on the old code and pass on the new.
- The Almanax test covers all 730 days of 2026–2027, including 21 December and the period bonuses.
- Summons: all 25 "Invocations…" races are matched, and no summon appears in a zone (preventive in 3.7.14.18: none was placed in a world zone).
- Exact commands and both runs: `docs/PR2_TECHNICAL_REVIEW.md` §12.2; H3 payload and E2E measurements: §12.2b.

## Remaining issues
- **Not verified in game:** monster XP meaning (M6), the profession progress % (M5).
- **Future architectural work (data foundation):** objective ids (M2), all subareas (M3), drop fields (M4), static 503 (M7), importer structure (M8), L1–L8.
- Event-only zones (Nowel) are still listed; no game-data flag found.

## Next recommended actions
1. Owner: review and merge PR #2.
2. Data foundation PR (report §11, step 1) before the optimizer or the planner.
3. In-game checks of monster XP, a profession panel, a spell tooltip.
