# Professions — guide and tracker

Pages: `/metiers` (journal of all professions) and `/metiers/[slug]` (one profession). Components: `components/professions/*`. Data: `loadJobs`, `loadJob` (`src/professions.ts`) and `GET /api/professions/:slug`.

## Professions covered
All 22 professions in the game data (`jobsdata`, the "Base" entry excluded), grouped by what the data shows they do:
- **Récolte (gathering):** Bûcheron, Mineur, Paysan, Alchimiste, Pêcheur. The 8 professions named in the brief are all here.
- **Artisanat (crafting):** Bijoutier, Cordonnier, Tailleur, Forgeron, Sculpteur, Façonneur, Bricoleur, Chasseur, Éleveur.
- **Forgemagie (smithmagic):** the "-mage" professions. The data has no recipes for them, so their page says so.
- **Autres (other):** professions with neither harvesting nor recipes in the data.

## Gathering guide
- **Tiers:** each harvesting skill gives a resource and its unlock level (`skillsdata.levelMin`). The guide turns them into brackets, where a resource is the newest one from its level until the next unlock (`brackets`, tested). This is the game's own progression. For Lumberjack: Ash 1, Chestnut 20, Walnut 40, Oak 60, Bombu 70, Maple 80, Oliviolet and Pine 90, … up to Aspen and Aquajou at 200.
- **Where:** the zones whose data lists the resource, with region, level and zaap. For locating them on a map, the guide links to /carte, which points to external map tools.
- **Now and next:** at the character's level, the page shows what to gather now, the next unlock, and how many levels remain. "J'ai atteint le niveau N" moves to the next bracket.

## Crafting guide
- Every recipe of the profession comes with its level and ingredients. For each ingredient, the page says where it comes from:
  - harvested: the profession and level, plus a link to that profession;
  - crafted: the profession and level, plus a link to that profession;
  - neither: "butin ou achat" (monster loot, shop or quest).
- Search, a "jusqu'à mon niveau" filter, and pages of 40 recipes. The first 40 are in the HTML; the rest (up to 735) loads from the API, which keeps the Tailor page at 78 KB instead of 604 KB.

## Per-character tracking
- `Character.jobs`: profession level per job id, 1–200.
- It is validated by `sanitizeCharacter` (tested) and synced with the account like the rest of the character. Each character has its own levels (E2E test "independent per character").

## Data categories (never mixed)

| Category | Here |
|---|---|
| Official game data | Professions, tiers, zones, recipes, monsters, markers. Version and import date shown on the pages |
| Personal progression | Profession levels and routes, stored on the character |
| Editorial or community advice | **None yet.** If added, it should go in its own table with source, date and confidence, and be labelled as such |
| Market prices | **None.** No reliable live source |

## Not shown, on purpose
These are missing from the game files, and guessing them would mislead:
- XP per harvest or craft;
- how crowded each spot is;
- prices and the cost of a craft;
- whether crafting levels a profession faster than gathering;
- which resources are worth keeping or selling.

The pages state this next to the tiers and recipes.

## XP and kamas routes (phase 7)
Not implemented. Farming routes, XP or kamas rates and dungeon recommendations for Cra and Pandawa would need community or measured data. None was found in a form that could be checked and versioned here.
- **What is ready:** zones with level and zaap, recipes, per-character profession levels.
- **What adding it would take:** a `community_guide` table (source URL, game version, checked date, confidence) displayed separately from the official data.
