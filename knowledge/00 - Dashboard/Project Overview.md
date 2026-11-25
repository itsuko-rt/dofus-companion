---
type: overview
updated: 2026-11-25
---
# Project overview

What the site does, page by page. Status and next steps are in [[00 - PROJECT DASHBOARD]].

**Atlas des Douze** (repository `itsuko-rt/dofus-companion`, public) is a progression companion for DOFUS 3 (Unity). The brand name is set in `src/brand.ts`. A trademark check (INPI, EUIPO) is still to do.

## What it does (implemented and tested)
| Area | Pages | What players get |
|---|---|---|
| Quests | `/progression/quetes`, `/progression/quetes/[région]` | All 1,984 quests by region, real prerequisites computed from the game's conditions, chain graph, quest sheet (text, start NPC, objectives, rewards, tutorial link), progress tracking with undo |
| Achievements | `/progression/succes` | 2,777 achievements, objectives deduced from official conditions or ticked by hand, provenance history |
| Dofus | `/progression/dofus` | The 34 Dofus and the quest or achievement that gives each |
| Level page | `/progression/niveau` | Game suggestions, zones, monsters and dungeons for a level; no rates or prices |
| Scanner | `/progression/scan` | Read a screenshot, or a shared DOFUS window, in the browser (OCR). Names read with certainty are saved at once and can be undone; the rest are proposed. Not measured on real screens yet. See [[Character Sync OCR]] |
| Encyclopaedia | `/encyclopedie` | Monster, item, dungeon, zone and set sheets, linked both ways, with one search and exact drop odds ([[Ecosystem Architecture]]) |
| Atelier | `/metiers/atelier` | A craft list that adds up the resources from the game recipes |
| Companion window | `/compagnon` | An always-on-top window: step-by-step Dofus guide, pinned achievements, search ([[Companion Window]]) |
| Almanax | home page | Today's offering, bonus and the next 6 days, from the game calendar |
| Characters | `/personnage` | Several characters: profile, alignment, notes, saved builds, profession levels, JSON export/import |
| Spells | `/personnage/sorts/[classe]` | The 44 spells (22 slots × 2 variants) of all 19 classes with effects in French (since 2026-11-20) |
| Builds | `/builds` | Community builds from Dofus Fashionista, stats recomputed from our item data |
| Equipment | `/equipement` | Encyclopedia of equippable items |
| Professions | `/metiers`, `/metiers/[slug]` | Gathering tiers by level, zones, recipes with ingredient origin |
| Maps | `/carte` | Links to DofusDB and Dofus Maps (no in-site map since 2026-11-20, see [[ADR-0005 Remove the in-site map]]) |
| Guides | `/guides/...` | Public guides generated at build time (quest order, each Dofus chain) |
| Account | `/compte` | Optional site account; characters sync across devices |

Without an account, progress stays in the browser. With one, it is stored in `data/app.sqlite`.

## Who it is for
Players who want to know what to do next, and why, using the game's own data rather than guesswork. All 19 classes are supported since 2026-11-20; before that, only Crâ and Pandawa (see [[Vision and Goals]]).

## Technology
Next.js 16, React 19, TypeScript 7, Tailwind 4, `node:sqlite` (two SQLite files), Playwright for E2E, tesseract.js for OCR. Details: [[Architecture]].

Related: [[03 - DEVELOPMENT STATUS]] · [[01 - PROJECT ROADMAP]].
