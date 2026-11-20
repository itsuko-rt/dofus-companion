---
type: adr
status: accepted
date: 2026-11-19
---
# ADR-0001 Game data from the game files

## Context
Quest prerequisites, achievements, spells and items are needed for every feature. Guides can be scraped, but their terms forbid it and they go stale.

## Decision
Compute everything from the game files of each version: dofus-sqlite releases, plus dofusdude for items. Quest prerequisites come from each quest's `startCriterion`, compiled into a graph.

## Alternatives considered
- Scraping DofusBook or DPLN: forbidden by their terms, or behind Cloudflare.
- The DofusDB API: its robots.txt blocks AI bots, and it holds the same data anyway.

## Consequences
- Accurate for the imported version; must be re-imported after each patch.
- Undocumented condition codes have to be shown as unknown.
- Ordering advice ("which quest first") isn't in the files and stays community content.

Source: `docs/RAPPORT_ARCHITECTURE.md` §0, §4.
