---
type: session
date: 2026-11-20
---
# 2026-11-20 Autonomous development session

With the owner's full authorization: commit, push and open PRs; no merge, no deployment.

## What changed (after phases 0–6)
| Feature | Where |
|---|---|
| Phases 0–6 committed as 9 reviewable commits on `develop`; PR #2 into `main` opened (not merged) | Git |
| First Quêtes visit: graph data and graph view warmed on idle from other pages; no loading frame on revisits | `components/Nav.tsx`, `components/quests/useGame.ts` |
| Quest drawer « Où trouver »: zones of objective monsters, sources of objective items (exact game names, ~99% resolved) | `src/objective-targets.ts`, `loadQuestDetails` |
| Item sources shared by professions, quests and equipment | `itemSources` in `src/professions.ts`, `components/professions/SourceLabel.tsx` |
| Equipment cards « Obtention »: recipe with ingredients, or dropping monsters | `searchItems`, `components/equipment/EquipmentView.tsx` |
| Class pages: official description, complexity, class quests with links, linked achievements, then spells | `loadClassExtras`, `components/SpellGuide.tsx` |
| Almanax du jour (home): offering, its source, bonus, period bonuses, next 6 days; new `almanax` table | `src/almanax-shared.ts`, `components/AlmanaxCard.tsx` |
| Level page: zone loot ranked by craft demand (number of game recipes using it), no prices | `src/zones-shared.ts` |
| Recipes « Avec vos métiers »: recipes the character can supply with its own profession levels | `selfSufficient` in `src/professions-shared.ts` |
| Home quest counts follow the character's class, like the tracker | `components/Home.tsx` |

## Why
The owner asked for continuous development of classes, quests, professions, XP and kamas, performance and UX, from verified data only.

## Tests performed and results
- Each feature has a unit or data test and an E2E test.
- End state: typecheck clean, `npm test` 88/88, production build OK, `npx playwright test` 37 passed and 1 skipped (desktop-only check).
- Mobile check at 375 px: no horizontal overflow on 7 pages (home, level, class, profession, equipment, achievements, profile).
- **First Quêtes visit at 4× CPU**, median of 3, same-time comparison: 730 → 580 ms to content, blocked main thread 461 → 203 ms.

## Remaining issues
- Not in the game files, so not shown: profession XP table, XP per craft, prices, XP per hour, profit.
- Prospection is not applied to drop chances; its formula is in the files but unchecked.
- The graph view's first render is still the main cost of the first Quêtes visit.
- `develop` contains everything; `main` does not until PR #2 is merged.

## Next recommended actions
1. **Owner:** review and merge PR #2 (or ask for changes); decide on deployment (see [[Release Checklist]]).
2. Character profile: class quest progress and profession levels at a glance.
3. Quêtes: lighter graph rendering for large regions, or a list view for small ones.
4. Check the prospection formula against in-game drops before showing adjusted chances.
