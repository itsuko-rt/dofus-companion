---
type: research
topic: Achievements
source_name: Game files via dofus-sqlite
source_url: https://github.com/ledouxm/dofus-sqlite/releases/tag/v6.0_3.7.14.18
source_type: game-files
game_version: "3.7.14.18"
researched: 2026-11-19
last_verified: 2026-11-20
confidence: high
verification: VERIFIED
---

# Achievements

- **Size:** 2,777 achievements, 8,936 objectives, 134 categories.
- **Objectives:** use the same condition language as quests.
- **Site:** objectives are deduced from the official conditions when possible, otherwise ticked by hand, with provenance history (`docs/RAPPORT_SUCCES_SCAN.md`).
- **Server-only objectives:** 232 objectives are only `Sc=<id>`, tracked by the server. They count as "to check in game", never as met ([[Server-only objectives counted as met]]).
- **Class links (VERIFIED, 2026-11-20):** for every class, "L'armée des morts" and "Un citoyen modèle" need its class quests. "Dopeul <class>" and "Challenge <class>" are named after it, with no class condition: related, not restricted. They are shown under "Pour votre classe" (`classAchievements` in `src/class-quests.ts`).
- **Tutorials:** 334 achievements link to a Dofus Pour Les Noobs guide (`achievement_guide`).
- **No official personal-progress API exists** (`developer.ankama.com` doesn't resolve; character pages refuse automated requests), so progress comes from the player or the scanner.
