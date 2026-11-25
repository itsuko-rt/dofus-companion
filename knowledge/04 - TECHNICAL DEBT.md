---
type: debt
updated: 2026-11-25
---
# Technical debt

Known weaknesses in the code and the data, with where they live and what would fix them. Gathered on 2026-11-25 from:
- `docs/PR2_TECHNICAL_REVIEW.md`;
- `docs/SECURITY_AUDIT.md`;
- the `shortcut:` comments in the code;
- [[03 - DEVELOPMENT STATUS#Known limitations]].

Nothing here is new: each line points to its source. The "Fix" column comes from the source; it was not re-planned.

## Data foundation (PR #2 review, all unresolved)
| Id | Problem | Effect / fix |
|---|---|---|
| M2 | Quest objective targets are matched by name | Needs the `quest_objective` table with game ids |
| M3 | Dungeons and instances are missing from zones | Needs every subarea imported |
| M4 | Drop fields are not imported; there are duplicates | Data foundation work |
| M5 | Profession progress % | **Not verified in game** |
| M6 | What monster XP means | **Not verified in game.** The level page shows « valeur de base… » and never computes earned XP |
| M7 | Static routes bake in a 503 when the data is missing at build time | Small fix, planned for the next PR |
| M8 | Importer structure | Architectural work (review §7, §11) |

## Performance and code (PR #2 review, low priority, unresolved)
| Id | Problem | Where | Fix |
|---|---|---|---|
| L1 | `itemSources()` reruns two full `GROUP BY` scans on every call (item search about 270–320 ms) | `src/professions.ts`, `src/load.ts` | Build the maps once per database path |
| L2 | N+1 queries in `searchItems` (up to 120 rows) | `src/load.ts` | Fine at this scale; batch if the limit grows |
| L3 | `loadClassExtras` loads the graph data twice | `src/load.ts` | Build the graph from one `loadGraphData` result |
| L4 | `useWarmQuests` does not cancel its idle callback | `components/Nav.tsx` | `cancelIdleCallback` |
| L5 | The level field cannot be emptied while typing | `components/progression/LevelView.tsx` | Keep the raw text, clamp on blur |
| L6 | Ankama game text (19 class summaries) is committed in Git | `src/breed-data.json` | Owner decision: accept, or generate at build time |
| L7 | No index on `monster.name` and `item.name` | import scripts | Disappears with M2; otherwise add indexes |
| L8 | Real-data tests skip silently without `data/` | `tests/data.test.ts` | Fail in CI when the database is missing |

## Security (accepted or open, from `docs/SECURITY_AUDIT.md`)
| Id | Problem | State |
|---|---|---|
| F5 | Password reset cannot work in production: no e-mail provider | Open, launch blocker |
| F6 | Without `TRUSTED_IP_HEADER`, failed logins are counted per e-mail only, so a victim's login can be locked | Configuration at deploy |
| F7 | Account enumeration through registration | Open, solved with e-mail verification |
| F8 | No e-mail verification | Open, needs F5 |
| F9 | CSP allows `'unsafe-inline'` scripts | Accepted; revisit with nonces |
| F10 | 30-day sessions, no idle timeout, no "log out other devices" | Accepted; planned |
| F11 | No global storage quota (20 characters × 2 MB per account) | Accepted; monitor |
| F12 | Session cookie without the `__Host-` prefix | Optional hardening |

## Shortcuts marked in the code
| Where | Limit |
|---|---|
| `src/effects.ts` | The zero-plural marker is dropped; only the « Dommage(s) / Résistance(s) » wording is affected |
| `src/graph.ts` | AND-alternatives inside an OR are flattened, for drawing only |
| `src/stats.ts` | Mount stats are skipped: they are not in the item data |
| `scripts/import.ts` | A dungeon's minimum level is not a hard condition until its in-game meaning is confirmed |

## Product limits that are debt
- **Scanner:**
  - never measured on real DOFUS screens;
  - names that start with numbers cannot be matched;
  - the OCR model loads from jsDelivr.
  
  See [[Character Sync OCR]].
- **Quest conditions:** 621 of 1,984 quests have conditions the engine cannot fully interpret ([[Quests]]). After each patch, `node scripts/profile-codes.ts` shows which codes are still unknown.
- **Scan history:** only the last 8 entries are shown (`components/scan/ScanView.tsx`).
- **Documentation:** see [[03 - DEVELOPMENT STATUS#Missing documentation]].
