# Reference repository audit — 2026-11-20

## Finding: the reference project is this repository

The brief compared two projects: the current site and a reference extracted from `dofus-companion-main.zip` that calls itself "Atlas des Douze". When I checked, they turned out to be the same project:

- **Archive comment:** the ZIP comment gives commit `6f38cc675dea33bbcb62ae6abd7269526159cb84`. That is the current `main` (commit "Audit follow-up: Playwright E2E suite…").
- **File comparison:** `diff -rq --strip-trailing-cr` between the extracted ZIP and the working copy shows no difference. The only extra paths are local and git-ignored: `public/ankama/`, `data/` and `node_modules/`.
- **Origin:** GitHub generated this ZIP from `itsuko-rt/dofus-companion` (Code → Download ZIP). "Atlas des Douze" is the site's own brand name (`src/brand.ts`).

So there is nothing to merge, port or reconcile. Phases 1–2 of the brief (inspect both projects, establish what can be reused) reduce to confirming that the current code is the source of truth. The modules the brief lists are already in production here, with tests:

| Module | State |
|---|---|
| `src/criteria.ts`, `src/graph.ts`, `src/views.ts` | Quest and achievement engine, compact layout (tests: criteria, graph, views) |
| `src/recognize.ts`, `components/scan/ocr.ts` | Scanner, OCR in the browser (tests: recognize) |
| `src/stats.ts`, `src/spells.ts` | Build stats, spell elements (tests: effects, data) |
| `src/server/auth.ts` | Accounts, after the security audit (tests: auth, plus E2E) |
| `src/load.ts`, `scripts/import.ts` | Game data import and loading |

**Licences:** same author and same code, so no licence question arises. The game data comes from `ledouxm/dofus-sqlite` (game files extracted by the community) and `dofusdude`, as before.

The new work, the world map and the professions, is described in `INTEGRATION_PLAN.md` and `INTEGRATION_RESULTS.md`.
