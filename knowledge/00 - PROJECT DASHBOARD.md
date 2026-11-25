---
type: dashboard
updated: 2026-11-25
---
# Atlas des Douze — project dashboard

The entry point to the vault. Atlas des Douze is a free companion site for DOFUS (Unity, game version **3.7.14.18**). It tracks quests, achievements and Dofus, shows builds, professions and an encyclopaedia, and computes everything from the official game files. It is a fan site, not affiliated with Ankama. More: [[Project Overview]] · [[Vision and Goals]].

> **Now (2026-11-25):** pre-launch, not deployed. Checked today: typecheck clean, 108/108 unit tests. Last E2E run (2026-11-23): 63 passed, 1 skipped by design, 0 failed.
> Work waiting on the owner:
> - the scanner's real-game test;
> - merging `feature/atlas-ecosystem` → `develop` → `main`;
> - the launch decisions.
>
> Details: [[03 - DEVELOPMENT STATUS]].

## The seven project notes
| Note | Answers |
|---|---|
| [[01 - PROJECT ROADMAP]] | What is planned, in what order, and what is blocked |
| [[02 - PROJECT ARCHITECTURE]] | How it works: map of the technical notes |
| [[03 - DEVELOPMENT STATUS]] | What is built and tested, what is in progress, known limits |
| [[04 - TECHNICAL DEBT]] | Known weaknesses in the code and data, with where they are |
| [[05 - DOCUMENTATION INDEX]] | Every note and every report in `docs/` |
| [[06 - CLEANUP REPORT]] | How this vault was reorganised on 2026-11-25 |

## What is built (implemented and tested)
| Module | Pages | Notes |
|---|---|---|
| Quests: prerequisites, chain graph, tracker | `/progression/quetes` | 621 quests have conditions shown as « à vérifier en jeu »: [[03 - DEVELOPMENT STATUS#Known limitations]] |
| Achievements journal (Succès) | `/progression/succes` | Redesigned on 2026-11-21: [[Achievements]] |
| Dofus planner, level page | `/progression/dofus`, `/progression/niveau` | [[2026-11-20 Level page for XP and loot]] |
| Scanner: screenshot or shared window | `/progression/scan` | Saves what it reads with certainty. **Not measured on real DOFUS screens**: [[Character Sync OCR]] |
| Encyclopaedia: monsters, items, dungeons, zones, sets | `/encyclopedie` | [[Ecosystem Architecture]] |
| Atelier and drop odds | `/metiers/atelier` | [[Ecosystem Architecture]] |
| Companion window | `/compagnon` | Not checked above the real game yet: [[Companion Window]] |
| Characters, spells of all 19 classes, builds, equipment | `/personnage`, `/builds`, `/equipement` | Build quality is COMMUNITY: [[Builds and Progression]] |
| Professions and XP calculator | `/metiers` | [[Professions]] |
| Almanax of the day | home page | [[Data Pipeline]] |
| Accounts and cross-device sync | `/compte` | [[Authentication]] |
| Maps | `/carte` | Links to DofusDB and Dofus Maps; in-site map rejected ([[ADR-0005 Remove the in-site map]]) |

## What to work on next
1. **Owner:** scan a real « Terminées » list and an obtained-achievements list. Send the misses, or the « Voir le texte lu » text, for calibration.
2. **Owner:** review and merge the open work ([[03 - DEVELOPMENT STATUS#Branches]]).
3. **Launch blockers:** [[Release Checklist]].
4. **Data foundation:** findings M2–M4 in [[04 - TECHNICAL DEBT]]. They block the equipment builder and the progression planner.

Full order and blocked items: [[01 - PROJECT ROADMAP]].

## Recent sessions and decisions
![[Development.base]]

All: [[Session Summaries]] · [[Architecture Decision Records]] · [[Bug History]] · [[Lessons Learned]]

## Sections
- **Technical:** [[02 - PROJECT ARCHITECTURE]] · [[Architecture]] · [[Ecosystem Architecture]] · [[Database Schema]] · [[API Documentation]] · [[Data Pipeline]] · [[Authentication]] · [[Character Sync OCR]] · [[Companion Window]] · [[Integrations]]
- **Game research:** [[Game Knowledge]] · [[Game Mechanics]] · [[Spells]] · [[Quests]] · [[Achievements]] · [[Dungeons]] · [[Monsters]] · classes [[Cra]] · [[Pandawa]]
- **Sources and labels:** [[Official Sources]] · [[Community Sources]] · [[Verification Status]] · [[Research Log]] · competitors: [[Competitor Analysis]] · [[Teckium Tool Analysis]] · [[Desktop Companion Research]]
- **Builds and progression:** [[Builds and Progression]] · [[Cra Builds]] · [[Pandawa Builds]] · [[Equipment]] · [[XP Routes]] · [[Kamas Routes]] (both routes: no verified data)
- **Professions:**
  - hub: [[Professions]];
  - gathering: [[Farmer]] · [[Lumberjack]] · [[Miner]] · [[Alchemist]] · [[Fisherman]];
  - crafting: [[Jeweller]] · [[Shoemaker]] · [[Tailor]].
- **Security and deployment:** [[Security Overview]] · [[Security Audit]] · [[GDPR and Privacy]] · [[Infrastructure]] · [[Release Checklist]]
- **Design:** [[Visual Identity]] · [[UI UX Guidelines]] · [[Components]] · [[Design Decisions]]
- **Working with Claude Code:** [[Operating Instructions]] · [[Project Context]] · [[Coding Standards]] · [[Documentation Rules]]
- **Commands and key files:** [[Quick Links]]
- **Templates** (command palette → *Templates: Insert template*): [[Research Template]] · [[Feature Specification]] · [[Architecture Decision]] · [[Bug Report]] · [[Development Session]]

Research notes by label: `Research.base`, in `06 - Research and Sources`.
