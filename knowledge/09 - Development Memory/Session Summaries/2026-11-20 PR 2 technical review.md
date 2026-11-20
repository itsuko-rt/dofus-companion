---
type: session
date: 2026-11-20
---
# 2026-11-20 PR 2 technical review

## What changed
- Engineering review of PR #2 (`develop` → `main`, commit `d3fb282`). No application code changed.
- Full report: `docs/PR2_TECHNICAL_REVIEW.md`.
- Corrected two overstated claims: the [[2026-11-20 Autonomous development session]] (« Où trouver » "~99% resolved") and the monster XP note in `docs/GAME_DATA_INVENTORY.md`.

## Why
The owner asked for a rigorous check of PR #2 before merging, with special attention to monster XP, drop rates, level recommendations and profession calculations.

## Files affected
- `docs/PR2_TECHNICAL_REVIEW.md` (new), `docs/GAME_DATA_INVENTORY.md`.
- Vault: [[Current Status]], this note, [[Session Summaries]], [[2026-11-20 Autonomous development session]].

## Tests performed and results
- Typecheck clean. `npm test`: 88/88. Production build OK.
- E2E: **36 passed, 1 skipped, 1 failed**. The sitemap test timed out at 240 s under 2 parallel workers; re-run alone it passes in 1.8 min. It is a time budget problem, not a broken page.
- Database: `PRAGMA integrity_check` ok; no orphan drop, recipe, boss or Almanax item.
- Measured: item search ~270–320 ms per request; static data routes 8–15 ms.

## Findings (VERIFIED by queries on the game data)
- **Almanax wrong on 81 days of 2026.** Season entries list their days explicitly and win the tie against the day's own entry (e.g. 1 March).
- **Level page shows "0 XP"** for 533 zone monster grades whose XP is 0 in the data. The zone ranking also counts archmonsters, quest monsters and Pwâk event monsters.
- **Craft-demand ranking** only sees each monster's 3 best drops.
- **Quest targets** are parsed back from rendered text and matched by name: 155 ambiguous monster names, 31 ambiguous item names.
- **`world_subarea` excludes dungeons and instances:** 506 of 1,716 placed monsters have no zone.
- **Drop fields not imported:** `specificDropCoefficient` (2,792), `disableDropModificator` (309), `count`, Temporis and global drops. 199 duplicate (monster, item) rows.
- **Profession calculator:** the "% of the level" bar assumes the in-game numbers are per level (UNVERIFIED).
- **Monster XP:** stored values match the game's `getEXP` formula for only 5,447 of 26,851 grades. What players actually earn is UNVERIFIED.

## Remaining issues
- The pre-merge blockers were fixed afterwards: [[2026-11-20 PR 2 pre-merge fixes]].
- PR #2 is not merged; merging is the owner's decision.
- Data foundation gaps that block the planner and optimizer: objective ids, all subareas, full monster grades (resistances), class characteristic costs, foreign keys, an integrity gate after import.

## Next recommended actions
1. Owner: decide on the pre-merge fixes (report §10).
2. A data foundation PR (report §11, step 1) before the equipment builder or the progression planner.
3. An in-game check of monster XP, one profession panel and one spell tooltip.
