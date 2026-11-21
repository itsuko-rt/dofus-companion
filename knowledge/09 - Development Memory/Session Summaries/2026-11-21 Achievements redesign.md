---
type: session
date: 2026-11-21
---
# 2026-11-21 Achievements redesign

## What changed
The Succès page (`/progression/succes`) was rebuilt for players who don't know how DOFUS achievements are organised.
- **"Pour vous" landing** (the default). Each list shows why an achievement is there:
  - « À confirmer »: every objective is met;
  - « Presque terminés »: real progress from quests, achievements or ticked boxes; a level condition alone does not count. Temporis and events are left out, and there are at most 2 per category;
  - « Pour votre classe »;
  - « À votre niveau »: main progression, level −10/+5, at most 3 per category;
  - « Derniers obtenus ».

  A short « Par où commencer ? » guide shows until something is marked.
- **Navigation:** the game's 15 root categories are grouped into 3 families: main progression (Quêtes, Exploration, Monstres, Donjons, Métiers, Général), activities, and events plus seasonal servers (Temporis). Each category has a one-line explanation, and sub-categories are chips instead of a dropdown. On mobile, a « Parcourir » button opens the list. The view lives in the URL (`?c=…&s=…`), so the browser's back button works.
- **One search** (server-side, accent-insensitive) over names, objective texts (monsters, quests, places), dungeons, categories and descriptions. Each result says what matched.
- **Cards** have 5 states, each with an icon and a label: Obtenu, À confirmer, En cours, À faire, and Plus tard (more than 10 levels above the character). Details open in place: objectives, « Où aller » (quests with their status, dungeons from the game data, Dofus), rewards, guide link and the confirm actions.
- **Filters:** by state, « Jusqu'au niveau N », sort by level, progress or points. Big categories are still paged by 100.

## Why
The old page opened on a long category list, with Temporis (754 achievements of a seasonal server) shown as prominently as the main progression. Its search only covered names, and nothing said where to start or why an achievement mattered.

## Files affected
- `src/achievement-guide.ts` (new): families, hints, display states, recommendations.
- `src/load.ts`:
  - `buildAchievements` (shared);
  - `loadAchievementsByIds`;
  - `searchAchievements`, with an in-memory index built once per database;
  - `dungeons` on every achievement.
- `app/api/achievements/route.ts` (`?ids=`) and `app/api/achievements/search/route.ts` (new); see [[API Documentation]].
- `components/progression/AchievementsView.tsx` (rewritten) and `components/progression/AchievementCard.tsx` (new).
- Tests: `tests/achievement-guide.test.ts` (new), real-data search tests in `tests/data.test.ts`, and two rewritten Succès tests in `e2e/ui.spec.ts`.
- Vault: [[Current Status]], [[Design Decisions]], [[API Documentation]].

## Tests performed and results
- Typecheck clean. `npm test`: **97/97**.
- Production build OK.
- `npx playwright test` (desktop and mobile): **47 passed, 1 skipped** by design (the class test is desktop-only), 0 failed.
- The first full run found a real bug: « Par où commencer ? » never showed for a level-50 character, because level conditions counted as progress. It was fixed and the suite re-run.
- Screenshots reviewed on desktop (1366 px) and mobile (390 px): no horizontal overflow, no page errors. They also exposed the first version of « Presque terminés », which was filled with dungeon variants met only by level; that is fixed.
- Measured on the production build, locally:
  - « Pour vous » ready in 0.9–1.6 s on a cold load (it includes the quest-graph download that the old page already did);
  - a category list loads in 44–64 ms;
  - a search takes 4–7 ms on the server once its index is built (40 ms the first time).

## Remaining issues
- Recommendations use the data's achievement level and objective conditions only. Many objectives (monsters, items) can only be ticked by the player, so « Presque terminés » cannot see them until they are ticked.
- « Plus tard » is our presentation (achievement level more than 10 above the character), not a game lock.
- Category hints exist for 11 of the 15 root categories. The other 4 (Kolizéum, Songes Infinis, Anomalies Temporelles, La Source) get none rather than an invented one.

## Next recommended actions
1. Owner: try the page with a real character and say which lists are useful.
2. Possible follow-up: the quest drawer could link back to the achievements that need the quest (the data link already exists in the graph).
