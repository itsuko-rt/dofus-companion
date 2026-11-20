# Integration plan — world map and professions

## Principle
Every map feature and every profession figure comes from the official game files, from the same release as the rest of the site (dofus-sqlite `v6.0_3.7.14.18`). When the files do not hold a fact, the interface says so instead of filling the gap.

## Data inventory (verified in the files)

| Need | Source file | Present | Used for |
|---|---|---|---|
| Map geometry | `mapsinformationdata` (posX, posY, subArea, worldMap) | Yes, 6,170 coordinates on the main world | Drawing the zones |
| Zones and regions | `subareasdata`, `areasdata`, `superareasdata` | Yes | Names, levels, region colours |
| Resources per zone | `subareasdata.harvestables` | Yes, but per zone only | Resource layer |
| Exact cell of each gathering spot | Map files (`.dlm`), not in this release | **No** | Not shown; the UI explains why |
| Monsters per zone and their levels | `subareasdata.monsters`, `monstersdata.grades` | Yes | Monster search, zone details |
| Official world-map markers | `hintsdata`, `hintcategoriesdata` | Yes, 679 on the main world | Layers (workshops, dungeons, transport, sale halls…) |
| Zaaps | `waypointsdata` | Yes, 63 | Zaap layer, route shortcuts |
| Quest-giving NPCs per zone | Quest start data, already imported | Yes, by zone (no exact cell) | NPC layer, quests starting in a zone |
| Professions | `jobsdata` | Yes, 22 | Profession journal |
| Unlock level of each resource | `skillsdata` (gatheredRessourceItem, levelMin) | Yes, 125 skills | Level brackets |
| Recipes | `recipesdata` | Yes, 4,743 | Recipe lists, origin of each ingredient |
| Profession XP per harvest or craft | — | **No** | Not shown |
| Prices, spot crowding, "best" farms | — | **No** (would need live or community data) | Not shown |
| Map artwork | `images-worldmap.zip` (Ankama artwork) | Exists | **Not used**: not ours to redistribute |

## Steps (all done)
1. `scripts/world-import.ts` adds 10 tables to the game database: map, area, zone, cell, marker, zaap, job, gather skill, recipe, monster. It runs inside `npm run import`, or alone on an existing database.
2. `src/world.ts` holds the server loaders. `src/world-shared.ts` holds the types and the pure, tested helpers: brackets, route order, outlines.
3. `/carte`: a map drawn in SVG from the coordinates. Layers, search, details, profession filter, route planner, deep links.
4. `/metiers` and `/metiers/[slug]`: every profession, tiers by level, zones, and recipes with where each ingredient comes from.
5. Per character: profession levels (`jobs`) and saved routes (`routes`) in `Character`. They are validated by `sanitizeCharacter` and synced with the account like the rest.
6. Links between the systems: profession → map (job, level, resource), map → profession guide, recipe ingredient → map or crafting profession, character profile → saved routes.
7. Tests: unit tests (route, brackets, outlines, storage, loaders against the real database) and E2E on desktop and mobile.

## Out of scope, and why
- **Phase 7, XP and kamas farming routes for Cra and Pandawa:** these need community data (rates, prices, recommended farms) that is not in the game files. No figures were invented. The data model can take them later as a separate "community" category (see `PROFESSIONS_SYSTEM.md`).
- **Feature flag:** both features are additive (new routes and tables) and leave existing pages untouched. Without the world tables, the pages say "données absentes" and the rest of the site works.
