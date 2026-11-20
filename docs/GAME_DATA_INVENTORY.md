# Game data inventory (Dofus Unity 3.7.14.18, checked 2026-11-20)

**Single source:** the dofus-sqlite release `v6.0_3.7.14.18`. It is extracted from the Dofus 3 (Unity) client, the same version for every file. Items and sets come from dofusdude `3.7.14.18` (same game version; see ADR-0001 in the vault). **No Retro or Touch data is used.**

The release has 250 files. This table lists the ones that matter for the site, checked by script (counts are rows).

| Domain | File (rows) | In the game DB | Site use |
|---|---|---|---|
| Classes | `breedsdata` (19), `breedrolesdata` (8) | `breed`, **`breed_info`** (title, description, complexity, roles), `src/breed-data.json` | All 19 classes (since 2026-11-20) |
| Spells | `spellsdata`, `spellvariantsdata`, `spelllevelsdata`, `spellstatesdata`, `effectsdata` | `spell` (862), `spell_level` (1,786) | Spell pages for 19 classes |
| Items | dofusdude `items`, `item_sets`; `itemtypesdata`, `characteristicsdata` | `item` (21,622), `item_set` (941), `item_type`, `characteristic` | Equipment, build stats |
| Quests | `questsdata`, `queststepsdata`, `questobjectivesdata`, `queststeprewardsdata`, `questcategoriesdata`, `npcsdata` | `quest` (1,984), `quest_step`, `quest_start`, `node`/`edge` | Quest tracker, guides |
| Achievements | `achievementsdata`, `achievementobjectivesdata`, `achievementrewardsdata`, `achievementcategoriesdata` | `achievement` (2,777), `achievement_objective` (8,936) | Achievements, scanner |
| Dungeons | `dungeonsdata` | `dungeon` (187), `dungeon_boss`, `dungeon_achievement` | Graph links |
| Monsters | `monstersdata` (5,135), `monsterracesdata` (266) | **`monster`, `monster_grade` (26,851: level, XP, life), `monster_subarea` (3,305), `monster_drop` (13,567: chance per grade, condition)** | Recipe ingredient sources, level page (2026-11-20) |
| Character XP | `characterxpmappingsdata` (2,339) | **`xp_level`** (levels 1–200) | Imported 2026-11-20; not shown yet |
| Professions | `jobsdata`, `skillsdata`, `recipesdata`, `mapsinformationdata`, `subareasdata`, `areasdata`, `superareasdata`, `waypointsdata` | `job` (22), `gather_skill` (125), `recipe` (4,743), `world_subarea` (254) | Professions guide |
| Formulas | `luaformulasdata` (38 Lua scripts) | — | Read only (see below) |
| Activities | `activitysuggestionsdata` (1,410: level, map, category), `activitysuggestioncategoriesdata` | **`activity`** (667 with a level, no event dates) | Level page `/progression/niveau` (2026-11-20) |
| Almanax | `almanaxcalendarsdata` (376: day pattern, NPC, objective), `questobjectivesdata` | **`almanax`** (376, offering item and quantity) | Home card « Almanax du jour » (2026-11-20) |

## Relationships that can be followed
- **Class → quests:** start conditions with `PG=<class>` (40 quests). Class → spells: `spell.breed_id`.
- **Quest → quest / achievement:** the condition graph (`node`, `edge`).
- **Monster → zone:** `monster_subarea`, then `world_subarea` (level, area). **Monster → item:** `monster_drop`. **Item → recipe → profession:** `recipe`, `gather_skill`.
- **Dungeon → boss monster:** `dungeon_boss`. **Dungeon → achievements:** `dungeon_achievement`.

## Checks (in `tests/data.test.ts`)
- Every class has its official title, description, complexity and roles.
- Character XP: level 2 = 110, level 200 = 5,555,424,000, strictly increasing.
- Monster grades, zones and drops point to existing monsters. Example: Bouftou drops "Laine de Bouftou" at 53% for every grade.
- Monster grade XP matches the game's `getEXP` formula for only 4,745 of 18,500 grades below level 200. **The stored XP is used, never the formula.**

## Missing from the game files (not invented)
| Wanted | Status |
|---|---|
| **Profession XP table** and **XP per craft or harvest** | Not in any file. One unlabelled Lua formula (`3.795 × lvl^2.329`) may be a job XP curve: HYPOTHESIS, not used. A profession XP calculator therefore needs the XP numbers the game shows to the player (see the backlog) |
| Market prices, kamas profitability | Not in the game files. They would need a dated external source |
| Drop rates after prospection | The base chances are in the data. The prospection formula (`luaformulasdata`) is present but not yet checked against the game |
| "Recommended" general quests per class | Not in the data. Community advice only |
| Monster-to-map placement | Zones only (sub-areas), not exact maps |
