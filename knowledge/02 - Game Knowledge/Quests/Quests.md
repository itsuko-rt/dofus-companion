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

## Class-specific quests (VERIFIED, 3.7.14.18, checked 2026-11-20)
40 quests have a class condition (`PG=<breed id>`). Every one of the 19 classes has:
- an Astrub class quest (level 12–20, after "Conseil de classe", 2009);
- a temple "Dévotion à …" (level 30, after quest 1958, subscribers only).

Two more quests have a per-class branch: "Ça sent le gaz" (1960) and "La colère des dieux" (1938).

**On the site (since 2026-11-20, `src/class-quests.ts`):** once a character has a class, the quest tracker lists its 4 class quests with their status and hides only the quests *exclusive* to another class (also left out of region counts). General quests and per-class-branch quests are never hidden. With no class chosen, nothing is hidden.

Data quirk: quest 775 is named "Dévotion à Sadida" but is the Zobal one (`PG=14`). It is shown as in the game files. The game data does not say which *general* quests suit a class; that would be COMMUNITY advice. Details: `docs/GAME_DATA_AND_PRODUCT_AUDIT.md` §3.

**Known limits** (`docs/RAPPORT_SUIVI_QUETES.md` §4):
- Frigost and Vulkania chains are very wide;
- the 390 Almanax quests aren't linked to dates;
- "one of" prerequisites can't be auto-ticked.
