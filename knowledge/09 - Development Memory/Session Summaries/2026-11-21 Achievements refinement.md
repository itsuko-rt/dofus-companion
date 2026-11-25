---
type: session
date: 2026-11-21
---
# 2026-11-21 Achievements refinement

## What changed
A refinement pass on [[2026-11-21 Achievements visual redesign]]: same layout and logic, more polish, and more game data behind each objective.
- **Entries:**
  - a medallion: the category icon in a disc, inside a ring that fills with the share of objectives met. Obtained achievements get a full green ring, a check badge and a faint green wash on the row; « À confirmer » gets a star badge;
  - the points sit in a pill whose colour follows a **tier** taken from the game's own point values: plain for 0–5, bronze for 10, silver for 20–30, gold for 40 and more;
  - the state line reads, for example, « En cours · 1/2 »;
  - the level shows once, and the category path only outside the category itself;
  - the rows are tighter than before.
- **Detail sheet:**
  - an « at a glance » strip: what is left (« Reste 1 objectif sur 2 », or « Obtenu ») and the reward;
  - « Ce qu’il faut faire »: each objective is a small card with a distinct status mark (solid green check when met, hollow circle when to do, dashed purple circle when to verify);
  - the objective's **place** when the game data names it: the monster's level range and the zones it lives in, a zone's region and level, or a dungeon's level, with « voir ce niveau ».
- **Links:**
  - in « Où aller », clickable rows: quests (with their status), dungeons (to the level page at the dungeon's level) and Dofus (to `/guides/dofus/<slug>`);
  - « voir ce niveau » and the dungeon rows open the level page through the new `?niveau=N` parameter.
- **Rewards** are tiles; achievement points come first, in gold.
- **Completion footer** says what to do: confirm when every objective is met, or « Je l’ai obtenu » with one line of explanation. An obtained achievement shows a green « Obtenu » banner, where the change came from and an undo button.
- **Sidebar:**
  - an icon tile and a small completion ring for each category;
  - a gold gradient and edge on the active category;
  - names are no longer cut: « La Source » now shows « L’Héritage des Dofus » on a second line.
- **Data:** `buildAchievements` adds `place` to objectives. It comes from an exact name match, using an index built once per database: 2,632 objective rows match a monster name, 208 a zone and 85 a dungeon. It also turns `dofus` into `{ name, slug }`. `dofusSlugs` moved to `src/load.ts`, and `src/guides-data.ts` re-exports it.
- **Caching:** the page adds `v=2` to the achievement API URLs. Browsers keep those responses for an hour, and the `dofus` field changed shape.

## Why
The owner asked for a refinement of the new design. They wanted more compact and distinctive entries, clearer objectives and statuses, nicer rewards, clickable references, a lighter sidebar without truncation, and a new player able to see at once what is required, what is left, where to go and what it pays.

## Files affected
- `components/progression/AchievementCard.tsx`: `Medal`, `Points`, `PlaceLine`, the detail sheet.
- `components/progression/AchievementsView.tsx`: sidebar (`MiniRing`), list style, `API_V`.
- `components/progression/LevelView.tsx`: reads `?niveau=`.
- `src/load.ts`: `ObjectivePlace`, `placeIndex`, `dofusSlugs`.
- `src/guides-data.ts`: re-export of `dofusSlugs`.
- `tests/data.test.ts`: a new places and slug test. The batched-loading test now compares the original objective fields, because `place` is added.
- `e2e/ui.spec.ts`: a new `?niveau=` test; the details heading is now « Ce qu’il faut faire ».
- Vault: [[API Documentation]], [[03 - DEVELOPMENT STATUS]], [[Design Decisions]].

## Tests performed and results
- Typecheck clean. `npm test`: 98/98. Production build OK.
- Full E2E, desktop and mobile: **49 passed, 1 skipped** by design, 0 failed.
- The first E2E run failed twice, desktop and mobile, on the renamed « Objectifs » heading. The test now checks the new heading.
- Screenshots at 1440 px and 375 px:
  - category list with an obtained entry;
  - side panel for a dungeon achievement and a monster achievement;
  - inline sheet on a phone, with no horizontal overflow (scroll width 375 = viewport).
- « voir ce niveau » opened `/progression/niveau?niveau=176`, with Catacombres listed.
- Fixed during the pass:
  - an obtained achievement said « Reste 1 objectif »;
  - the place line was hidden for a monster objective whose condition points to a non-quest node;
  - reward names were cut off.

## Remaining issues
- Places come from exact name matches. A homonym (a zone named « Lac » exists several times) shows merged regions and levels. A monster and a zone with the same name show as the monster.
- Zones have no page of their own, so they link to the level page at their level, not to the zone itself.
- Tiers are presentation only. The game has no such notion.

## Next recommended actions
1. Owner: check a few monster and zone objectives in game for the « vit à » zones.
