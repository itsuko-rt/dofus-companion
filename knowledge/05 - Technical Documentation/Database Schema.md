# Database schema

*Read from the databases on 2026-11-20 (game data 3.7.14.18).*

## Game database: `data/game-<version>.sqlite`
Rebuilt from scratch by the import and read-only at runtime. Primary keys are Ankama's own ids.

| Table | Rows | Content |
|---|---|---|
| `game_version`, `data_source` | 1 / 4 | Version and provenance of each dataset (URL, retrieval date) |
| `quest`, `quest_step`, `quest_start`, `quest_category` | 1,984 / 2,233 / 1,984 / 44 | Quests, steps with objectives and rewards, start NPC and zone, categories |
| `node`, `edge` | 5,050 / 5,607 | Prerequisite graph (`requires`, `any_of`, `excludes`, `in_dungeon`) |
| `achievement`, `achievement_objective`, `achievement_category` | 2,777 / 8,936 / 134 | Achievements and their official conditions |
| `dungeon`, `dungeon_boss`, `dungeon_achievement` | 187 / 141 / 716 | Dungeons |
| `dofus` | 34 | Each Dofus and the quests or achievements that give it |
| `breed`, `spell`, `spell_level` | 19 / 862 / 1,786 | Classes, spells, grades (AP, range, cooldowns, effects) |
| `item`, `item_set`, `item_type`, `characteristic` | 21,622 / 941 / 236 / 123 | Items (from dofusdude), sets, types, characteristics |
| `external_guide`, `achievement_guide` | 1,390 / 334 | Links to Dofus Pour Les Noobs tutorials (exact title match) |
| `job`, `gather_skill`, `recipe` | 22 / 125 / 4,743 | Professions, harvested resources with unlock level, recipes |
| `world_area`, `world_subarea` | 70 / 254 | Regions and zones with their harvestable resources and zaap (professions guide) |

The map tables (`world_cell`, `world_hint`…) were dropped on 2026-11-20 with the in-site map.

## Account database: `data/app.sqlite`
Migrations live in `src/server/appdb.ts` (forward only). SQL copies are in `migrations/`.

| Table | Columns | Notes |
|---|---|---|
| `users` | id, email (unique, case-insensitive), password_hash (scrypt), created_at, plan | `plan` is always `free` for now |
| `sessions` | token_hash (SHA-256), user_id, created_at, expires_at | 30 days; `ON DELETE CASCADE` |
| `password_resets` | token_hash, user_id, expires_at, used_at | 60 minutes, single use |
| `characters` | id, user_id, name, data (JSON), updated_at | Primary key `(user_id, id)`, so two users can't collide |
| `login_failures` | key (SHA-256 of e-mail and/or IP), at | Throttling; purged after 1 hour |
| `schema_migrations` | version, applied_at | |

Backups: see [[Infrastructure#Backups]].
