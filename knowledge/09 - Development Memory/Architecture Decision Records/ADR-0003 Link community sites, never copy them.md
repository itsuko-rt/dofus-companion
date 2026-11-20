---
type: adr
status: accepted
date: 2026-11-19
---
# ADR-0003 Link community sites, never copy them

## Context
Community sites hold tutorials and builds. Their terms limit reuse: DPLN art. 4.2 forbids reproduction, and N1ark's robots.txt says `use=reference`.

## Decision
- Link to them.
- DPLN: a link only when a page title exactly matches the quest name.
- Fashionista: only its public read-only API, cached one hour on the server.
- No scraping, no copied text or code.

## Consequences
- 1,390 quests get a tutorial link; the others say none was found.
- Builds depend on Fashionista's API staying available.
- The Fashionista maintainers must be informed before launch.
