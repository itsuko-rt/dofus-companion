---
type: research
date: 2026-11-21
status: VERIFIED for what was observed on each site on 2026-11-21; UNVERIFIED where marked
---
# Competitor analysis

Sites observed in a browser on 2026-11-21, home page and main tools only. Nothing was copied ([[ADR-0003 Link community sites, never copy them]]). The DofusDB licence restricts ingestion by AI agents, so DofusDB was not queried or ingested: it is described only from public knowledge and the earlier audit.

Deep dive: [[Teckium Tool Analysis]]. Overlays: [[Desktop Companion Research]]. What we build from this: [[Ecosystem Architecture]].

## Sites
### Teckium (teckium.fr)
The broadest toolbox: about 70 tools, 34 of them for Dofus 3, plus an always-on-top overlay and a Windows launcher. Audience: active players, often multi-account. Strengths: breadth, the overlay, no account, cross-links between tools. Weaknesses: community formulas carry much of the weight, crowd-sourced prices, advertising, many separate pages. Details in [[Teckium Tool Analysis]].

### DofusDB (dofusdb.fr)
A large database and toolset: encyclopaedia, harvest maps, treasure hunt helper, many tools. Audience: everyone. **Its licence restricts AI-agent ingestion: never call its API or ingest its data.** Atlas links to it (`/carte`).

### DofusPlanet (dofusplanet.fr)
Tracks quests and dungeon achievements with an account, an « optimised guide », and links to DPLN, DofusBook, DofusDB, Dofus Portals, JOL and Profus. Small, focused and clean. Atlas already covers its scope with deeper data: the quest graph, prerequisites, achievement objectives.

### Dafous (dafous.app)
Dofus Unity tools: a search across objects, monsters, quests, resources, guides and professions (⌘K), the Almanax of the day, a drop calculator with a default character (100 prospection, challenge 50 %, solo), pet XP, a resistance calculator, a set simulator, an « AI build generator », a marketplace, and Ocre tracking. It says its tools are « conçus pour rester ouverts pendant que tu joues ». Its universal search is worth matching.

### Dofus Quests (dofus.n1ark.com)
Profiles, quest and achievement checklists, Almanax and backup/restore. A lightweight checklist tracker. Its backup and export are worth matching (Atlas has accounts, but no file export).

### Tougli (tougli.barbofus.com)
Quest guides. The site renders everything client-side and showed only « Chargement… » during this visit: content UNVERIFIED.

### DofusBook, Dofus Pour Les Noobs (DPLN), DofusGuide
- DofusBook: the reference stuff and skin simulator. Atlas reads Fashionista builds and links to DofusBook.
- DPLN: hand-written quest and achievement walkthroughs. Atlas links to them as guides (334 achievement guides, 1,390 external guides in the DB).
- DofusGuide: quest guides; not re-examined (UNVERIFIED).

### Ganymède, and overlay projects
Ganymède is a community quest-guide app with an overlay (the GanymedeTeam/GanymedeApp repository was given as open source on Reddit, UNVERIFIED). LightInn/dofus-hunteRS is an overlay for treasure hunts, « not a bot, just an assistive tool ». Lindo is a historical third-party client for Dofus Touch: **do not follow that path**, since it is a modified client. See [[Desktop Companion Research]].

## Feature matrix
✔ done · ◐ partial · ✖ missing · — not offered

| Feature | Atlas | Teckium | DofusDB | DofusPlanet | Dafous | n1ark |
|---|---|---|---|---|---|---|
| Quest tracker with prerequisites | ✔ (graph) | ◐ | ◐ | ✔ | ◐ | ✔ |
| Achievement tracker, objectives | ✔ | ✔ | ◐ | ◐ (dungeons) | — | ✔ |
| Character-aware suggestions | ✔ | — | — | — | — | — |
| Multiple characters | ✔ | ◐ | — | ✔ | — | ✔ |
| Encyclopaedia: items, monsters | ✖ → **built 2026-11-21** | ✔ | ✔ | — | ✔ | — |
| Dungeon sheets | ✖ → **built** | ✔ | ✔ | ◐ | — | — |
| Zone sheets | ◐ (level page) → **built** | ◐ | ✔ | — | — | — |
| Universal search | ◐ (achievements, items) → **built** | ✔ (tools) | ✔ | — | ✔ | — |
| Dofus quest chains | ✔ | ✔ (guides) | ◐ | ✔ | ◐ | — |
| Step-by-step guide in an always-on-top window | ✖ → **prototype built** | ✔ | — | — | ◐ | — |
| Level page: zones, XP, loot | ✔ | — | ◐ | — | — | — |
| Profession journal, resources by zone | ✔ | ◐ | ✔ | — | ✔ | — |
| Craft list summing resources (atelier) | ◐ → **built** | ✔ | ◐ | — | ◐ | — |
| Drop odds | ✖ → **built (exact part)** | ✔ | ◐ | — | ✔ | — |
| Profession XP path | ◐ (from the player's screen) | ✔ (community formula) | ◐ | — | ✔ | — |
| Breaking, runes | ✖ | ✔ (community) | ✔ | — | — | — |
| Prices and profitability | ✖ | ✔ (crowd prices) | ✔ | — | ✔ | — |
| Stuff builder | ✖ (links DofusBook) | ✔ | ✔ | — | ✔ | — |
| Combat maps, treasure hunts | ✖ (links) | ✔ | ✔ | — | — | — |
| Breeding | ✖ | ✔ | ✔ | — | — | — |
| Almanax | ✔ | ✔ | ✔ | — | ✔ | ✔ |
| Screenshot import of progress | ✔ (local OCR) | ◐ (inventory) | — | — | — | — |
| Backup / export | ◐ (account) | ◐ (Discord) | — | ✔ | — | ✔ |

## Classification
1. **Atlas already does well:** the quest graph and prerequisites; achievement objectives with what is deduced; class-aware suggestions; the level page; the profession journal; local screenshot OCR; Almanax.
2. **Incomplete:** universal search (achievements and items only); dungeon and zone information (spread over the level and achievement pages); crafting (one profession at a time); backup and export.
3. **Missing:** encyclopaedia sheets (items, monsters, dungeons, zones, sets); a companion window; drop odds; an atelier; a stuff builder; breaking and prices; breeding; maps.
4. **Could set Atlas apart:**
   - every sheet linked both ways (monster ↔ drops ↔ zones ↔ dungeons ↔ achievements ↔ recipes ↔ quests);
   - a companion guide generated from the real quest graph and tied to the character's progress, rather than hand-written guides that go stale;
   - honesty labels on every number;
   - no advertising by default ([[ADR-0006 No ads or analytics without consent]]).
5. **Do not build, for now:**
   - multi-account switching and DPS check: they interact with the game client or its logs;
   - crowd-sourced prices: they need moderation and an audience;
   - farm session journals: not reproducible honestly;
   - breeding calculators and treasure hunts: their rules and positions are not in our game files;
   - boss puzzle solvers: community rules, high upkeep.
