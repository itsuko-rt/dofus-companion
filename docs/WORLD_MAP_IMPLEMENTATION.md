# World map — implementation (updated 2026-11-20)

Page: `/carte`. Code: `components/world/`:
- `WorldMap.tsx`: state, deep links, keyboard shortcuts, route planner;
- `MapCanvas.tsx`: drawing, pan and zoom, hit-testing;
- `MapFilters.tsx`: resources and layers;
- `MapDetails.tsx`: the selected map;
- `MapSearch.tsx`: the search palette;
- `layers.tsx`: points of interest.

Data comes from `GET /api/world/:mapId?s=2` (`src/world.ts`). Pure helpers live in `src/world-shared.ts` and are tested.

## Reference studied: DofusDB (dofusdb.fr/fr/tools/map)
What DofusDB does, and what we kept:
- **Map:** Leaflet over the official world-map artwork, with a map grid and coordinates shown on hover.
- **Resources:** buttons per profession that open a grid of resource icons; a total count per resource ("581" for Ash).
- **Map clicks:** information about the clicked map.

Our version keeps the same information hierarchy but uses our own interface. Profession filters sit in a side panel with levels, and details appear in a card. Search uses a palette (Ctrl+K), which DofusDB does not offer. Nothing is copied from DofusDB's code or data.

## Foundation
- **Official artwork:** the game ships the world map as tiles (`images-worldmap.zip` in the dofus-sqlite release): 1024 px tiles, row by row, at 5 scales for the Monde des Douze (0.2 to 1). `scripts/fetch-worldmap.ts`, run by `npm run assets`:
  - copies them to `public/ankama/worldmap/`, git-ignored and never committed, as for the other Ankama images;
  - writes an `index.json` of the scales.
  The map shows "Carte © Ankama". Without the tiles, the zones are drawn in colour from the coordinates.
- **Alignment:** taken from the game data (`worldmapsdata`): map `(x, y)` covers `origin + (x·mapW, y·mapH)`. For the Monde des Douze, origin is (6480, 4944) and each map is 69.5 × 49.7 px; the world is 10,000 × 9,664 px, which matches 9 × 1024 + 784 by 9 × 1024 + 448. This was checked visually: [5, −18] falls on Astrub's zaap.
- **Display:**
  - the tile scale follows the zoom, and only tiles in view are loaded;
  - zones and borders are drawn over the artwork; the hovered map is outlined, the selected map is framed;
  - region names are shown when zoomed out, zone names when zoomed in.
- **Controls:**
  - pan by dragging or with the arrow keys;
  - zoom with the wheel, a pinch, the +/− buttons or the + / − / 0 keys;
  - "Réinitialiser la vue" and "Effacer les filtres" buttons;
  - 26 worlds can be chosen.
- **Clicks:** found by hit-testing, so any map on the world can be clicked, as well as the markers.

## Resource filters (map side)
- **Layout:** one collapsible section per gathering profession: Bûcheron, Mineur, Alchimiste, Paysan, Pêcheur.
- **Resources:** icon, name and unlock level for each, all from the game data (`skillsdata`).
- **Level selector:** one per profession, starting from the active character's level. Resources above it show a padlock, and "Tout afficher (≤ niv. N)" only selects the reachable ones.
- **Selection:** several resources at once, across professions. "Masquer" clears a profession, "Tout effacer" clears everything, and a text field filters the resources.
- **On the map:** zones with a selected resource are highlighted, and the resource's icon sits at the zone centre. Markers cluster with a count when zoomed out; clicking a cluster zooms in.

## Points of interest (separate layers)

| Layer | Source | Precision |
|---|---|---|
| Zaaps | `waypointsdata` | Exact map |
| Transports | Official markers "Transports" (`hintsdata`) | Exact map |
| Donjons | `dungeonsdata.entranceMapId` (with recommended level), plus "Donjons" markers not already covered | Exact map |
| Ateliers | Official markers | Exact map |
| Hôtels de vente | Official markers | Exact map |
| Temples de classe | Official markers "Lieux de classes" | Exact map |
| PNJ donneurs de quêtes | `questsdata.startPosition` (NPC and starting map) | Exact map |
| Mines et grottes | Official markers whose name contains mine, grotte, caverne, souterrain or galerie (dungeons and workshops excepted) | Exact map |
| Autres repères | Other official markers (banks, taverns, attitudes…) | Exact map |

**Hidden maps:** not in the game files, so there is no layer, and the panel says so. Each layer's source shows when hovering it in the panel.

## Map details
Clicking a map, a marker or a search result opens a card with:
- the coordinates, with "Copier X,Y" and "Copier /travel X,Y" (or the **C** key);
- the zone, its region and its level;
- what is on that exact map: zaap, dungeon entrance with its level, quest giver with links to the quests;
- the zone's harvestable resources by profession, with a padlock above the level filter;
- **nearby alternatives:** the closest other zones for each selected resource;
- the zone's monsters with their level ranges;
- the zone's other markers;
- quests starting in the zone, and a link to the guides.

The selected map is stored in the URL (`?x=&y=`), so a link reopens it.

## Search (Ctrl+K or /, Escape to close)
- **Matches:** coordinates (`5,-18`, `[5, -18]`, `5 -18`, `/travel 5,-18`), regions, zones, gathering professions (selects their reachable resources), resources, monsters (zones outlined) and every point of interest.
- **Keyboard:** arrow keys and Enter.
- **Accents:** ignored ("cite" finds "Cité").

## Route planner
Unchanged in principle:
- **Stops:** zones, ordered by nearest neighbour then 2-opt, with an option to use zaaps.
- **Distance:** a straight-line estimate, presented as such.
- **Saving:** routes are stored on the character. "Ajouter les N zones en surbrillance" fills the route from the resource filters.

## What the data does not allow (not shown, never guessed)
- **Exact gathering spots and quantities:** `maps.sqlite` (in the same release) lists 31,707 interactive elements with their map and cell, but only by graphic id, not by resource. I tried deducing the resource by checking which harvestable is common to every zone where a graphic appears. That pins down only 4,281 elements (14%), and some results are implausible (a decorative tree read as "snowdrop"). So resources stay at zone level, with no count, and the interface says so.
- **Route distances:** straight lines, since the data has no walls, water or exits.
- **Hidden maps:** not in the data.

## Tests
- **Unit** (`tests/world.test.ts`):
  - coordinate parsing and `/travel`;
  - clustering;
  - the mine and cave rule;
  - artwork geometry, dungeons and NPCs at real coordinates, Astrub's zaap at [5, −18];
  - plus the earlier route and storage tests.
- **E2E** (`e2e/world.spec.ts`, desktop and mobile):
  - layers;
  - Ctrl+K with coordinates → details → `/travel` copied with C;
  - Escape and the / key;
  - profession filters with the level limit and clearing;
  - profession → map → saved route → reopened from the character page.
