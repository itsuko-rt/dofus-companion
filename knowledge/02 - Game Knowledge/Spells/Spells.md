---
type: research
topic: Spells
source_name: Game files via dofus-sqlite
source_url: https://github.com/ledouxm/dofus-sqlite/releases/tag/v6.0_3.7.14.18
source_type: game-files
game_version: "3.7.14.18"
researched: 2026-11-19
last_verified: 2026-11-20
confidence: high
verification: VERIFIED
---

# Spells

- **Database:** 862 spells and 1,786 levels (grades) in 3.7.14.18, in `spell` and `spell_level`: AP cost, range, critical chance, casts per turn and per target, cooldowns, effects.
- **Effects:** the import report shows 0 undocumented spell effects. Effect texts are rendered by `src/effects.ts`.
- **Elements:** `src/spells.ts` (`spellElements`) gives a spell's elements, used for "sorts à jouer avec ce build".
- **Per class:** [[Cra]] · [[Pandawa]].
