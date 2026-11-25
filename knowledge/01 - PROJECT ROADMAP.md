---
type: roadmap
updated: 2026-11-25
---
# Project roadmap

The one list of what is done, what comes next, and what is blocked. Statuses were checked against the code and git on 2026-11-25.

It merges four notes, now archived with their full text: [[Product Roadmap]] (the original five phases), [[Milestones]], [[Priorities]] and [[Feature Backlog]]. The principles are in [[Vision and Goals]].

**Status words:**
- **done:** implemented and tested;
- **in progress;**
- **planned:** agreed, not started;
- **idea:** not agreed;
- **blocked:** waiting on something;
- **rejected.**

## Priorities (in order)
1. **Trust in the scanner:** the owner tests it on real DOFUS lists, then it is calibrated on what was missed.
2. **Merge the open work:** `feature/atlas-ecosystem` → `develop` → `main` (owner).
3. **Launch blockers:** see [[Release Checklist]] and [[03 - DEVELOPMENT STATUS#Blocking a public launch]].
4. **Data foundation:** findings M2–M4 in [[04 - TECHNICAL DEBT]]. This must come before the equipment builder and the progression planner.
5. **Player value:** « Que faire maintenant ? » on the home page, and the ecosystem next steps below.
6. **Class content (layer B):** sourced Crâ and Pandawa advice, only from sources that pass [[Verification Status]].

**Out of scope for now:**
- an in-site map ([[ADR-0005 Remove the in-site map]]);
- XP and kamas routes (no verified data);
- an optimisation solver (Fashionista links instead);
- prices, breaking and runes ([[Competitor Analysis]]).

## The original five phases (from `docs/RAPPORT_ARCHITECTURE.md` §9)
| Phase | Status |
|---|---|
| 1. Data foundations: import, condition parser, graph compiler | **done** (`scripts/import.ts`, `src/criteria.ts`, `src/graph.ts`). The deeper foundation work is M2–M8 |
| 2. Quest map: graph views, quest sheet, tracking | **done**, redesigned after N1ark |
| 3. Encyclopaedia, Crâ and Pandawa | **done**: spells of all 19 classes, achievements, Dofus, equipment, builds. Dungeon, monster, zone, item and set sheets since 2026-11-21 |
| 4. Accounts and progress | **done**, with SQLite instead of Postgres ([[ADR-0002 SQLite for game and account data]]). The N1ark import is still an idea |
| 5. Community content: routes, sourced guides, post-patch review | **not started** |

## Backlog
| Feature | Status | Source or note |
|---|---|---|
| Scanner accuracy on real DOFUS screens | **in progress** (owner test) | [[Character Sync OCR]] |
| Companion window checked above the running game | **in progress** (owner test) | [[Companion Window]] |
| Game data foundation: quest objectives with game ids, all subareas (dungeons), drop fields, integrity gate after import | planned | M2–M4, M8 in [[04 - TECHNICAL DEBT]] |
| In-game checks: monster XP, profession XP panel, one spell tooltip | planned (owner, in game) | M5, M6 |
| E-mail provider for password reset and verification | **blocked** (choice of provider) | `docs/RELEASE_READINESS.md` |
| E-mail verification at sign-up | blocked (needs the e-mail provider) | Also stops registration enumeration |
| "Log out other devices", idle session timeout | planned (not in the code) | `docs/SECURITY_AUDIT.md` F10 |
| Terms of service page | planned (no route yet) | [[GDPR and Privacy]] |
| « Que faire maintenant ? » on the home page | planned (not in the code) | `docs/RAPPORT_SUCCES_SCAN.md` §8 |
| Full scan history page (only the last 8 are shown) | planned | `components/scan/ScanView.tsx` |
| Encyclopaedia: sitemap index for about 27,000 sheets | planned | [[Ecosystem Architecture]] |
| Encyclopaedia filters (items by type and level) | planned | same |
| More companion guides (region quests, dungeon achievements, atelier checklist) | planned | same |
| Archmonster and wanted-poster checklists | planned | same |
| Backup and export of a character to a file | planned | same |
| Class guides with sourced advice (layer B) | planned | [[Cra]], [[Pandawa]] |
| Label event-only zones (Nowel) on the level page | idea (no game-data flag found) | `docs/PR2_TECHNICAL_REVIEW.md` §12 |
| Nonce-based CSP | idea | `next.config.ts` still uses `'unsafe-inline'` |
| Self-host the tesseract model | idea | Removes the jsDelivr dependency |
| tesseract.js 7 | idea | Needs a scanner retest |
| N1ark progress import | idea | Export format UNVERIFIED |
| Keyboard navigation of the quest graph | idea | |
| Recommended routes, XP and kamas routes (layer C) | **blocked** (no verified data) | [[XP Routes]], [[Kamas Routes]] |
| In-site map, optimisation solver | **rejected** | [[ADR-0005 Remove the in-site map]] |

Before starting one of these, write a spec with [[Feature Specification]].

## Done
| Date | Milestone | Commits |
|---|---|---|
| 2026-11-19 | Quest graph, spells, Fashionista builds, accounts, achievements, Dofus, equipment, quest tracker, scanner v1, visual redesign, launch preparation | `1c8b1c3` … `71e79b0` |
| 2026-11-19/20 | First security audit, Playwright E2E | `320c1ef`, `6f38cc6` |
| 2026-11-20 | Professions guide, map removed, pre-launch security audit, knowledge base | `3f64221`, `02b400a`, `72ad961`, `8b16623` (on `main`) |
| 2026-11-20 | Game data foundation (classes, monsters, drops, XP), all 19 classes, class-aware progression, level page, Almanax, profession calculator, PR #2 fixes | `77a772e` … `25f2a8a` (on `develop`) |
| 2026-11-21 | Succès redesign, visual redesign, refinement | `b9f9a29`, `99bec5c`, `0ef399a` (on `develop`) |
| 2026-11-21 | Encyclopaedia, atelier, drop odds, companion window, sitemap | `a274a82`, `5503976` (on `feature/atlas-ecosystem`) |
| 2026-11-23 | Scanner that saves what it reads, window sharing with a frame | `e1da0c2`, `8ffe8b7` (on `feature/atlas-ecosystem`) |
| — | **Public launch** | planned |

Commit-by-commit history for 2026-11-19 and 2026-11-20: [[2026-11-19 log]] · [[2026-11-20 log]] (archived). After that: [[Session Summaries]].
