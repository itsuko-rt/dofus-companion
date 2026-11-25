---
type: index
updated: 2026-11-25
---
# Documentation index

Every note in the vault, and every long report in the repository's `docs/` folder. Start from [[00 - PROJECT DASHBOARD]].

- Each one-line description is the note's own first sentence.
- `99 - Archive` holds notes that were replaced. They are kept unchanged as history.
- When you add a note, add its line here too.

## Reports in `docs/` (outside the vault, the detailed sources)
| Report | Topic | Still valid? |
|---|---|---|
| `docs/PROJECT_OVERVIEW.md` | The project for readers new to it, in two levels, with links to these notes (2026-11-25) | Yes: kept up to date (CLAUDE.md) |
| `CHANGELOG.md` | Every commit, newest first, updated by a workflow on `main` | Yes ([[ADR-0010 Changelog written by a workflow on main]]) |
| `docs/RAPPORT_ARCHITECTURE.md` | Source study, original architecture and five-phase roadmap (2026-11-19) | Sources and data: yes. Stack: partly superseded ([[ADR-0002 SQLite for game and account data]]) |
| `docs/RAPPORT_DEVELOPPEMENT.md` | First development session | History |
| `docs/RAPPORT_SUIVI_QUETES.md` | Quest tracker redesign | Yes. Its Almanax "blocked" is outdated: Almanax was built on 2026-11-20 |
| `docs/RAPPORT_SUCCES_SCAN.md` | Achievements, Ankama APIs, OCR | Yes |
| `docs/AUDIT_UX.md` · `docs/RAPPORT_REFONTE_VISUELLE.md` · `docs/DESIGN_SYSTEM.md` | UX audit, visual redesign, design system | History; predates the Succès redesign |
| `docs/LANCEMENT_PUBLIC.md` | Launch: SEO, hosting, ads | Yes |
| `docs/PROFESSIONS_SYSTEM.md` | Professions | Yes |
| `docs/AUDIT_SECURITE.md` · `docs/SECURITY_AUDIT.md` · `docs/SECURITY_FIXES.md` | Security audits and fixes | Yes ([[04 - TECHNICAL DEBT]]) |
| `docs/PRIVACY_GDPR_REVIEW.md` · `docs/RELEASE_READINESS.md` | Privacy review, release readiness | Yes |
| `docs/MAP_REMOVAL_REPORT.md` | Map removal | History |
| `docs/INTEGRATION_PLAN.md` · `docs/INTEGRATION_RESULTS.md` | World map and professions integration | Map parts: history. Professions parts: yes |
| `docs/REFERENCE_REPOSITORY_AUDIT.md` | The "reference project" was this repository | Yes |
| `docs/GAME_DATA_INVENTORY.md` | Every game dataset, coverage, what is missing (2026-11-20) | Yes |
| `docs/GAME_DATA_AND_PRODUCT_AUDIT.md` | Game data, classes, performance, UX (2026-11-20) | Yes |
| `docs/PR2_TECHNICAL_REVIEW.md` | PR #2 review, findings M1–M8 and L1–L8 | Yes ([[04 - TECHNICAL DEBT]]) |

## Views (Obsidian Bases)
- `Research.base`: research notes grouped by label.
- `Development.base`: the latest sessions and decisions. It is embedded in the dashboard.

## (vault root)
| Note | What it holds |
|---|---|
| [[00 - PROJECT DASHBOARD]] | Entry point: what the project is, what is built, what to work on next, links to every section |
| [[01 - PROJECT ROADMAP]] | The one list of what is done, what comes next, and what is blocked |
| [[02 - PROJECT ARCHITECTURE]] | How the whole thing works, in one page, and which note explains each part |
| [[03 - DEVELOPMENT STATUS]] | A snapshot of where the project stands, checked against the code |
| [[04 - TECHNICAL DEBT]] | Known weaknesses in the code and the data, with where they live and what would fix them |
| [[06 - CLEANUP REPORT]] | This report covers the audit and the cleanup proposal (sections 1–5, written before any change), then what was done… |
| [[README]] | This folder is an [Obsidian](https://obsidian.md) vault, and also plain Markdown that reads fine on GitHub or in any… |

## 00 - Dashboard
| Note | What it holds |
|---|---|
| [[Project Overview]] | Atlas des Douze (repository itsuko-rt/dofus-companion, public) is a progression companion for DOFUS 3 (Unity) |
| [[Quick Links]] | Commands, key files and external links |

## 01 - Project Management
| Note | What it holds |
|---|---|
| [[Vision and Goals]] | Vision, the five principles, and the goals table |

## 02 - Game Knowledge
| Note | What it holds |
|---|---|
| [[Game Knowledge]] | Facts in this section come from the game files of DOFUS 3.7.14.18, extracted by the community project dofus-sqlite… |
| [[Achievements]] | Game facts on achievements: counts, objectives, server-only objectives, class links |
| [[Cra]] | Crâ class: spells from the game files, community notes kept apart |
| [[Pandawa]] | Pandawa class: spells and states from the game files, community notes kept apart |
| [[Dungeons]] | Game facts on dungeons: levels, keys, bosses, dungeon achievements |
| [[Game Mechanics]] | Only what the code relies on and can source |
| [[Monsters]] | Game facts on monsters: grades, zones, drops, and the XP caveat |
| [[Quests]] | Game facts on quests: start conditions, condition codes, per-class branches |
| [[Spells]] | Game facts on spells: tables, effects, elements; links to the class notes |

## 03 - Builds and Progression
| Note | What it holds |
|---|---|
| [[Builds and Progression]] | Everything here is community content unless a line says otherwise |
| [[Cra Builds]] | Crâ builds from Dofus Fashionista (COMMUNITY) and how the site uses them |
| [[Equipment]] | The equipment page and its item data (dofusdude 3.7.14.18); what is not shown |
| [[Kamas Routes]] | Status (2026-11-20): partly implemented from game data, still no kamas rates |
| [[Pandawa Builds]] | Pandawa builds from Dofus Fashionista (COMMUNITY) and how the site uses them |
| [[XP Routes]] | Status (2026-11-20): partly implemented from game data, still no XP rates |

## 04 - Professions
| Note | What it holds |
|---|---|
| [[Alchemist]] | Site page: /metiers/alchimiste · job id 26 |
| [[Farmer]] | Site page: /metiers/paysan · job id 28 |
| [[Fisherman]] | Site page: /metiers/pecheur · job id 36 |
| [[Jeweller]] | Site page: /metiers/bijoutier · job id 16 |
| [[Lumberjack]] | Site page: /metiers/bucheron · job id 2 |
| [[Miner]] | Site page: /metiers/mineur · job id 24 |
| [[Professions]] | The game has 22 professions; the site lists all of them, and these eight are documented here |
| [[Shoemaker]] | Site page: /metiers/cordonnier · job id 15 |
| [[Tailor]] | Site page: /metiers/tailleur · job id 27 |

## 05 - Technical Documentation
| Note | What it holds |
|---|---|
| [[API Documentation]] | Sections: Public, read-only game data · Accounts (/api/auth/:action) · Characters |
| [[Architecture]] | Verified against the code on 2026-11-20 |
| [[Authentication]] | Site accounts only, never Ankama accounts |
| [[Character Sync OCR]] | Why there is no live sync, and how the scanner reads screenshots and the shared window |
| [[Companion Window]] | A narrow panel to keep over the game: a step-by-step guide, pinned achievements, and the encyclopaedia search |
| [[Data Pipeline]] | Sections: Import (npm run import) · After a game patch · Assets |
| [[Database Schema]] | Read from the databases on 2026-11-20 (game data 3.7.14.18) |
| [[Game Companion Design]] | Windows companion: design, phase 3 build, install, troubleshooting |
| [[Ecosystem Architecture]] | How the Atlas modules connect, so a player moves between related information without searching again |
| [[Integrations]] | Sections: External services · npm dependencies (runtime) |

## 06 - Research and Sources
| Note | What it holds |
|---|---|
| [[Community Sources]] | Community content is never presented as game mechanics |
| [[Competitor Analysis]] | Sites observed in a browser on 2026-11-21, home page and main tools only |
| [[Desktop Companion Research]] | Goal: use Atlas while playing, without switching windows and without touching the game |
| [[Official Sources]] | Ankama publishes no API for game data or personal progress (checked 2026-11-19; developer.ankama.com doesn't resolve) |
| [[Research Log]] | One line per research session: question, result, where the details are |
| [[Teckium Tool Analysis]] | Teckium (teckium.fr) is a free fan site by the streamer ITeCK covering Dofus 3, Dofus Retro and Wakfu |
| [[Verification Status]] | The research labels, and the current label of key claims |

## 07 - Design System
| Note | What it holds |
|---|---|
| [[Components]] | Shared UI components and where each section's components live |
| [[Design Decisions]] | Dated design decisions with their reason and source |
| [[UI UX Guidelines]] | From docs/DESIGN_SYSTEM.md (rules section) and docs/AUDIT_UX.md |
| [[Visual Identity]] | Source: docs/DESIGN_SYSTEM.md, docs/RAPPORT_REFONTE_VISUELLE.md, app/globals.css |

## 08 - Security and Deployment
| Note | What it holds |
|---|---|
| [[GDPR and Privacy]] | Detailed review: docs/PRIVACY_GDPR_REVIEW.md |
| [[Infrastructure]] | Sections: Environment variables (.env.example) · Backups |
| [[Release Checklist]] | From docs/RELEASE_READINESS.md (2026-11-20) |
| [[Security Audit]] | Detailed reports in the repository: - docs/AUDIT_SECURITE.md (2026-11-19, first audit); - docs/SECURITY_AUDIT.md… |
| [[Security Overview]] | Security controls by area: accounts, isolation, input, output, headers |

## 09 - Development Memory
| Note | What it holds |
|---|---|
| [[ADR-0001 Game data from the game files]] | Decision, accepted, 2026-11-19 |
| [[ADR-0002 SQLite for game and account data]] | Decision, accepted, 2026-11-19 |
| [[ADR-0003 Link community sites, never copy them]] | Decision, accepted, 2026-11-19 |
| [[ADR-0004 Scanner reads screenshots locally]] | Decision, accepted, 2026-11-19 |
| [[ADR-0005 Remove the in-site map]] | Decision, accepted, 2026-11-20 |
| [[ADR-0006 No ads or analytics without consent]] | Decision, accepted, 2026-11-19 |
| [[ADR-0007 Profession XP comes from the player's screen]] | Decision, accepted, 2026-11-20 |
| [[ADR-0008 Companion window in the browser]] | Decision, accepted, 2026-11-21 |
| [[ADR-0009 Windows companion reads the window title and screen]] | Decision, accepted, 2026-11-25 |
| [[ADR-0010 Changelog written by a workflow on main]] | Decision, accepted, 2026-11-25 |
| [[Architecture Decision Records]] | One note per decision, never rewritten |
| [[Blank pages on a first visit]] | Bug, high severity, fixed |
| [[Bug History]] | Bugs worth remembering (not every small fix) |
| [[Item effects lost through rounded ids]] | Bug, high severity, fixed |
| [[JSON-LD escape did nothing]] | Bug, low severity, fixed |
| [[Reset links in production logs]] | Bug, high severity, fixed |
| [[Server-only objectives counted as met]] | Bug, medium severity, fixed |
| [[Throttle bypass with forged X-Forwarded-For]] | Bug, high severity, fixed |
| [[Wrong zone at (0, 0) on the removed map]] | Bug, medium severity, fixed then removed |
| [[Lessons Learned]] | Sections: Backslashes in shell-written code · Long note paths on Windows · Check the data before building on it · "Escaped" isn't escaped until tested |
| [[2026-11-20 Autonomous development session]] | Session summary, 2026-11-20 |
| [[2026-11-20 Class-aware quests and achievements]] | Session summary, 2026-11-20 |
| [[2026-11-20 Game data and product audit]] | Session summary, 2026-11-20 |
| [[2026-11-20 Game data foundation and all classes]] | Session summary, 2026-11-20 |
| [[2026-11-20 Knowledge base setup]] | Session summary, 2026-11-20 |
| [[2026-11-20 Level page for XP and loot]] | Session summary, 2026-11-20 |
| [[2026-11-20 Map removal and pre-launch security audit]] | Session summary, 2026-11-20 |
| [[2026-11-20 Obsidian setup]] | Session summary, 2026-11-20 |
| [[2026-11-20 PR 2 pre-merge fixes]] | Session summary, 2026-11-20 |
| [[2026-11-20 PR 2 technical review]] | Session summary, 2026-11-20 |
| [[2026-11-20 Profession calculator and drop sources]] | Session summary, 2026-11-20 |
| [[2026-11-20 UX pass and favicon]] | Session summary, 2026-11-20 |
| [[2026-11-21 Achievements redesign]] | Session summary, 2026-11-21 |
| [[2026-11-21 Achievements refinement]] | Session summary, 2026-11-21 |
| [[2026-11-21 Achievements visual redesign]] | Session summary, 2026-11-21 |
| [[2026-11-21 Ecosystem research and encyclopaedia]] | Session summary, 2026-11-21 |
| [[2026-11-23 Scanner that saves quests and achievements]] | Session summary, 2026-11-23 |
| [[2026-11-25 Project overview and automatic changelog]] | Session summary, 2026-11-25 |
| [[2026-11-25 Game companion phase 9 hardening]] | Session summary, 2026-11-25 |
| [[2026-11-25 Game companion phase 8 overlay]] | Session summary, 2026-11-25 |
| [[2026-11-25 Game companion phase 7 characters and accounts]] | Session summary, 2026-11-25 |
| [[2026-11-25 Game companion phase 6 sync]] | Session summary, 2026-11-25 |
| [[2026-11-25 Game companion phases 4 and 5]] | Session summary, 2026-11-25 |
| [[2026-11-25 Game companion audit and phase 3]] | Session summary, 2026-11-25 |
| [[2026-11-25 Vault cleanup and reorganisation]] | Session summary, 2026-11-25 |
| [[Session Summaries]] | One note per significant session, named YYYY-MM-DD <topic>, from Development Session |

## 10 - Claude Code
| Note | What it holds |
|---|---|
| [[Coding Standards]] | Taken from the code as it is, not aspirational |
| [[Documentation Rules]] | How notes are written: one place per fact, labels, status words, links |
| [[Operating Instructions]] | The repository's CLAUDE.md points here |
| [[Project Context]] | Then go to Operating Instructions for what to read next |

## 99 - Archive
| Note | What it holds |
|---|---|
| [[Feature Backlog]] | Status values: planned (agreed, not started), idea (not agreed), blocked (waiting on something) |
| [[Milestones]] | Milestones up to 2026-11-20 with their commits (merged into the roadmap) |
| [[Priorities]] | Set from docs/RELEASE_READINESS.md (2026-11-20) |
| [[Product Roadmap]] | This is the original five-phase plan from docs/RAPPORT_ARCHITECTURE.md §9 (2026-11-19), with today's status |
| [[Research Archive]] | List of the long research reports in docs/ (merged into this index) |
| [[Setup Report]] | Work done by Claude Code on branch docs/obsidian-setup |
| [[2026-11-19 log]] | From git log and docs/RAPPORT_DEVELOPPEMENT.md |
| [[2026-11-20 log]] | Repository made public on GitHub (itsuko-rt/dofus-companion) earlier in the day |
| [[Development Logs]] | One log per day, from the git history and the reports |

## Templates
| Note | What it holds |
|---|---|
| [[Architecture Decision]] | Template (command palette → Templates: Insert template) |
| [[Bug Report]] | Template (command palette → Templates: Insert template) |
| [[Development Session]] | Template (command palette → Templates: Insert template) |
| [[Feature Specification]] | Template (command palette → Templates: Insert template) |
| [[Research Template]] | Template (command palette → Templates: Insert template) |
