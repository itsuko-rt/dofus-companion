# Research log

Newest first. One line per research session; details in the linked note or report.

| Date | Question | Result | Where |
|---|---|---|---|
| 2026-11-20 | How do DofusDB and dofus-maps.com present maps and resources? | Both use per-map resource data that isn't in the game files. Decision: link to them instead of rebuilding | [[ADR-0005 Remove the in-site map]] |
| 2026-11-20 | Can exact gathering spots be derived from `maps.sqlite`? | No. A graphic → resource inference covered 14% and gave wrong results | `docs/INTEGRATION_RESULTS.md` (historical) |
| 2026-11-19 | Is there an Ankama API for personal progress? | No (DNS failure, 403 on character pages) | `docs/RAPPORT_SUCCES_SCAN.md` §1 |
| 2026-11-19 | Can progress sync in real time? | Not safely: only via memory, packets or injection, all sanctioned | `docs/RAPPORT_SUCCES_SCAN.md` §2 |
| 2026-11-19 | Which sources for game data and builds? | dofus-sqlite as source of truth, dofusdude for items, Fashionista API for builds, links for the rest | `docs/RAPPORT_ARCHITECTURE.md` §2 |
| 2026-11-19 | What do the quest files contain? | Real prerequisites in `startCriterion`, with AND, OR and exclusion | `docs/RAPPORT_ARCHITECTURE.md` §3 |
| 2026-11-19 | How do the four build tools compare? | `docs/AUDIT_UX.md` §1 | `docs/AUDIT_UX.md` |
