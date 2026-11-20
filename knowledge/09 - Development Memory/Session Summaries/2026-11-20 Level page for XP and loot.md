---
type: session
date: 2026-11-20
---
# 2026-11-20 Level page for XP and loot

## What changed
- `scripts/creatures-import.ts` imports the game's activity suggestions that have a level (`activity`, 667 rows), placed by map → zone.
- `src/zones.ts` (server loader) and `src/zones-shared.ts` (types and the `forLevel` filter). There is a static `/api/zones`.
- **New page `/progression/niveau`** with a "Mon niveau" tab:
  - game suggestions by category;
  - the 12 zones with the most monsters at the level, with base XP, unconditional drops (base chance) and harvests;
  - dungeons by minimum and recommended level.
- Drops with a game condition (events, quests) are left out of zone loot. Before that, event items such as Pollenectar showed at 100% everywhere.

## Why
Phase 5 of the owner's plan: XP and kamas routes for solo players, from verified data only.

## Files affected
`scripts/creatures-import.ts`, `src/zones.ts`, `src/zones-shared.ts`, `app/api/zones/route.ts`, `app/progression/niveau/page.tsx`, `components/progression/LevelView.tsx`, `components/progression/ProgressionTabs.tsx`, `app/sitemap.ts`, `tests/data.test.ts`, `e2e/ui.spec.ts`.

## Tests performed and results
- Typecheck clean; `npm test` 81/81; production build OK.
- E2E 28/28 passed and 1 skipped: the new level test checks that the game's "Donjon des Forgerons" suggestion appears at 50 and not at 200.
- Screenshot at level 60.

## Remaining issues
- No XP per hour, prices or profit: they are not in the game files.
- Zone ranking only counts matching monsters.
- The place of "Recherché" suggestions is the map the game gives, sometimes a notice board.
- The class does not change these lists (no link in the data).

## Next recommended actions
Phase 6: UX consistency, logo and favicon, mobile, remaining performance (first Quêtes load).
