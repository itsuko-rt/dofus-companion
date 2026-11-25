# Atlas des Douze — knowledge base

This folder is an [Obsidian](https://obsidian.md) vault, and also plain Markdown that reads fine on GitHub or in any editor. It holds the project's research, technical documentation, decisions and development memory. Claude Code reads it before significant work and updates it after.

**Start here:** [[00 - PROJECT DASHBOARD]].

## Open it in Obsidian
1. Install Obsidian from the official site, https://obsidian.md/download (Windows installer, or `winget install Obsidian.Obsidian`).
2. Obsidian → *Open folder as vault* → choose this `knowledge` folder.
   Obsidian names a vault after its folder, so it will show as `knowledge`. To display `Atlas-des-Douze-Knowledge-Base`, rename it from Obsidian's vault switcher (*Manage vaults*). Renaming the folder itself would break the paths Claude Code uses.
3. Nothing else is required. Templates use Obsidian's built-in *Templates* plugin, set to the `Templates/` folder (already configured in `.obsidian/`).

No community plugins are needed. [[Operating Instructions#Plugins]] explains which ones might be worth adding later, and why none is installed now.

## Layout
| Folder | Holds |
|---|---|
| `00 - PROJECT DASHBOARD` … `06 - CLEANUP REPORT` (vault root) | Entry point, roadmap, architecture map, status, technical debt, index, cleanup report |
| `00 - Dashboard` | Project overview, quick links |
| `01 - Project Management` | Vision and goals (the roadmap is at the vault root) |
| `02 - Game Knowledge` | Facts about DOFUS taken from the game files (classes, spells, quests…) |
| `03 - Builds and Progression` | Builds, equipment, XP and kamas routes, with their sources |
| `04 - Professions` | The eight professions the site documents |
| `05 - Technical Documentation` | Architecture, database, API, auth, scanner, data pipeline, integrations |
| `06 - Research and Sources` | Sources, research log, verification status |
| `07 - Design System` | Visual identity and UI rules |
| `08 - Security and Deployment` | Security, privacy, infrastructure, release checklist |
| `09 - Development Memory` | Decisions (ADRs), logs, bugs, lessons, session summaries |
| `10 - Claude Code` | How Claude Code uses and maintains this vault |
| `99 - Archive` | Notes replaced on 2026-11-25, kept unchanged as history |
| `Templates` | Note templates |

## Rules that keep it trustworthy
- **Labels:** every research claim carries one of VERIFIED, COMMUNITY, UNVERIFIED, OUTDATED or HYPOTHESIS (see [[Verification Status]]).
- **Status:** a feature is only marked as working when it is implemented *and* tested. Planned work says *planned*.
- **Decisions are never overwritten:** a new ADR supersedes an old one, and the old one stays.
- **No secrets, no personal data:** no passwords, tokens, keys, real user data or private screenshots, here or anywhere in Git. The `Attachments/` folder is git-ignored so that pasted images stay local; commit a diagram on purpose by placing it elsewhere.
- **Repository paths** are written as code, like `docs/SECURITY_AUDIT.md`. They are files in the repo, outside the vault, so Obsidian does not open them. The long reports in `docs/` stay the detailed source; vault notes summarise them and point to them, instead of copying them.

## How Claude Code uses it
Summary (full rules in [[Operating Instructions]] and the repository's `CLAUDE.md`):
- **Before a task:** read [[Project Context]], then only the notes the task touches (targeted, never the whole vault).
- **During:** update the technical notes, feature status, decisions and sources that the change affects.
- **After significant work:** add a summary in `09 - Development Memory/Session Summaries/` using [[Development Session]].
