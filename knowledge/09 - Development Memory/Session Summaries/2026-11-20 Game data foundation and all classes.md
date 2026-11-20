---
type: session
date: 2026-11-20
---
# 2026-11-20 Game data foundation and all classes

## What changed
- **New import `scripts/creatures-import.ts`:**
  - class details (`breed_info`, plus `src/breed-data.json` for client code);
  - monsters, their grades, zones and drops;
  - the character XP table.
- Wired into `npm run import`. It can also run standalone.
- The professions import no longer drops the `monster` table.
- `components/breeds.ts` is built from the game data, giving 19 classes. Presentation stays in code: colour and Fashionista name, all 19 checked against its API.
- **Onboarding:** a 19-class grid with complexity. Spell pages and sitemap now cover 19 classes.
- Inventory: `docs/GAME_DATA_INVENTORY.md`.

## Why
The owner asked for every playable class, and for an inventory before building XP, kamas and profession tools.

## Files affected
`scripts/creatures-import.ts`, `scripts/import.ts`, `scripts/professions-import.ts`, `src/breed-data.json`, `components/breeds.ts`, `components/character/ClassCard.tsx`, `components/character/Onboarding.tsx`, `components/Home.tsx`, `app/api/builds/route.ts`, `tests/data.test.ts`, `tests/breeds.test.ts`, `docs/GAME_DATA_INVENTORY.md`.

## Tests performed and results
- Typecheck clean; `npm test` 75/75 (new data and class tests); production build OK; E2E 24/24 (the sitemap test now loads 19 spell pages).
- Builds API returns 25 builds for Zobal (`Masqueraider`).
- Screenshots of the onboarding grid and the Huppermage spells.

## Remaining issues
- No profession XP table or XP per craft in the game files: the calculator needs another design (ADR to write in phase 4).
- Monsters and XP are imported but not shown yet.

## Next recommended actions
- Phase 3: class quests and character-aware achievements.
- Phase 4: profession tools.
