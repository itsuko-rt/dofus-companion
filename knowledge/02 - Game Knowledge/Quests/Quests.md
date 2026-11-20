---
type: research
topic: Quests
source_name: Game files via dofus-sqlite
source_url: https://github.com/ledouxm/dofus-sqlite/releases/tag/v6.0_3.7.14.18
source_type: game-files
game_version: "3.7.14.18"
researched: 2026-11-19
last_verified: 2026-11-20
confidence: high
verification: VERIFIED
---

# Quests

| Fact (3.7.14.18) | Value |
|---|---|
| Quests / steps / categories | 1,984 / 2,233 / 44 |
| Graph nodes / edges | 5,050 / 5,607 (`requires` 4,427, `excludes` 236, `any_of` 228, `in_dungeon` 716) |
| Quests whose conditions are fully interpreted | 1,363 / 1,984 |
| Quests with a Dofus Pour Les Noobs link (exact title match) | 1,390 / 1,984 |
| Longest `requires` chain | starts at quest 55 "Entraînement avec Tarche" (see `data/report-3.7.14.18.json`) |

**Start conditions:** each quest's `startCriterion` uses codes such as `PL` (level), `Qf` (quest done), `Qa` (quest active), `OA` (achievement). Meanings: [[Game Mechanics#Condition codes]].

**Known limits** (`docs/RAPPORT_SUIVI_QUETES.md` §4):
- Frigost and Vulkania chains are very wide;
- the 390 Almanax quests aren't linked to dates;
- "one of" prerequisites can't be auto-ticked.
