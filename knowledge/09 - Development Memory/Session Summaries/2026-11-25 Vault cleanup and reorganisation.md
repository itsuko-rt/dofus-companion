---
type: session
date: 2026-11-25
---
# 2026-11-25 Vault cleanup and reorganisation

## What changed
The owner asked for a full audit and reorganisation of the vault. An audit and a proposal came first ([[06 - CLEANUP REPORT]]); the owner approved option A, then the changes were made:
- **A single entry point:** [[00 - PROJECT DASHBOARD]], which replaces Home.
- **Seven project notes** at the vault root:
  - roadmap;
  - architecture map;
  - development status, which replaces Current Status;
  - technical debt;
  - documentation index;
  - cleanup report.
- **Merged into the roadmap:** the four planning notes, now in `99 - Archive` with their full text.
- **Stale facts corrected against the code:** missing modules, the routes table, monster and dungeon sheets, all 19 classes.
- **A Bases view** of recent sessions and decisions (`Development.base`), embedded in the dashboard.
- Nothing was deleted.

## Why
The folders were sound, but the summary notes still described the project as of 2026-11-20. Feature status was written in six notes, and they disagreed with each other.

## Files affected
- **Vault:** the seven root notes, `Development.base`, `99 - Archive/`, and 23 relinked notes. The full list is in [[06 - CLEANUP REPORT#6. What was done (phases 3–6, approved 2026-11-25)]].
- **Tooling:**
  - `CLAUDE.md`;
  - `scripts/check-knowledge.ts` (the REQUIRED list);
  - `knowledge/.obsidian/bookmarks.json`;
  - `knowledge/README.md`.

## Tests performed and results
- `node scripts/check-knowledge.ts`: pass.
- Own link scan: 0 broken links, 0 orphans, 0 duplicate names.
- `npm run typecheck`: clean. `npm test`: 108/108. These were run for the status note; no code changed.
- E2E: not run. No code changed.

## Remaining issues
- The `.base` views were not seen rendered in Obsidian (NEEDS VERIFICATION).
- 35 hub, design, security and archive notes have no frontmatter, by choice.
- The documentation index is maintained by hand from now on.

## Next recommended actions
1. **Owner:** open Obsidian and check that the dashboard and its embedded view render.
2. **Owner:** test the scanner on the real game ([[01 - PROJECT ROADMAP#Priorities (in order)]]).
