# Integration results — 2026-11-20

## Shipped
- **Interactive world map** (`/carte`):
  - drawn from the game's own coordinates, 26 worlds;
  - layers: zaaps, official markers, profession resources, monsters, quest NPCs;
  - search, zone details, route planner saved per character, deep links.
- **Professions guide and tracker** (`/metiers`, 22 profession pages):
  - tiers by level from the game's unlocks, with zones and map links;
  - 4,743 recipes, each ingredient with its origin;
  - level per character.
- **Connections between the systems:**
  - profession → map, already filtered by profession, level and resource;
  - map → profession guide;
  - ingredient → map or crafting profession;
  - character page → saved routes → map.
- **Navigation:** "Carte" and "Métiers" in the main bar. Labels show from 1280 px; below that, icons with labels for screen readers.
- **Import:** `scripts/world-import.ts`, run by `npm run import` or alone. `npm run assets` also downloads the icons of harvested resources (local copies, git-ignored).
- **SEO:** `/carte`, `/metiers` and every profession page are in the sitemap (162 pages), each with one h1 and its own description.

## Checks (production build)
- **Unit tests:** 74/74 (new `tests/world.test.ts`: route order, zaap shortcuts, brackets, outlines, character storage, loaders against the real database).
- **Playwright:** 26/26 in Edge, desktop and mobile. New in `e2e/world.spec.ts`:
  - layers toggle;
  - search → zone details → resource highlight;
  - profession → map → route saved → reopened from the character page;
  - per-character independent levels;
  - professions index and recipes.
- **TypeScript:** no errors. `next build` OK.
- **Link check:** 162 pages, 169 internal links, no problem.
- **Security probe:** unchanged. Isolation between accounts, CSRF, throttling and body limits all hold.

## Measured
- **Map data:** `/api/world/1` is about 370 KB of JSON (gzip ≈ 60 KB), cached one hour.
- **Tailor page:** 604 KB of HTML before moving the long recipe lists to the API, 78 KB after.

## Known limits
- **Gathering spots:** shown per zone; the exact cells are not in the release.
- **Route distances:** straight-line estimates between zone centres.
- **Missing data:** no XP rates, prices or community advice, because the files don't have them (`PROFESSIONS_SYSTEM.md`). Phase 7 (XP and kamas routes) is not implemented for the same reason.
- **Recipe icons:** not downloaded (4,700+ images). Resource icons are.
