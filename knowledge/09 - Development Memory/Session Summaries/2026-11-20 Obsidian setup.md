---
type: session
date: 2026-11-20
---
# 2026-11-20 Obsidian setup

## What changed
- Registered `knowledge/` as the open vault in Obsidian 1.15.1.
- Rebuilt the Home dashboard, with feature status and priorities.
- Added `Research.base`, a native Bases view of the research notes.
- Completed the research frontmatter for [[XP Routes]] and [[Kamas Routes]].
- Added versions and page routes to [[Architecture]], and the NEEDS VERIFICATION marker.
- Two retrieval steps in `CLAUDE.md`; the checker now resolves `.base` embeds.

## Why
The owner installed Obsidian and asked for a working vault, which Claude Code maintains.

## Files affected
`knowledge/**` (Home, Setup Report, Architecture, Current Status, Verification Status, Documentation Rules, Operating Instructions, two route notes, Milestones, one session note, `.obsidian/` settings), `CLAUDE.md`, `scripts/check-knowledge.ts`.

## Tests performed and results
- The checker passes.
- Obsidian created `workspace.json`, and the URI opened Home.
- `workspace.json` stays ignored by Git.

Details: [[Setup Report#7. Tests performed]].

## Remaining issues
- The window was not seen on screen. The Bases table and the templates need a manual check.
- The vault moved to the permanent clone in `Documents\Atlas-des-Douze` the same day ([[Setup Report#8. What remains incomplete (manual checks)]]).

## Next recommended actions
- Do the three manual checks in [[Setup Report]].
- Merge docs/obsidian-setup.
