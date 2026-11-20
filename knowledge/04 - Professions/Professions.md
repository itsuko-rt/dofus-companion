---
type: research
topic: Professions
source_name: Game files via dofus-sqlite
source_url: https://github.com/ledouxm/dofus-sqlite/releases/tag/v6.0_3.7.14.18
source_type: game-files
game_version: "3.7.14.18"
researched: 2026-11-19
last_verified: 2026-11-20
confidence: high
verification: VERIFIED
---

# Professions

- **Site:** `/metiers` (all professions) and `/metiers/[slug]` (one profession): gathering tiers, zones, recipes with ingredient origin, and the character's level. System description: `docs/PROFESSIONS_SYSTEM.md`.
- **Data:** `job`, `gather_skill`, `recipe`, `world_subarea` in the game database, imported by `scripts/professions-import.ts`.
- **XP calculator (2026-11-20):** on every profession page. The player enters current XP, next-level XP and XP per craft, as the game shows them. The site computes the crafts and the total ingredients for a chosen recipe. There is no XP table in the game files ([[ADR-0007 Profession XP comes from the player's screen]]).
- **Loot ingredients:** up to 3 monsters that drop them, with the base chance before prospection (`monster_drop`). About 91% of the Tailleur loot ingredients have one.

| Profession | French | Kind | Note |
|---|---|---|---|
| Farmer | Paysan | gathering | [[Farmer]] |
| Lumberjack | Bûcheron | gathering | [[Lumberjack]] |
| Miner | Mineur | gathering | [[Miner]] |
| Alchemist | Alchimiste | gathering | [[Alchemist]] |
| Fisherman | Pêcheur | gathering | [[Fisherman]] |
| Jeweller | Bijoutier | crafting | [[Jeweller]] |
| Shoemaker | Cordonnier | crafting | [[Shoemaker]] |
| Tailor | Tailleur | crafting | [[Tailor]] |

The game has 22 professions; the site lists all of them, and these eight are documented here.

**Labels:**
- resource unlock levels, zones and recipes are VERIFIED (game files);
- which resource is worth gathering or selling is not in the data, and nothing is claimed about it.

**Limit:** the files say which **zones** have a resource, not which maps, and give no spot counts.
