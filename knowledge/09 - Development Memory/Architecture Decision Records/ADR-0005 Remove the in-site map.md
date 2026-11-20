---
type: adr
status: accepted
date: 2026-11-20
---
# ADR-0005 Remove the in-site map

## Context
- An interactive world map was built on 2026-11-20: official artwork, zones, resource filters, POI layers and a route planner.
- The game files give resources per **zone**, not per map, so the map couldn't match what DofusDB and Dofus Maps show.
- The owner decided not to develop or maintain an in-site map.

## Decision
- Remove the map entirely: UI, API (`/api/world`), loader, artwork download, map-only tables, saved routes on characters.
- `/carte` becomes a directory of two external tools, DofusDB and Dofus Maps: new tab, `noopener noreferrer`, no iframe.
- Keep the professions guide and its zone data.

## Alternatives considered
Keep improving the map (an accuracy and UX overhaul was implemented, then discarded with the removal).

## Consequences
- **Gains:** less code and attack surface; links rely on tools built for the job.
- **Losses:** saved gathering routes are dropped from characters, and old `/carte?x=` links land on the directory.

Detail: `docs/MAP_REMOVAL_REPORT.md`.
