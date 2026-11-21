---
type: session
date: 2026-11-21
---
# 2026-11-21 Ecosystem research and encyclopaedia

## What changed
- **Research** (sites observed in a browser; nothing copied; DofusDB not queried because of its licence):
  - [[Teckium Tool Analysis]]: 34 Dofus 3 tools, the overlay and the launcher. Its overlay is a Document Picture-in-Picture window;
  - [[Competitor Analysis]]: Teckium, DofusDB, DofusPlanet, Dafous, Dofus Quests, Tougli, DofusBook, DPLN and Ganymède, with a feature matrix and what not to build;
  - [[Desktop Companion Research]]: five options compared, game-integrity rules (Ankama's terms text UNVERIFIED), the MVP.
- **Architecture:** [[Ecosystem Architecture]] and [[ADR-0008 Companion window in the browser]].
- **Encyclopaedia** (`/encyclopedie`, `src/encyclopedia.ts`): monster, item, dungeon, zone and set sheets built from the game database, every link going both ways, with a universal search (`/api/encyclopedie/search`).
- **Drop odds** (`dropOdds`, `DropOdds.tsx`): exact probability over N fights. Prospection is not applied, because its rule is not in the game files.
- **Atelier** (`/metiers/atelier`, `/api/atelier`, `src/atelier-shared.ts`): craft list per character, sub-crafts, « J’ai », done crafts, share link; « Ajouter à l’atelier » on item sheets.
- **Companion** (`/compagnon`, `/api/compagnon`): an always-on-top window, with a popup and then a message as fallbacks. It shows a step-by-step Dofus guide generated from the quest graph (« Quête terminée » marks the quest in the tracker), achievements pinned from the Succès page, and search. See [[Companion Window]].
- **Links between existing pages:**
  - achievement objective places and dungeon rows link to sheets;
  - `&a=<id>` opens an achievement;
  - level page names link to sheets;
  - Dofus guide pages open the companion;
  - the profession index links to the atelier;
  - the menu entry « Cartes » became « Encyclopédie ».
- **Data:** `ObjectivePlace.id`; achievement dungeons carry their `id`.

## Why
The owner asked Atlas to become a connected companion ecosystem, studying Teckium in depth, then building the most valuable features. The biggest gap was the encyclopaedia, which Teckium, DofusDB and Dafous all have; Atlas already held the data. The overlay was the most requested idea: the browser's always-on-top window gives it without an install.

## Files affected
- New: `src/encyclopedia.ts`, `src/encyclopedia-shared.ts`, `src/atelier.ts`, `src/atelier-shared.ts`, `src/companion.ts`, `src/companion-shared.ts`, `app/encyclopedie/**`, `app/metiers/atelier/page.tsx`, `app/compagnon/page.tsx`, `app/api/encyclopedie/search/route.ts`, `app/api/atelier/route.ts`, `app/api/compagnon/route.ts`, `components/encyclopedia/*`, `components/companion/*`, `components/professions/AtelierView.tsx`, `tests/ecosystem.test.ts`, `e2e/ecosystem.spec.ts`.
- Changed: `src/load.ts` (place and dungeon ids), `components/progression/AchievementCard.tsx`, `components/progression/AchievementsView.tsx`, `components/progression/LevelView.tsx`, `components/professions/ProfessionsIndex.tsx`, `components/Nav.tsx`, `app/guides/dofus/[slug]/page.tsx`, `playwright.config.ts` (mobile also runs the ecosystem spec), `tests/data.test.ts`.

## Tests performed and results
- Typecheck clean. `npm test`: **106/106**. That includes drop odds checked by hand (1 % → 63.4 % over 100 fights, 69 fights for 50 %), the atelier with fixtures (sub-crafts, done lines, uncraftable items, a recipe cycle), guide positions, and real-data checks that sheets agree both ways (drop ↔ dropped by, recipe ↔ used in, key ↔ opens).
- Production build OK. 200 random sheets (40 per kind) all returned 200, and unknown ids return 404.
- E2E, desktop and mobile: **59 passed, 1 skipped** by design (the class test is desktop-only), 0 failed. The 10 new ecosystem tests are included.
- Screenshots at 1366 px and 375 px: monster, item and companion; no horizontal overflow.
- Found and fixed:
  - item page 500: a client-only icon handler was used in a server page;
  - icon 404s: only local icons are referenced now;
  - companion `?guide=` link applied to the placeholder character;
  - Picture-in-Picture refusal was unhandled: now it falls back to a popup, then a message;
  - a render-time side effect.

## Remaining issues
- **Not verified with the game running:** the companion window staying above DOFUS needs the owner's own click; the browser pane blocks automated popups.
- Sheets are not in the sitemap yet (about 28,000).
- Zones and dungeons have no coordinates: the zaap of a zone is shown when the data has one, but there is no map.
- Item icons exist only for the 148 that were downloaded.

## Next recommended actions
1. Owner: open `/compagnon` in Chrome or Edge with DOFUS running windowed, and check that the window stays on top.
2. See « Next steps » in [[Ecosystem Architecture]].
