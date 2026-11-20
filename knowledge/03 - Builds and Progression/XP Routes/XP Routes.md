---
type: research
topic: XP routes
source_name: none found
source_url: none
source_type: none
game_version: "3.7.14.18"
researched: 2026-11-19
last_verified: 2026-11-20
confidence: low
verification: HYPOTHESIS
---
# XP Routes

**Status (2026-11-20): partly implemented from game data, still no XP rates.** `/progression/niveau` ("Que faire à mon niveau", `src/zones-shared.ts`) shows, for a level: the game's own activity suggestions (dungeons, quests, archmonsters, wanted monsters, discoveries); the zones whose monsters match the level, with their base XP and unconditional drops (base chance) plus harvestable resources; and the dungeons by minimum and recommended level. It ranks zones only by how many matching monsters they have. **Not shown, because it is not in the game files:** XP per hour, prices, profit. The character's class does not change these lists (no class link in the data).

Earlier status: not implemented, no verified data.

From `docs/PROFESSIONS_SYSTEM.md` (phase 7): farming routes and XP rates for Crâ and Pandawa would need community or measured data. None was found in a form that could be checked and versioned.

## What would make it possible
- **Storage:** a `community_guide` table (source URL, game version, checked date, confidence), shown separately from official data.
- **Inputs available today:** zone levels, dungeon levels, recipes and resource unlock levels.
- **Rule:** never compute rates or profits without a measured, dated source.

Add research here with [[Research Template]], labelled COMMUNITY or HYPOTHESIS until verified.
