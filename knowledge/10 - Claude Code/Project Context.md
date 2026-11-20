# Project context (read first)

- **What:** Atlas des Douze, a DOFUS 3 (Unity) companion. Quests, achievements, Dofus, scanner, characters, spells, builds, equipment, professions. Fan site, not affiliated with Ankama.
- **Game data version:** 3.7.14.18 (dofus-sqlite `v6.0_3.7.14.18`, dofusdude `3.7.14.18`).
- **Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript 7, Tailwind 4, `node:sqlite`, Playwright, tesseract.js. Node 24+.
- **Two databases:**
  - `data/game-<version>.sqlite`: game data, rebuilt by the import, read-only at runtime;
  - `data/app.sqlite`: accounts and characters, migrated forward, never deleted.
- **Structure:**
  - `src/`: pure, tested logic, plus `src/server/` for accounts;
  - `app/`: routes and API;
  - `components/`: UI;
  - `scripts/`: import and tools;
  - `tests/`: node:test;
  - `e2e/`: Playwright;
  - `docs/`: long reports.
- **Hard rules:**
  - no invented game data;
  - link community sites, don't copy them;
  - never interact with the game client;
  - no secrets in Git;
  - no ads or analytics without consent;
  - commit or push only when the owner asks;
  - the owner's e-mail stays private.
- **State:** pre-launch; see [[Current Status]].
- **Owner preferences:** concise answers; smallest complete change; honest reporting of what was and was not verified.

Then go to [[Operating Instructions]] for what to read next.
