---
type: report
status: proposal
date: 2026-11-25
---
# Cleanup report

This report covers phases 1 and 2: the audit, and the cleanup proposal. **Nothing has been moved, renamed, merged or deleted.** The only change to the vault is this new note. Phases 3 to 6 wait for the owner's approval: see the questions at the end.

> **Project name:** the brief says "Dofus Solo Roadmap". The vault and the code are **Atlas des Douze** (`src/brand.ts`). This report keeps that name. Tell me if you want a rename.

## 1. Audit method
- Every Markdown note in the vault was scanned: 109 notes in 11 numbered folders, plus `Templates` and `README.md`.
- Links, orphans and frontmatter were checked with a script. `node scripts/check-knowledge.ts` passed on 2026-11-25.
- Status claims were compared with the code: the pages in `app/**/page.tsx`, the git branches, `npm run typecheck` and `npm test`.
- Results from the code on 2026-11-25:
  - typecheck clean;
  - **108/108 unit tests pass**;
  - E2E not rerun today. Last recorded run (2026-11-23): 63 passed, 1 skipped, 0 failed.

## 2. What the audit found

### 2.1 Structure: sound, little to move
The folders already match most categories in the brief: overview, roadmap, technical documentation, research, decisions, bugs and development logs.
- No duplicate note names.
- No real broken links. The checker flags two links, and neither is broken:
  - `Research.base` is a Bases view that exists;
  - `[[Note]]` in [[Documentation Rules]] is a syntax example.
- Obsidian setup:
  - core plugins only, with **Bases** on and Dataview not installed;
  - the Templates folder is set;
  - [[Home]] is bookmarked.

### 2.2 Out-of-date content (the main problem)
The dashboard and planning notes describe the project as of 2026-11-20. Since then, the code has gained:
- the encyclopaedia;
- the atelier;
- drop odds;
- the companion window;
- the Succès redesign;
- the scanner that saves what it reads.

| Note | What is wrong | Checked against |
|---|---|---|
| [[Home]] | Several problems: see the list below the table | `npm test`, `app/` |
| [[Current Status]] | Dated sections pile up, newest in the middle. "Last updated 2026-11-20", but it has 2026-11-23 content. "develop: 90/90". It ends with "Nothing in progress, PR #2 ready", which is no longer the state | git branches |
| [[Feature Backlog]] | Some items are marked *planned* but are done: all 19 classes, and the dungeon view (`app/encyclopedie/donjon/[id]/page.tsx`) | `app/` |
| [[Project Overview]] | No rows for the encyclopaedia, atelier, companion, level page or Almanax. The Nav now shows « Encyclopédie », not « Cartes » | `components/Nav.tsx` |
| [[Product Roadmap]], [[Milestones]], [[Vision and Goals]] | Status as of 2026-11-20. Milestones stop on 2026-11-20. Goals still say "Crâ and Pandawa" | git log |
| [[Architecture]] | The pages table lists 24 routes; there are 33 now | `app/**/page.tsx` |
| [[Monsters]] | Says monster data is "not shown on the site yet". Monster sheets exist since 2026-11-21 | `app/encyclopedie/monstre/[id]/page.tsx` |

What is wrong in [[Home]]:
- The status line is dated 2026-11-20 and says "72 unit tests, 22 E2E".
- "In progress: nothing".
- Almanax is listed as blocked, but it is implemented.
- There are no rows for the encyclopaedia, atelier or companion.

### 2.3 Duplicated information
| Topic | Repeated in | Effect |
|---|---|---|
| Feature status | [[Home]], [[Project Overview]], [[Current Status]], [[Feature Backlog]], [[Product Roadmap]], [[Vision and Goals]] (goals table) | Six places to update; they already disagree |
| Priorities and next steps | [[Home]], [[Priorities]], [[Current Status]], [[Ecosystem Architecture]] (next steps) | Same |
| The reports in `docs/` | [[Quick Links]] (table) and [[Research Archive]] | Two partial lists |
| Commit history | [[Milestones]], [[2026-11-19 log]], [[2026-11-20 log]], session summaries | Logs stopped on 2026-11-20; the session summaries took over |
| Plugin assessment | [[Setup Report]] and [[Operating Instructions#Plugins]] | Same table twice |

### 2.4 Orphans and naming
- **Orphans** (no note links to them):
  - [[Research Archive]];
  - [[Wrong zone at [0, 0] on the removed map]]: it is listed in [[Bug History]], but the bracket in its name stops the link from resolving in some tools;
  - `README.md`, which is normal for a README.
- **Frontmatter:** 47 of 109 notes have none. This includes every dashboard, planning and technical note. Research, ADR, bug and session notes have it.
- **Tags:** none are used. The `type:` field already sorts notes, so tags would add little.
- **Naming:** consistent overall:
  - session summaries are `YYYY-MM-DD topic`;
  - ADRs are `ADR-000N title`;
  - each folder has a hub note named after it.
  - One small exception: the logs are named `2026-11-19 log`.
- **Short hub notes** (15 lines or fewer): the four Design System notes, [[Monsters]], [[Builds and Progression]], [[Priorities]], [[Research Log]], [[Official Sources]], [[Community Sources]]. They are small but each has a purpose. Keep them.

### 2.5 Outside the vault
- **Branch docs/system-documentation** (not merged) holds one 706-line note, « Complete System Documentation ». It also covers other projects: Fisch Ultimate, macro software and local utilities. That is outside this project's scope. **Recommendation:** leave it on its branch and do not bring it into this vault. The owner decides.
- **Branches:**
  - `develop` is 24 commits ahead of `main`;
  - `feature/atlas-ecosystem` is 5 commits ahead of `develop`;
  - the PR for it has not been confirmed as open: `gh` is not installed here, so this could not be checked.

## 3. Proposal

### 3.1 Delete
**Nothing.** Every note holds either current facts or history worth keeping.

### 3.2 Merge (the content is kept; the old note becomes a short pointer or goes to the archive)
| From | Into | Why |
|---|---|---|
| [[Home]] + the essentials of [[Project Overview]] | **`00 - PROJECT DASHBOARD`** | One entry point. Today, four dashboard notes overlap |
| [[Product Roadmap]] + [[Milestones]] + [[Priorities]] + [[Feature Backlog]] + the goals table of [[Vision and Goals]] | **`01 - PROJECT ROADMAP`** (one status table, refreshed against the code) | Feature status lives in one place |
| [[Current Status]] (rewritten as a snapshot, not a pile of dated sections) | **`03 - DEVELOPMENT STATUS`** | The dated history is already in the session summaries |
| [[Research Archive]] + the `docs/` table of [[Quick Links]] | **`05 - DOCUMENTATION INDEX`** | One list of everything, notes and reports |

[[Vision and Goals]] keeps its principles. [[Quick Links]] keeps its commands and key files.

### 3.3 Archive (move to a new `99 - Archive` folder, unchanged)
| Note | Why |
|---|---|
| [[Setup Report]] | One-off report of the Obsidian setup on 2026-11-20. It is history, not a dashboard |
| [[2026-11-19 log]], [[2026-11-20 log]], [[Development Logs]] | Stopped on 2026-11-20; replaced by the session summaries |
| The old [[Home]], [[Current Status]], [[Product Roadmap]], [[Milestones]], [[Priorities]], [[Feature Backlog]] | Only if you choose option B below. With option A, they are renamed or merged instead |

### 3.4 Update in place (facts only, checked against the code)
- [[Project Overview]]: add the missing modules.
- [[Architecture]]: the 33 routes.
- [[Monsters]]: the sheets are now shown on the site.
- [[Bug History]]: an open or fixed column.
- [[Ecosystem Architecture]]: next steps point to the roadmap.
- Frontmatter (`type`, `status`, `updated`) on the dashboard, planning and technical notes only, so that Bases views can list them.

### 3.5 Leave untouched
- Every ADR. They are decisions, never rewritten.
- Every bug note and session summary.
- The research notes and `Research.base`.
- The game knowledge, class, build and profession notes.
- The `Templates` folder and its five templates.
- `.obsidian/`: plugins, templates setting, appearance.
- Everything in `docs/`.

### 3.6 Folder structure
Keep the 11 numbered folders. They already cover the categories the brief asks for, and a deeper reshuffle would break:
- the paths that `CLAUDE.md` and [[Operating Instructions]] tell Claude Code to read;
- the files the checker requires (`scripts/check-knowledge.ts`);
- the session-summary path convention.

The only additions:
```
knowledge/
  00 - PROJECT DASHBOARD.md      ← entry point (bookmarked)
  01 - PROJECT ROADMAP.md
  02 - PROJECT ARCHITECTURE.md   ← map of the technical notes, no copied content
  03 - DEVELOPMENT STATUS.md
  04 - TECHNICAL DEBT.md         ← new: known limits, PR #2 findings M2–M8 / L1–L8, open security items, `shortcut:` comments in the code
  05 - DOCUMENTATION INDEX.md
  06 - CLEANUP REPORT.md         ← this note
  00 - Dashboard … 10 - Claude Code   (unchanged)
  99 - Archive/                  ← new
  Templates/
```

**Phase 6 dashboards:** the brief suggests five more. Existing notes already do four of these jobs:
- **Features:** the roadmap table.
- **Bugs:** [[Bug History]].
- **Research:** `Research.base` and [[Verification Status]].
- **Technical docs:** `02 - PROJECT ARCHITECTURE`.

I propose **one** new view: a `Development.base` listing the session summaries and ADRs by date, embedded in the dashboard for « recent decisions ». More dashboards would mean more places to keep up to date.

## 4. Backups before any change
1. Work on a new branch, **docs/vault-cleanup**, from `feature/atlas-ecosystem`.
2. Make one commit with the vault exactly as it is now, before anything moves.
3. Make a zip copy of `knowledge/` in `Documents/` (outside Git).
4. Move files with `git mv`, so each note keeps its history.

## 5. Decisions needed from the owner
1. **Approve the plan** in section 3: merges, archive, updates. No deletions.
2. **Option A or B** for [[Home]] and [[Current Status]]:
   - **A (recommended):** rename them to `00 - PROJECT DASHBOARD` and `03 - DEVELOPMENT STATUS`. Then update the paths in four tooling files:
     - `CLAUDE.md`;
     - the REQUIRED list in `scripts/check-knowledge.ts` (one line);
     - `.obsidian/bookmarks.json`;
     - [[Operating Instructions]].
   - **B:** keep both notes as one-line pointers to the new notes. No tooling file is touched, but there are two names for one thing.
3. **Branch docs/system-documentation:** leave it as it is? (recommended)
4. **Project name:** keep « Atlas des Douze »?
