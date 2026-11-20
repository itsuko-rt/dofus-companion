# World map — implementation

Page: `/carte`. Components: `components/world/WorldMap.tsx` (state, panel, search, routes) and `components/world/MapCanvas.tsx` (drawing, pan, zoom). Data: `GET /api/world/:mapId` (`src/world.ts` → `loadWorld`).

## What the map is
- **Geometry:** one unit is one in-game map, at the same `[x, y]` coordinates players read in the game; y grows southwards. The map is built from `mapsinformationdata`. Each coordinate is given to the zone that most of its maps belong to; indoor maps share their outdoor coordinates.
- **Zones and colours:** each zone is drawn as its cells, with borders where neighbouring cells belong to another zone. The colour is a muted tone picked per region. It says nothing about the terrain, and the source note says so.
- **Artwork:** no Ankama map artwork is used or hotlinked. The release does ship `images-worldmap.zip`, but redistributing it is not ours to decide.
- **Worlds:** 26 worlds are available (Monde des Douze, Harebourg, Osavora, Sufokia's depths…); the selector is in the panel.

## Why SVG rather than Leaflet or MapLibre
Leaflet and MapLibre are built around image or vector tiles, and here there are none to serve. The map is a few thousand unit squares plus a few hundred markers. A home-made SVG layer (about 150 lines) handles that with no new dependency:
- pan by dragging;
- zoom with the wheel, a pinch or the buttons;
- markers that keep a constant size on screen;
- zone labels from about 22 px per map.

Clicks are found by hit-testing: the nearest marker within the marker radius, otherwise the zone under the pointer. This is needed because pointer capture redirects the browser's own `click` event to the SVG element.

## Layers (combinable)

| Layer | Source | Display |
|---|---|---|
| Zaaps | `waypointsdata` | Marker at the zaap's coordinates |
| Transports, Donjons, Ateliers, Hôtels de vente, Lieux de classes, Divers… | `hintsdata` (official world-map markers) | One marker per hint, one icon and colour per category |
| Resources / profession | `subareasdata.harvestables` + `skillsdata` | Zones where the resource grows filled in gold; other zones dimmed |
| Monsters | `subareasdata.monsters` | Zones outlined in red |
| Quest-giving NPCs | Quest start data | One marker per zone, with the number of NPCs |
| Route | Saved on the character | Numbered stops and a dashed line |

Event and quest items that the game lists as "harvestable" (such as the Rékloot boxes) are left out: only items a profession actually harvests are resources.

## Zone details
The panel shows:
- name, region, level and centre `[x, y]`;
- the zone's own zaap; if the zone has none (the data uses map 0 at [0, 0] to mean "none"), the nearest zaap in a straight line, labelled as such;
- resources grouped by profession, with a padlock when above the character's level;
- monsters with their level range;
- markers inside the zone;
- quests starting there, with links to the quest map;
- the data version, the source, and the import date.

## Search
Zones, resources, monsters, markers (dungeons, workshops…) and quest NPCs. Each result selects, highlights or recentres the map.

## Route planner
- **Stops:** zones, added one by one or all the zones of a resource at once (filtered by the character's profession level, so locked resources are not proposed).
- **Order:** nearest neighbour, then 2-opt (`orderStops`, tested).
- **Distance:** `|Δx| + |Δy|` between zone centres, a lower bound on the number of maps to cross. The data has no water, walls or exits, so the interface calls it an estimate and never "optimal".
- **Zaaps (option):** a leg may start at the zaap nearest to its destination when that is shorter.
- **Saving:** routes are stored on the active character (at most 20 of 40 stops), reopened from the panel or from the character page, and synced with the account.

## Deep links
- `/carte?metier=2&niveau=45`: profession and level.
- `?ressource=303`, `?monstre=…`, `?zone=95`: one resource, monster or zone.
- `?itineraire=r…`: a saved route.
- `?carte=12`: another world.

## Limits
- **Gathering spots:** the exact cell of each spot is not in this release, so the map works at zone level.
- **Distances:** straight-line estimates only.
- **Small worlds:** the smallest instance worlds (under 20 coordinates) are not offered.
