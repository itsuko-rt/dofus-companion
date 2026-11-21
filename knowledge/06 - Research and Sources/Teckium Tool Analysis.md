---
type: research
date: 2026-11-21
status: VERIFIED (tools observed on teckium.fr on 2026-11-21); formulas they use are COMMUNITY
---
# Teckium tool analysis

Teckium (teckium.fr) is a free fan site by the streamer ITeCK covering Dofus 3, Dofus Retro and Wakfu. Its slogan is « Tous mes outils, par-dessus ton jeu ». It has about 70 tools, 34 of them for Dofus 3, no account needed (Discord login only to sync), AdSense advertising, and a Windows launcher.

What was observed: the home page, the tool directory and the pages listed below, read in a browser on 2026-11-21. No data, code or text was copied ([[ADR-0003 Link community sites, never copy them]]). Comparison with the rest of the ecosystem: [[Competitor Analysis]]. Overlay: [[Desktop Companion Research]].

## Product structure
- **Three layers:**
  1. website tools;
  2. a browser **overlay**: a window that stays in front of the game, in Chrome and Edge;
  3. the **Teckium Launcher**, a Windows app: multi-account switching (« Teckium Switch »), a « DPS check » that reads the combat chat, their own games, and the site's tools.
- **Navigation:** pick a game, then « Trouve ton outil » (a searchable directory filtered by game) and « Reprendre » (recently used tools). Every tool page ends with « Ces outils vont bien avec celui-ci ».
- **State:** kept in the browser (localStorage), with optional Discord sync. Prices are crowd-sourced per server with an age colour (green under 3 days, yellow under 2 weeks, red older).

## Dofus 3 tools (as listed on the site)
| Tool | Problem it solves | Inputs → output | Data behind it | Atlas today | Could Atlas do it? Value / complexity |
|---|---|---|---|---|---|
| Encyclopédie (`/encyclopedie-dofus-3/`) | Find an item, resource or monster: stats, recipe, uses, who drops it | name → sheet | items, monsters, drops, recipes (18,458 items, 2,465 monsters) | **missing** as pages (only an equipment search and profession pages) | **Yes**, our game DB has 21,622 items, 5,135 monsters, 13,567 drops and 4,743 recipes. High value / medium |
| Classes et sorts | Class spells | class → spells | spells | done (`/personnage/sorts`) | already |
| Quêtes, Succès | Tracking | per character | quests, achievements | done, stronger (graph, criteria) | already |
| Avis de recherche (82 targets) | Track the wanted posters | character → checklist | monster race « Avis de recherche » + positions | partial (race known, no page) | yes from the `monster` race; positions not in our data. Medium / low |
| Archimonstres (306) | Ocre soul collection, stones to plan | character → checklist | archmonster race + zones | missing | yes (race « Archimonstres » + `monster_subarea`). Medium / low |
| Guide élevage, Croisements, Élevage timers | Mount breeding | two mounts → offspring | breeding rules (community) | missing | rules are not in our files → **not now** |
| Âme en peine | A specific quest helper | — | — | missing | low |
| Guides (overlay) | Step-by-step quest chains to follow while playing | guide → steps, previous/next, position kept | hand-written guides (« Dofus X : toutes les quêtes ») | Dofus guides exist (`/guides/dofus/<slug>`), not step-by-step | **Yes**: our Dofus chains come from the quest graph. High / medium |
| Donjons (126) | Boss, resistances, drops, entrance, key, achievements, strategy | dungeon → sheet | dungeons, bosses, drops, keys (+ hand-written strategy) | missing as pages | yes except strategy text and entrance coordinates. High / medium |
| Harebourg, Minotoror | Boss puzzles | grid input → cell to hit | mechanics (community) | missing | interactive puzzles, community rules → later, low priority |
| Calcul de dégâts | One-turn team damage | stuffs + spells + monsters → damage | damage formula (community), spells, resistances | missing (builds come from DofusBook links) | needs a stuff builder first → later |
| Créateur de stuff, Builds, Panoplies, Skins | Equipment planning | items → stats | items, sets | partial (equipment search, sets in DB) | sets page is cheap and high value; full builder is large |
| Parchotage | Which scrolls a team still needs, and their cost | per character → missing + price | scroll rules, user prices | missing | low value for a solo player (owner plays solo) |
| Atelier de craft | Sum the resources of a craft list, sub-crafts, « J'ai », folders | items + quantities → shopping list | recipes | partial (one profession at a time) | **Yes**, recipes are in our data. High / low-medium |
| Banque | Bank → what can I craft | inventory → crafts | recipes + inventory | missing | needs inventory input (OCR or manual) → later |
| XP métier | Path to level 200, recipe by recipe | job, level → crafts | **community XP formula** | done differently: XP read from the player's screen ([[ADR-0007 Profession XP comes from the player's screen]]) | not with an invented formula |
| Brisage, Runes de forgemagie | Runes and kamas from breaking an item | item + coefficient + prices → runes | rune weights, **community formula**, crowd prices | missing | community formula and prices → only clearly labelled, later |
| Rentabilité des crafts | Cost vs selling price | recipe + server prices → margin | crowd-sourced prices with dates | missing | we have no price source; Atlas must never invent prices → only with user-entered prices |
| Maps (combat, resources) | Placements, resource maps | — | hand-surveyed maps | missing; `/carte` links to DofusDB and Dofus Maps | no (survey data we don't have) |
| Farm Zone | Real farm sessions with kamas | — | the streamer's own sessions | missing | not reproducible honestly |
| Almanax | Day's offering and bonus | date → offering | almanax calendar | done (home card) | already |
| Chasse au trésor | Clue → direction | clue + position → map | clue positions (community) | missing | no data → no |
| PNJ et zaaps | Where an NPC, bank or workshop is, nearest zaap, `/travel` | name → position | NPC positions | missing (zaap coordinates exist per zone) | partial: zone zaaps only. Medium |
| Taux de drop | Chance per fight, fights for 90 % | item rate + prospection + bonuses → odds | game drop rates + **community prospection curve** | missing | **Yes for the exact probability part** (rate → odds over N fights); the prospection curve stays labelled COMMUNITY or user-entered. Medium / low |
| Team, Launcher, multi-account switch, DPS check | Multi-account comfort, damage reading from the chat | — | client windows, chat log | missing | **no**: it interacts with game windows and logs → out of scope ([[Desktop Companion Research]]) |

## What makes Teckium useful
1. **One window over the game.** Guides keep your step, and the main tools fit in a narrow window.
2. **Breadth:** a tool for each recurring chore.
3. **Cross-links:** « Ces outils vont bien avec celui-ci »; the atelier feeds profitability and the drop calculator links to the encyclopaedia.
4. **No account.** Local storage, with optional sync.

## Weaknesses observed
- Many formulas are community estimates (drops above 250 prospection, breaking, profession XP). They are labelled, but the numbers carry most of the weight on the page.
- Prices are crowd-sourced. They are dated, but only as good as their contributors.
- Hand-written guides and strategies need constant upkeep after patches.
- Advertising on every page.
- Information is spread over 34 separate tools. Encyclopaedia sheets, dungeons, drops and the atelier are linked, but each is its own page with its own search.

## Ideas for Atlas, original implementations
- An interconnected **encyclopaedia** (monster ↔ drops ↔ zones ↔ dungeons ↔ achievements ↔ recipes) built from our game DB, with every link going both ways. See [[Ecosystem Architecture]].
- A **companion window** using the same browser capability (Document Picture-in-Picture). Its content is ours: a step-by-step guide generated from the quest graph and tied to the character's real progress, plus pinned achievement objectives.
- An **atelier** built on our recipes, per character.
- **Drop odds** limited to exact probability, from game rates.
