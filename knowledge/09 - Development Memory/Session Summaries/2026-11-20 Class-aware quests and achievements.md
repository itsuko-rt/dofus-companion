---
type: session
date: 2026-11-20
---
# 2026-11-20 Class-aware quests and achievements

## What changed
- `src/class-quests.ts`: quests classified from their class condition.
  - Exclusive: 38 quests.
  - Per-class branch: 2 quests.
  - General: everything else.
  - Also gives the character's class quests and class-linked achievements.
- **Quest tracker:**
  - a "Quêtes de classe" panel with statuses;
  - quests exclusive to another class are hidden and left out of totals and region counts. General quests are never hidden.
- **Achievements:** a "Pour votre classe" panel.
- **Fixed** [[Server-only objectives counted as met]]: an empty profile went from 232 achievements in progress to 0.

## Why
Phase 3 of the owner's plan: progression that adapts to the character without hiding general content.

## Files affected
`src/class-quests.ts`, `src/regions.ts`, `src/achievements.ts`, `components/quests/QuestTracker.tsx`, `components/progression/AchievementsView.tsx`, `tests/data.test.ts`, `tests/achievements.test.ts`, `e2e/ui.spec.ts`.

## Tests performed and results
- Typecheck clean; `npm test` 78/78; production build OK.
- E2E 25/25 passed and 1 skipped: the new Iop test is desktop only, because the mobile region list is a drawer.
- The Iop panel shows "Iop et hop", "Ça sent le gaz", "Dévotion à Iop" and "La colère des dieux". Astrub counts 33 quests for an Iop instead of 51.

## Remaining issues
- Links from quest objectives to monster zones and item sources are not done yet; that comes with phase 5, now that monsters are imported.

## Next recommended actions
Phase 4, professions: guides and a calculator based on the XP the game shows (no XP table in the game files).
