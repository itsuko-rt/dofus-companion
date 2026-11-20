# Atlas des Douze

A free companion site for DOFUS (Unity, game version **3.7.14.18**). It tracks quests, achievements and Dofus, shows builds and professions, and computes everything from the official game files. Fan site, not affiliated with Ankama. Details: [[Project Overview]].

> **Now (2026-11-20):** pre-launch. The site runs locally and all checks pass (typecheck, 72 unit tests, 22 E2E tests, build, `npm audit`). Launch is waiting on owner decisions: e-mail provider, hosting, backups, legal review. See [[Current Status]] and [[Release Checklist]].

## Feature status
| Feature | Status | Notes |
|---|---|---|
| Quests, prerequisites, chain graph | **Implemented** (unit + E2E tests) | 621 quests have conditions shown as "à vérifier en jeu": [[Current Status#Known limitations]] |
| Achievements, Dofus planner | **Implemented** (tests) | [[Achievements]] |
| Characters, profession levels, JSON export | **Implemented** (tests) | [[Architecture#Where state lives]] |
| Accounts and cross-device sync | **Implemented** (tests, security probe) | [[Authentication]] |
| Spells (Crâ, Pandawa) | **Implemented** (tests) | [[Cra]] · [[Pandawa]] · [[Spells]] |
| Builds (Fashionista) and equipment | **Implemented** (tests) | Build quality is COMMUNITY: [[Builds and Progression]] |
| Professions guide | **Implemented** (tests) | [[Professions]] |
| Scanner (local OCR) | **Implemented**; accuracy **NEEDS VERIFICATION** | Never measured on real screenshots: [[Character Sync OCR]] |
| Maps page | **Implemented** as links to DofusDB and Dofus Maps | Internal map **rejected**: [[ADR-0005 Remove the in-site map]] |
| Production deployment | **NEEDS VERIFICATION** (not deployed) | [[Infrastructure]] |
| In progress | nothing | |
| Planned | e-mail provider, dungeon view, "Que faire maintenant ?", sourced class advice | [[Feature Backlog]] |
| Blocked or rejected | XP and kamas routes (no verified data), Almanax (blocked); in-site map, optimisation solver (rejected) | [[Priorities]] |

## Active priorities
1. Launch blockers ([[Release Checklist]]).
2. Trust in the data: OCR accuracy, uninterpreted condition codes.
3. Player value: "Que faire maintenant ?", dungeon view.
4. Sourced Crâ and Pandawa advice.

Full list: [[Priorities]] · Plan: [[Product Roadmap]] · [[Milestones]] · [[Vision and Goals]]

## Technical documentation
[[Architecture]] · [[Database Schema]] · [[API Documentation]] · [[Data Pipeline]] · [[Authentication]] · [[Character Sync OCR]] · [[Integrations]]

## Game research
- [[Game Knowledge]] · [[Game Mechanics]] · [[Spells]] · [[Quests]] · [[Achievements]] · [[Dungeons]] · [[Monsters]]
- Classes: [[Cra]] · [[Pandawa]]
- Sources and labels: [[Official Sources]] · [[Community Sources]] · [[Verification Status]] · [[Research Log]]

All research notes by label (Obsidian Bases view):

![[Research.base]]

## Builds and progression
[[Builds and Progression]] · [[Cra Builds]] · [[Pandawa Builds]] · [[Equipment]] · [[XP Routes]] · [[Kamas Routes]] (both routes: no verified data)

## Professions
[[Professions]]. Gathering: [[Farmer]] · [[Lumberjack]] · [[Miner]] · [[Alchemist]] · [[Fisherman]]. Crafting: [[Jeweller]] · [[Shoemaker]] · [[Tailor]].

## Security and deployment
[[Security Overview]] · [[Security Audit]] · [[GDPR and Privacy]] · [[Infrastructure]] · [[Release Checklist]]

## Design
[[Visual Identity]] · [[UI UX Guidelines]] · [[Components]] · [[Design Decisions]]

## Development history
[[Architecture Decision Records]] · [[Development Logs]] · [[Bug History]] · [[Lessons Learned]] · [[Session Summaries]]

## Working with Claude Code
[[Operating Instructions]] · [[Project Context]] · [[Coding Standards]] · [[Documentation Rules]]

## Templates
Insert with the command palette, *Templates: Insert template*: [[Research Template]] · [[Feature Specification]] · [[Architecture Decision]] · [[Bug Report]] · [[Development Session]]

Shortcuts: [[Quick Links]] · Vault setup: [[Setup Report]]
