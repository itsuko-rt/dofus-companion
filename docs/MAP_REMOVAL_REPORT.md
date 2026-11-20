# Map removal report, 2026-11-20

The in-site interactive world map is removed. `/carte` is now a short directory of two external map tools.

## Removed
| What | Where |
|---|---|
| Map UI: canvas, markers, layers, filters, search palette, details panel, sidebar, settings, route planner | `components/world/` (MapCanvas, WorldMap, MapFilters, MapSearch, MapDetails, layers): deleted |
| Map API | `app/api/world/[map]/route.ts`: deleted (`/api/world/*` now returns 404, checked by E2E) |
| Map data loader and helpers | `loadWorld`, coordinate parsing, `/travel`, clustering, zone outlines and anchors, route ordering, mine and cave rules: removed from the shared module |
| Map artwork download | `scripts/fetch-worldmap.ts`: deleted; `npm run assets` now only fetches item and class icons |
| Local map assets | `public/ankama/worldmap/` (git-ignored tiles) and the downloaded `images-worldmap.zip`: deleted locally |
| Map tables | `world_map`, `world_cell`, `world_map_alt`, `world_hint`, `world_zaap`, `world_dungeon`, `world_npc`, `monster`: no longer imported, and dropped from existing databases on the next import (done on the local database) |
| Saved gathering routes | `Character.routes`, `saveRoute` / `removeRoute`, the routes card on the character page. Old saved data is ignored by `sanitizeCharacter` (tested). |
| Map tests and docs | Map E2E and unit tests; `WORLD_MAP_IMPLEMENTATION.md` and the two unpublished overhaul reports. `INTEGRATION_PLAN.md` / `INTEGRATION_RESULTS.md` are marked historical. |
| Dependencies | None. No package was used only by the map: `@xyflow/react` and `dagre` serve the quest graph, and `tesseract.js` serves the scanner. |

## Kept (shared with other features)
- **Professions:**
  - the `/metiers` pages, `GET /api/professions/:slug`, recipes and gathering tiers;
  - per-character profession levels.
- **Profession data:**
  - zones per resource, with region, level and zaap;
  - the module moved from `src/world*.ts` to `src/professions.ts` and `src/professions-shared.ts`;
  - the import moved from `scripts/world-import.ts` to `scripts/professions-import.ts`, which keeps only `world_area`, `world_subarea`, `job`, `gather_skill` and `recipe`.
- **Quest map:** the "carte des quêtes" (quest graph under `/progression/quetes`) is a different feature and is untouched.

## Links updated
- **Navigation:** the entry is renamed "Cartes" and still points to `/carte`.
- **Profession guide:**
  - "Voir sur la carte" became "Cartes interactives", which opens `/carte`;
  - the "Les N zones sur la carte" links were removed (zone names are still listed);
  - a harvested ingredient now links to its profession guide.
- **Character page:** the routes list was removed; the card is now "Métiers".
- **Old deep links** (`/carte?x=…&y=…`) still land on the directory without errors (E2E).
- **Privacy policy:** now lists DofusDB and Dofus Maps (contacted only when the user clicks).

## The new `/carte`
- **Content:** two cards, DofusDB (`https://dofusdb.fr/fr/tools/map`) and Dofus Maps (`https://dofus-maps.com/`), each with a monogram tile, its host name, a description and "Ouvrir … (site externe, nouvel onglet)".
- **Link attributes:** `target="_blank" rel="noopener noreferrer"`.
- **Embedding:** none, no iframe (the CSP keeps `frame-src 'none'`).
- **No logos:** monograms are used instead of their logos, so their branding is neither copied nor hotlinked. A note says both sites are independent and have their own privacy rules.

## Verification
- **TypeScript:** passes.
- **Unit tests:** 72 pass, including professions without map tables and characters dropping old routes.
- **E2E: 22 pass** (desktop and mobile). They cover:
  - the profession guide → `/carte`;
  - external links with `target` and `rel` set, and no iframe;
  - `/api/world` returning 404;
  - every sitemap page loading with one h1, no script error and no CSP violation;
  - the navigation bar.
- **Production build:** succeeds; `/carte` is now static.
