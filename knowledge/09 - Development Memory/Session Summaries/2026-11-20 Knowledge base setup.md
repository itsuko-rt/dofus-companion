---
type: session
date: 2026-11-20
---
# 2026-11-20 Knowledge base setup

## What changed
- Created this Obsidian vault in `knowledge/`.
- Notes populated from `README.md`, the reports in `docs/`, the code and the game database (3.7.14.18).
- Added the project `CLAUDE.md`, telling Claude Code to consult and maintain the vault.
- Added `.gitignore` rules for Obsidian workspace state.
- Corrected the README line about reset links in logs (outdated since fix F1).

## Why
The owner wants a long-term knowledge base and persistent project memory shared with Claude Code.

## Files affected
`knowledge/**`, `CLAUDE.md`, `.gitignore`, `README.md` (one sentence).

## Tests performed and results
- `node scripts/check-knowledge.ts` (new): 84 notes, all links and heading anchors resolve, every repository path exists, no secret-like strings, `CLAUDE.md` points to the vault. A planted broken link, missing path and token were all caught (exit code 1).
- Git: `.obsidian/app.json`, `core-plugins.json`, `templates.json` and `bookmarks.json` are tracked; `workspace*.json` and `Attachments/` are ignored.
- `npm run typecheck`: clean. No application code changed.

## Remaining issues
- Obsidian isn't installed on this PC, so it was not opened in the app.
- Class play advice, XP and kamas routes have no sourced content yet.

## Next recommended actions
Install Obsidian (https://obsidian.md/download), open `knowledge/` as a vault, and decide whether to add Dataview.
