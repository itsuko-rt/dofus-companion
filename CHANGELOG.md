# Changelog

Every commit of Atlas des Douze, newest first. Each entry gives the commit's date and time, its SHA (linked to GitHub),
its message, the files it added, modified, removed or renamed, and the fixes and tests its message mentions.

- **Updated automatically** after each push to `main` by the « Update changelog » workflow
  (`.github/workflows/update-changelog.yml`, script `scripts/changelog.ts`).
- Entries for commits made before the workflow existed were reconstructed from the git history on 2026-11-25, with the
  same script. Details a commit does not record (tests run, for example) are not invented: they are simply absent.
- An entry, once written, is never rewritten by the script: corrections made by hand are kept.
- The project overview, for readers new to the project, is in [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md).

<!-- entries: generated below, keep this line -->

## 2026-11-25

<!-- entry sha=869248536a087f025386b28e57da49baeddf1f89 date=2026-11-25T19:45:33+01:00 -->
### Game companion phases 8-9: always-on-top overlay, hardening and test report

[`8692485`](https://github.com/itsuko-rt/dofus-companion/commit/869248536a087f025386b28e57da49baeddf1f89) · 2026-11-25 19:45:33 +01:00

Phase 8
- companion/overlay.html: optional overlay above the game (character, mode, list, site link, last readings, capture,
  emergency stop); Ctrl+Shift+F10, tray, button or --overlay; not focusable, screen-saver level, position kept

Phase 9
- Heading names: 13 achievements share a category name and 207 a subarea name (3.7.14.18); a name that is also a
  category, area or subarea name is never certain, only « à confirmer » (new static /api/compagnon/titres)
- companion/log.mjs: log read back after a restart (answers, de-duplication, crash-cut lines, 30-day pruning)
- Electron lockdown (no pop-ups, no navigation); hostile text stays text; API preflight tests
- Tests: 132/132 unit, 66 E2E passed 1 skipped, companion self-tests, npm audit 0 (site and companion)
- Vault: design note test report and limitations, API, security, integrations, status, roadmap, session summaries

**Added (6):** `app/api/compagnon/titres/route.ts`, `companion/log.mjs`, `companion/overlay.html`, `knowledge/09 - Development Memory/Session Summaries/2026-11-25 Game companion phase 8 overlay.md`, `knowledge/09 - Development Memory/Session Summaries/2026-11-25 Game companion phase 9 hardening.md`, `tests/companion-log.test.ts`

<details><summary><strong>Modified (17)</strong></summary>

- `CLAUDE.md`
- `companion/main.mjs`
- `companion/preload.cjs`
- `companion/read.mjs`
- `companion/ui.html`
- `knowledge/01 - PROJECT ROADMAP.md`
- `knowledge/03 - DEVELOPMENT STATUS.md`
- `knowledge/05 - DOCUMENTATION INDEX.md`
- `knowledge/05 - Technical Documentation/API Documentation.md`
- `knowledge/05 - Technical Documentation/Game Companion Design.md`
- `knowledge/05 - Technical Documentation/Integrations.md`
- `knowledge/08 - Security and Deployment/Security Overview.md`
- `knowledge/09 - Development Memory/Session Summaries/Session Summaries.md`
- `src/companion-read.ts`
- `src/load.ts`
- `tests/companion-api.test.ts`
- `tests/companion-read.test.ts`

</details>

**Tests (from the commit message):**
- Electron lockdown (no pop-ups, no navigation); hostile text stays text; API preflight tests
- Tests: 132/132 unit, 66 E2E passed 1 skipped, companion self-tests, npm audit 0 (site and companion)
- Vault: design note test report and limitations, API, security, integrations, status, roadmap, session summaries

<!-- /entry -->

<!-- entry sha=25ec0dc66e90adcff012b402e7aeb5d19f2db187 date=2026-11-25T19:32:00+01:00 -->
### Game companion phase 7: several characters and accounts

[`25ec0dc`](https://github.com/itsuko-rt/dofus-companion/commit/25ec0dc66e90adcff012b402e7aeb5d19f2db187) · 2026-11-25 19:32:00 +01:00

- companion/foreground.mjs: title of the window in front (user32, one PowerShell loop, no dependency); with several
  DOFUS windows the active one follows the player, and character.seen is sent when the character played changes
- src/game-window.ts: login and character-selection title « Dofus &lt;version&gt; - &lt;channel&gt; », as seen in game
- Site « Profils liés au jeu »: in-game name, en jeu / profil actif tags, last seen, server and account labels, unlink;
  one keyed list sorted by account (fix: editing the account no longer loses the server being typed)
- E2E: two characters on two accounts (switching, no crossing, labels, unlink); mode change waits for the companion
- Tests: 125/125 unit, 66 E2E passed 1 skipped; vault design note, status, session summary

**Added (2):** `companion/foreground.mjs`, `knowledge/09 - Development Memory/Session Summaries/2026-11-25 Game companion phase 7 characters and accounts.md`

**Modified (10):** `companion/main.mjs`, `components/companion/CompanionSyncPanel.tsx`, `e2e/companion-sync.spec.ts`, `knowledge/01 - PROJECT ROADMAP.md`, `knowledge/03 - DEVELOPMENT STATUS.md`, `knowledge/05 - DOCUMENTATION INDEX.md`, `knowledge/05 - Technical Documentation/Game Companion Design.md`, `knowledge/09 - Development Memory/Session Summaries/Session Summaries.md`, `src/game-window.ts`, `tests/game-window.test.ts`

**Bugs fixed (from the commit message):**
- one keyed list sorted by account (fix: editing the account no longer loses the server being typed)

**Tests (from the commit message):**
- E2E: two characters on two accounts (switching, no crossing, labels, unlink); mode change waits for the companion
- Tests: 125/125 unit, 66 E2E passed 1 skipped; vault design note, status, session summary

<!-- /entry -->

<!-- entry sha=8d308ca0bb8cb082422a129c59299d239d46686f date=2026-11-25T19:16:39+01:00 -->
### Game companion phase 6: sync with the site (local API, pairing, modes, confirmations, idempotent writes)

[`8d308ca`](https://github.com/itsuko-rt/dofus-companion/commit/8d308ca0bb8cb082422a129c59299d239d46686f) · 2026-11-25 19:16:39 +01:00

- companion/api.mjs: 127.0.0.1:47120, bearer pairing code, Host and Origin checks, validated acks and controls, 64 KB limit
- src/companion-sync.ts: event validation, exact in-game name matching, observation/assisted/automatic decisions,
  completions written to the character seen (eventId kept in history, never applied twice)
- Site: sync engine on every page once paired, « Compagnon Windows » panel on /compagnon (pairing, status, mode,
  emergency stop, pending confirmations, create or link a profile), nav badge; CSP connect-src allows the companion
- Character model: optional gameName, server, account, lastSeenAt, companion source and eventId (no table change)
- Companion: serves its events, keeps the site's answers, « Site Atlas » section; fix: pairing code now saved
- Tests: 125/125 unit, e2e/companion-sync.spec.ts 2/2, full E2E 65 passed 1 skipped; vault notes and session summary

**Added (8):** `companion/api.mjs`, `components/companion/CompanionSyncPanel.tsx`, `components/companion/companion-sync.ts`, `e2e/companion-sync.spec.ts`, `knowledge/09 - Development Memory/Session Summaries/2026-11-25 Game companion phase 6 sync.md`, `src/companion-sync.ts`, `tests/companion-api.test.ts`, `tests/companion-sync.test.ts`

<details><summary><strong>Modified (17)</strong></summary>

- `app/compagnon/page.tsx`
- `companion/main.mjs`
- `companion/preload.cjs`
- `companion/ui.html`
- `components/Nav.tsx`
- `components/useCharacter.ts`
- `knowledge/00 - PROJECT DASHBOARD.md`
- `knowledge/01 - PROJECT ROADMAP.md`
- `knowledge/03 - DEVELOPMENT STATUS.md`
- `knowledge/05 - DOCUMENTATION INDEX.md`
- `knowledge/05 - Technical Documentation/API Documentation.md`
- `knowledge/05 - Technical Documentation/Database Schema.md`
- `knowledge/05 - Technical Documentation/Game Companion Design.md`
- `knowledge/08 - Security and Deployment/Security Overview.md`
- `knowledge/09 - Development Memory/Session Summaries/Session Summaries.md`
- `next.config.ts`
- `src/character.ts`

</details>

**Bugs fixed (from the commit message):**
- Companion: serves its events, keeps the site's answers, « Site Atlas » section; fix: pairing code now saved

**Tests (from the commit message):**
- Tests: 125/125 unit, e2e/companion-sync.spec.ts 2/2, full E2E 65 passed 1 skipped; vault notes and session summary

<!-- /entry -->

<!-- entry sha=13b4d9d484a4dc2ba387d95417d0950c6f6d8ea5 date=2026-11-25T18:57:39+01:00 -->
### Game companion phases 4-5: read finished-quest and obtained-achievement lists into completion events

[`13b4d9d`](https://github.com/itsuko-rt/dofus-companion/commit/13b4d9d484a4dc2ba387d95417d0950c6f6d8ea5) · 2026-11-25 18:57:39 +01:00

- companion/read.mjs: framed capture, upscaling, Tesseract 6.0.1 in the main process, game names from /api/graph (cached)
- src/companion-read.ts: evidence rules (declared list only, isCertain = sûr, likely = à confirmer, shared names dropped)
- src/threshold.ts: two-level Otsu thresholding shared by the browser scanner and the companion
- companion: list selector, drag framing, read summary and raw text, de-duplicated events, interval read on change,
  --self-test-read / --self-test-ui / live --self-test &lt;list&gt;
- Tests: threshold and evidence-rule units (117/117), scanner E2E 4/4; vault design note, status, session summary

**Added (6):** `companion/read.mjs`, `knowledge/09 - Development Memory/Session Summaries/2026-11-25 Game companion phases 4 and 5.md`, `src/companion-read.ts`, `src/threshold.ts`, `tests/companion-read.test.ts`, `tests/threshold.test.ts`

<details><summary><strong>Modified (14)</strong></summary>

- `companion/main.mjs`
- `companion/package-lock.json`
- `companion/package.json`
- `companion/preload.cjs`
- `companion/ui.html`
- `components/scan/ocr.ts`
- `knowledge/01 - PROJECT ROADMAP.md`
- `knowledge/02 - PROJECT ARCHITECTURE.md`
- `knowledge/03 - DEVELOPMENT STATUS.md`
- `knowledge/05 - DOCUMENTATION INDEX.md`
- `knowledge/05 - Technical Documentation/Character Sync OCR.md`
- `knowledge/05 - Technical Documentation/Game Companion Design.md`
- `knowledge/05 - Technical Documentation/Integrations.md`
- `knowledge/09 - Development Memory/Session Summaries/Session Summaries.md`

</details>

**Tests (from the commit message):**
- -self-test-read / --self-test-ui / live --self-test &lt;list&gt;
- Tests: threshold and evidence-rule units (117/117), scanner E2E 4/4; vault design note, status, session summary

<!-- /entry -->

<!-- entry sha=dda20403c3d673ca473da7f3402409bc7811cc3e date=2026-11-25T18:31:30+01:00 -->
### Game companion phase 3: DOFUS window detection, character from the window title, capture, modes, emergency stop

[`dda2040`](https://github.com/itsuko-rt/dofus-companion/commit/dda20403c3d673ca473da7f3402409bc7811cc3e) · 2026-11-25 18:31:30 +01:00

- src/game-window.ts parses « character - class - version - channel » from the OS window list (tests for all 19 classes)
- companion/ (Electron 45.3.0, own package.json): window watcher, character.seen events in a 30-day local log,
  in-memory capture by button, tray, Ctrl+Shift+F9 or interval (off by default), modes, Ctrl+Shift+F12 stop
- Vault: Game Companion Design, ADR-0009, roadmap, status, integrations, session summary; CLAUDE.md commands

**Added (10):** `companion/main.mjs`, `companion/package-lock.json`, `companion/package.json`, `companion/preload.cjs`, `companion/ui.html`, `knowledge/05 - Technical Documentation/Game Companion Design.md`, `knowledge/09 - Development Memory/Architecture Decision Records/ADR-0009 Windows companion reads the window title and screen.md`, `knowledge/09 - Development Memory/Session Summaries/2026-11-25 Game companion audit and phase 3.md`, `src/game-window.ts`, `tests/game-window.test.ts`

**Modified (8):** `CLAUDE.md`, `knowledge/01 - PROJECT ROADMAP.md`, `knowledge/02 - PROJECT ARCHITECTURE.md`, `knowledge/03 - DEVELOPMENT STATUS.md`, `knowledge/05 - DOCUMENTATION INDEX.md`, `knowledge/05 - Technical Documentation/Integrations.md`, `knowledge/09 - Development Memory/Architecture Decision Records/Architecture Decision Records.md`, `knowledge/09 - Development Memory/Session Summaries/Session Summaries.md`

**Tests (from the commit message):**
- src/game-window.ts parses « character - class - version - channel » from the OS window list (tests for all 19 classes)

<!-- /entry -->

<!-- entry sha=8b80f6bcd5a86cd96deb4e1f3ee97de9853927ba date=2026-11-25T15:30:05+01:00 -->
### Vault: one dashboard, seven project notes, archive, links and facts checked against the code

[`8b80f6b`](https://github.com/itsuko-rt/dofus-companion/commit/8b80f6bcd5a86cd96deb4e1f3ee97de9853927ba) · 2026-11-25 15:30:05 +01:00

Home and Current Status renamed to 00 - PROJECT DASHBOARD and 03 - DEVELOPMENT STATUS (option A);
roadmap, architecture map, technical debt and documentation index added; planning notes and daily
logs archived unchanged; stale module lists and routes corrected; CLAUDE.md, the vault checker and
the bookmark point to the new names. Nothing deleted.

**Added (8):** `knowledge/00 - PROJECT DASHBOARD.md`, `knowledge/01 - PROJECT ROADMAP.md`, `knowledge/02 - PROJECT ARCHITECTURE.md`, `knowledge/03 - DEVELOPMENT STATUS.md`, `knowledge/04 - TECHNICAL DEBT.md`, `knowledge/05 - DOCUMENTATION INDEX.md`, `knowledge/09 - Development Memory/Session Summaries/2026-11-25 Vault cleanup and reorganisation.md`, `knowledge/Development.base`

<details><summary><strong>Modified (27)</strong></summary>

- `CLAUDE.md`
- `knowledge/.obsidian/bookmarks.json`
- `knowledge/00 - Dashboard/Project Overview.md`
- `knowledge/00 - Dashboard/Quick Links.md`
- `knowledge/01 - Project Management/Vision and Goals.md`
- `knowledge/02 - Game Knowledge/Dungeons/Dungeons.md`
- `knowledge/02 - Game Knowledge/Monsters/Monsters.md`
- `knowledge/05 - Technical Documentation/API Documentation.md`
- `knowledge/05 - Technical Documentation/Architecture.md`
- `knowledge/05 - Technical Documentation/Authentication.md`
- `knowledge/05 - Technical Documentation/Character Sync OCR.md`
- `knowledge/05 - Technical Documentation/Data Pipeline.md`
- `knowledge/05 - Technical Documentation/Database Schema.md`
- `knowledge/05 - Technical Documentation/Ecosystem Architecture.md`
- `knowledge/05 - Technical Documentation/Integrations.md`
- `knowledge/06 - CLEANUP REPORT.md`
- `knowledge/09 - Development Memory/Bug History/Bug History.md`
- `knowledge/09 - Development Memory/Session Summaries/2026-11-20 Game data and product audit.md`
- `knowledge/09 - Development Memory/Session Summaries/2026-11-20 PR 2 pre-merge fixes.md`
- `knowledge/09 - Development Memory/Session Summaries/2026-11-20 PR 2 technical review.md`
- `knowledge/09 - Development Memory/Session Summaries/2026-11-21 Achievements redesign.md`
- `knowledge/09 - Development Memory/Session Summaries/2026-11-21 Achievements refinement.md`
- `knowledge/09 - Development Memory/Session Summaries/Session Summaries.md`
- `knowledge/10 - Claude Code/Operating Instructions.md`
- `knowledge/10 - Claude Code/Project Context.md`
- `knowledge/README.md`
- `scripts/check-knowledge.ts`

</details>

**Removed (2):** `knowledge/00 - Dashboard/Current Status.md`, `knowledge/00 - Dashboard/Home.md`

**Renamed (10):** `knowledge/09 - Development Memory/Bug History/Wrong zone at [0, 0] on the removed map.md` → `knowledge/09 - Development Memory/Bug History/Wrong zone at (0, 0) on the removed map.md`, `knowledge/09 - Development Memory/Development Logs/2026-11-19 log.md` → `knowledge/99 - Archive/Development Logs/2026-11-19 log.md`, `knowledge/09 - Development Memory/Development Logs/2026-11-20 log.md` → `knowledge/99 - Archive/Development Logs/2026-11-20 log.md`, `knowledge/09 - Development Memory/Development Logs/Development Logs.md` → `knowledge/99 - Archive/Development Logs/Development Logs.md`, `knowledge/01 - Project Management/Feature Backlog.md` → `knowledge/99 - Archive/Feature Backlog.md`, `knowledge/01 - Project Management/Milestones.md` → `knowledge/99 - Archive/Milestones.md`, `knowledge/01 - Project Management/Priorities.md` → `knowledge/99 - Archive/Priorities.md`, `knowledge/01 - Project Management/Product Roadmap.md` → `knowledge/99 - Archive/Product Roadmap.md`, `knowledge/06 - Research and Sources/Research Archive/Research Archive.md` → `knowledge/99 - Archive/Research Archive.md`, `knowledge/00 - Dashboard/Setup Report.md` → `knowledge/99 - Archive/Setup Report.md`

<!-- /entry -->

<!-- entry sha=09bc4e99918eae1951681bfd98828b96fa67334d date=2026-11-25T15:23:09+01:00 -->
### Vault: cleanup report (audit and proposal), baseline before reorganisation

[`09bc4e9`](https://github.com/itsuko-rt/dofus-companion/commit/09bc4e99918eae1951681bfd98828b96fa67334d) · 2026-11-25 15:23:09 +01:00

**Added (1):** `knowledge/06 - CLEANUP REPORT.md`

<!-- /entry -->

## 2026-11-23

<!-- entry sha=8ffe8b79c054825c9049918f075adf4c8f754dde date=2026-11-23T17:26:05+01:00 -->
### Scanner: frame the list on the shared window, live reading status, sharper change detection

[`8ffe8b7`](https://github.com/itsuko-rt/dofus-companion/commit/8ffe8b79c054825c9049918f075adf4c8f754dde) · 2026-11-23 17:26:05 +01:00

- Drag a frame around the list on the live preview (kept for next time): only that part is read, faster and
  cleaner than the whole game window with its scene and chat
- Automatic reading watches the frame only: the moving game scene no longer triggers reads; a scrolled list is
  detected (pixels that clearly changed on a 200 px thumbnail, instead of a blurred 64x64 average)
- Live status: "Lecture…", then names recognised / new / saved, and a hint to frame the list when nothing matched
- E2E: shared window with a moving scene and chat, framing by drag, quiet while only the scene moves, new names
  read after a scroll

**Added (1):** `components/scan/FramePicker.tsx`

**Modified (5):** `components/scan/ScanView.tsx`, `components/scan/ocr.ts`, `e2e/scan.spec.ts`, `knowledge/05 - Technical Documentation/Character Sync OCR.md`, `knowledge/09 - Development Memory/Session Summaries/2026-11-23 Scanner that saves quests and achievements.md`

**Tests (from the commit message):**
- E2E: shared window with a moving scene and chat, framing by drag, quiet while only the scene moves, new names

<!-- /entry -->

<!-- entry sha=e1da0c2601403a889d7f26727598f3443c4c9c57 date=2026-11-23T01:52:15+01:00 -->
### Scanner: read game lists reliably, save what is read with certainty, share the game window

[`e1da0c2`](https://github.com/itsuko-rt/dofus-companion/commit/e1da0c2601403a889d7f26727598f3443c4c9c57) · 2026-11-23 01:52:15 +01:00

- OCR: two-level Otsu thresholding and ~2000 px upscaling; striped game lists went from 2/7 names read to 7/7
- Names read exactly (whole line, unshared, clear, not a short label) are saved at once, undoable in the history;
  near-exact names are pre-ticked for one click (switch to turn automatic saving off)
- Window sharing session: share DOFUS once, "Lire maintenant" or automatic reading while scrolling the list
  (new view only, at most every 1.5 s, stops after 10 minutes)
- "Voir le texte lu" shows the raw OCR text of each capture
- Tests: recognize unit tests, e2e/scan.spec.ts (quests PNG, achievements JPEG, auto-save off, window sharing)

**Added (2):** `e2e/scan.spec.ts`, `knowledge/09 - Development Memory/Session Summaries/2026-11-23 Scanner that saves quests and achievements.md`

**Modified (8):** `components/scan/ScanView.tsx`, `components/scan/ocr.ts`, `knowledge/00 - Dashboard/Current Status.md`, `knowledge/05 - Technical Documentation/Character Sync OCR.md`, `knowledge/06 - Research and Sources/Desktop Companion Research.md`, `knowledge/09 - Development Memory/Session Summaries/Session Summaries.md`, `src/recognize.ts`, `tests/recognize.test.ts`

**Tests (from the commit message):**
- Tests: recognize unit tests, e2e/scan.spec.ts (quests PNG, achievements JPEG, auto-save off, window sharing)

<!-- /entry -->

## 2026-11-21

<!-- entry sha=5503976737ebb9dc05b763e536a5b292b76f7d7a date=2026-11-21T05:54:56+01:00 -->
### Sitemap: encyclopaedia, atelier, companion, dungeon and zone sheets (624 URLs, all crawled by E2E)

[`5503976`](https://github.com/itsuko-rt/dofus-companion/commit/5503976737ebb9dc05b763e536a5b292b76f7d7a) · 2026-11-21 05:54:56 +01:00

**Modified (3):** `app/sitemap.ts`, `e2e/ui.spec.ts`, `knowledge/05 - Technical Documentation/Ecosystem Architecture.md`

<!-- /entry -->

<!-- entry sha=a274a82ea21418d31930b2f9983c8ff0cb1192af date=2026-11-21T05:52:05+01:00 -->
### Connected encyclopaedia, atelier, drop odds and always-on-top companion window

[`a274a82`](https://github.com/itsuko-rt/dofus-companion/commit/a274a82ea21418d31930b2f9983c8ff0cb1192af) · 2026-11-21 05:52:05 +01:00

- /encyclopedie: monster, item, dungeon, zone and set sheets from the game DB, linked both ways
  (drops ↔ dropped by, recipe ↔ used in, key ↔ dungeon, zones, quests, achievements), one search
- Drop odds: exact probability over N fights from the game's base rate (prospection not applied)
- /metiers/atelier: per-character craft list, resources from the recipes, sub-crafts, "J'ai", share link
- /compagnon: Document Picture-in-Picture window (popup, then message as fallback), step-by-step Dofus
  guide from the quest graph that marks quests in the tracker, pinned achievements, search
- Existing pages link to sheets (achievement places and dungeons, level page), &a= opens an achievement,
  Dofus guides open the companion, nav "Cartes" becomes "Encyclopédie"
- Tests: tests/ecosystem.test.ts, e2e/ecosystem.spec.ts (desktop and mobile)
- Vault: Ecosystem Architecture, Companion Window, ADR-0008, status, roadmap, API, session summary

<details><summary><strong>Added (35)</strong></summary>

- `app/api/atelier/route.ts`
- `app/api/compagnon/route.ts`
- `app/api/encyclopedie/search/route.ts`
- `app/compagnon/page.tsx`
- `app/encyclopedie/donjon/[id]/page.tsx`
- `app/encyclopedie/monstre/[id]/page.tsx`
- `app/encyclopedie/objet/[id]/page.tsx`
- `app/encyclopedie/page.tsx`
- `app/encyclopedie/panoplie/[id]/page.tsx`
- `app/encyclopedie/zone/[id]/page.tsx`
- `app/metiers/atelier/page.tsx`
- `components/companion/CompanionView.tsx`
- `components/companion/PinButton.tsx`
- `components/companion/companion-store.ts`
- `components/companion/usePip.ts`
- `components/encyclopedia/AddToAtelier.tsx`
- `components/encyclopedia/DropOdds.tsx`
- `components/encyclopedia/EncyclopediaSearch.tsx`
- `components/encyclopedia/ItemImage.tsx`
- `components/encyclopedia/Sheet.tsx`
- `components/encyclopedia/atelier-store.ts`
- `components/encyclopedia/icons.ts`
- `components/professions/AtelierView.tsx`
- `e2e/ecosystem.spec.ts`
- `knowledge/05 - Technical Documentation/Companion Window.md`
- `knowledge/05 - Technical Documentation/Ecosystem Architecture.md`
- `knowledge/09 - Development Memory/Architecture Decision Records/ADR-0008 Companion window in the browser.md`
- `knowledge/09 - Development Memory/Session Summaries/2026-11-21 Ecosystem research and encyclopaedia.md`
- `src/atelier-shared.ts`
- `src/atelier.ts`
- `src/companion-shared.ts`
- `src/companion.ts`
- `src/encyclopedia-shared.ts`
- `src/encyclopedia.ts`
- `tests/ecosystem.test.ts`

</details>

<details><summary><strong>Modified (14)</strong></summary>

- `app/guides/dofus/[slug]/page.tsx`
- `components/Nav.tsx`
- `components/professions/ProfessionsIndex.tsx`
- `components/progression/AchievementCard.tsx`
- `components/progression/AchievementsView.tsx`
- `components/progression/LevelView.tsx`
- `knowledge/00 - Dashboard/Current Status.md`
- `knowledge/01 - Project Management/Product Roadmap.md`
- `knowledge/05 - Technical Documentation/API Documentation.md`
- `knowledge/09 - Development Memory/Architecture Decision Records/Architecture Decision Records.md`
- `knowledge/09 - Development Memory/Session Summaries/Session Summaries.md`
- `playwright.config.ts`
- `src/load.ts`
- `tests/data.test.ts`

</details>

**Tests (from the commit message):**
- Tests: tests/ecosystem.test.ts, e2e/ecosystem.spec.ts (desktop and mobile)

<!-- /entry -->

<!-- entry sha=57c4efc500470509654666e1a0353b9944128a69 date=2026-11-21T05:52:05+01:00 -->
### Research: competitor analysis, Teckium tool analysis, desktop companion options

[`57c4efc`](https://github.com/itsuko-rt/dofus-companion/commit/57c4efc500470509654666e1a0353b9944128a69) · 2026-11-21 05:52:05 +01:00

Observed on 2026-11-21 in a browser, nothing copied; DofusDB not queried (licence).
Feature matrix, what not to build, overlay architectures compared, game-integrity rules.

**Added (3):** `knowledge/06 - Research and Sources/Competitor Analysis.md`, `knowledge/06 - Research and Sources/Desktop Companion Research.md`, `knowledge/06 - Research and Sources/Teckium Tool Analysis.md`

<!-- /entry -->

<!-- entry sha=0ef399ac36249bcecb569be01ea6ee426026c7e3 date=2026-11-21T04:33:46+01:00 -->
### Succès refinement: medallions, points tiers, objective places, linked "Où aller", lighter sidebar

[`0ef399a`](https://github.com/itsuko-rt/dofus-companion/commit/0ef399ac36249bcecb569be01ea6ee426026c7e3) · 2026-11-21 04:33:46 +01:00

- Entries: category medallion with a ring filled by objectives met, check/star badges, points pill tiered by the
  game's point values, one state line ("En cours · 1/2"), tighter rows, green wash for obtained
- Detail sheet: at-a-glance strip (what is left, reward), objective cards with distinct status marks, reward tiles,
  completion footer that says what to do (confirm / "Je l'ai obtenu" / obtained banner with undo)
- Objectives name their monster, zone or dungeon from the game data (level range, zones it lives in) with a link to
  the level page at that level; "Où aller" rows link quests, dungeons (level page) and Dofus guides
- Level page reads ?niveau=N
- Sidebar: icon tiles, mini completion rings, gold active state, long names on two lines instead of truncated
- Data: objective `place` (name index built once per database), `dofus` as { name, slug }; dofusSlugs moved to load.ts
- API URLs carry v=2 so browsers never reuse a cached response of the former shape
- Tests: places and slug unit test, ?niveau= E2E test, details heading renamed

**Added (1):** `knowledge/09 - Development Memory/Session Summaries/2026-11-21 Achievements refinement.md`

**Modified (11):** `components/progression/AchievementCard.tsx`, `components/progression/AchievementsView.tsx`, `components/progression/LevelView.tsx`, `e2e/ui.spec.ts`, `knowledge/00 - Dashboard/Current Status.md`, `knowledge/05 - Technical Documentation/API Documentation.md`, `knowledge/07 - Design System/Design Decisions.md`, `knowledge/09 - Development Memory/Session Summaries/Session Summaries.md`, `src/guides-data.ts`, `src/load.ts`, `tests/data.test.ts`

**Tests (from the commit message):**
- Tests: places and slug unit test, ?niveau= E2E test, details heading renamed

<!-- /entry -->

<!-- entry sha=99bec5cf5b36bbb3794699bbdd055231842aa3f5 date=2026-11-21T04:13:50+01:00 -->
### Succès visual redesign: header dashboard, compact entries, side detail panel, mobile drawer

[`99bec5c`](https://github.com/itsuko-rt/dofus-companion/commit/99bec5cf5b36bbb3794699bbdd055231842aa3f5) · 2026-11-21 04:13:50 +01:00

- Header: progress ring, points earned/total, obtained/total, to confirm, search and scanner
- Sidebar: category icons, thin progress lines, gold active edge, collapsible families
- Entries: compact dark rows with a category emblem and state badge, one preview line, points, state, objective bar
- Details: parchment sheet (objectives with state, where to go, rewards, actions) in a sticky side panel from 1280 px, inline below
- Category header with emblem, percentage and points; per-state counts on the filters; skeleton loading
- Phones: slide-in category drawer, scrolling filters
- E2E Succès test follows the new structure (details region, filter count)

**Added (1):** `knowledge/09 - Development Memory/Session Summaries/2026-11-21 Achievements visual redesign.md`

**Modified (7):** `app/globals.css`, `components/progression/AchievementCard.tsx`, `components/progression/AchievementsView.tsx`, `e2e/ui.spec.ts`, `knowledge/00 - Dashboard/Current Status.md`, `knowledge/07 - Design System/Design Decisions.md`, `knowledge/09 - Development Memory/Session Summaries/Session Summaries.md`

**Tests (from the commit message):**
- E2E Succès test follows the new structure (details region, filter count)

<!-- /entry -->

<!-- entry sha=b9f9a29f24785692cd1ecd226b09e2ad302ca415 date=2026-11-21T03:55:10+01:00 -->
### Succès redesign: "Pour vous" landing, category families, full search, clearer cards

[`b9f9a29`](https://github.com/itsuko-rt/dofus-companion/commit/b9f9a29f24785692cd1ecd226b09e2ad302ca415) · 2026-11-21 03:55:10 +01:00

- "Pour vous" (default view): to confirm, nearly done (real progress only: a
  level condition alone does not count; Temporis and events left out; at most
  2 per category), class-linked, at your level (main progression, -10/+5, at
  most 3 per category), recently obtained; every item says why it is shown.
  A short "Par ou commencer ?" guide until anything is marked.
- The game's 15 root categories grouped in 3 families (main progression first,
  activities, events and Temporis apart), one-line hints, sub-category chips,
  a "Parcourir" category picker on mobile; view kept in the URL so the back
  button works.
- One accent-insensitive search over names, objective texts (monsters,
  quests, places), dungeons, categories and descriptions, with what matched
  (GET /api/achievements/search, in-memory index built once per database).
- Cards: 5 states with icon + label (Obtenu, A confirmer, En cours, A faire,
  Plus tard), objectives, "Ou aller" (quests with status, dungeons from the
  game data, Dofus), rewards, guide; filters by state and level, sorting.
- GET /api/achievements?ids= for recommendations; achievements carry their
  dungeons. Paging by 100 and batched queries kept.
- Tests: recommendation unit tests, real-data search tests, rewritten Succes
  E2E (desktop + mobile, back button, no overflow). typecheck clean, 97/97
  unit, E2E 47 passed / 1 skipped by design.

**Added (5):** `app/api/achievements/search/route.ts`, `components/progression/AchievementCard.tsx`, `knowledge/09 - Development Memory/Session Summaries/2026-11-21 Achievements redesign.md`, `src/achievement-guide.ts`, `tests/achievement-guide.test.ts`

**Modified (9):** `app/api/achievements/route.ts`, `components/progression/AchievementsView.tsx`, `e2e/ui.spec.ts`, `knowledge/00 - Dashboard/Current Status.md`, `knowledge/05 - Technical Documentation/API Documentation.md`, `knowledge/07 - Design System/Design Decisions.md`, `knowledge/09 - Development Memory/Session Summaries/Session Summaries.md`, `src/load.ts`, `tests/data.test.ts`

**Tests (from the commit message):**
- Tests: recommendation unit tests, real-data search tests, rewritten Succes
- E2E (desktop + mobile, back button, no overflow). typecheck clean, 97/97
- unit, E2E 47 passed / 1 skipped by design.

<!-- /entry -->

## 2026-11-20

<!-- entry sha=b9fa821e9d862098bdc33c0300805b6e03ff9957 date=2026-11-20T18:14:11+01:00 -->
### PR #2 review: exact verification results, coverage confirmations, summons test

[`b9fa821`](https://github.com/itsuko-rt/dofus-companion/commit/b9fa821e9d862098bdc33c0300805b6e03ff9957) · 2026-11-20 18:14:11 +01:00

- Report §12.2: commands, exit codes and counts of two full runs (the second
  on the clean commit 25f2a8a): typecheck 0, unit 90/90, build 0, E2E 47
  passed / 1 skipped by design / 0 failed.
- Report §12.2b: Almanax coverage (730 days of 2026-2027, 21 December,
  period bonuses), summons and no deleted records, why H3's server-side
  variant was not adopted (payload measurements), E2E bottleneck measurements
  and the choice of 6 batches of 30 pages.
- Level-page data test: every summon race is excluded and none appears in a zone.
- zones.ts: restore a space lost in the previous commit (no behaviour change).

**Modified (4):** `docs/PR2_TECHNICAL_REVIEW.md`, `knowledge/09 - Development Memory/Session Summaries/2026-11-20 PR 2 pre-merge fixes.md`, `src/zones.ts`, `tests/data.test.ts`

**Tests (from the commit message):**
- on the clean commit 25f2a8a): typecheck 0, unit 90/90, build 0, E2E 47
- passed / 1 skipped by design / 0 failed.
- variant was not adopted (payload measurements), E2E bottleneck measurements
- Level-page data test: every summon race is excluded and none appears in a zone.

<!-- /entry -->

<!-- entry sha=25f2a8aa350af83ae40347a3eb46daa20fc02833 date=2026-11-20T18:03:05+01:00 -->
### Fix PR #2 pre-merge blockers: Almanax season tie, level page XP and zones, demand ranking, sitemap E2E

[`25f2a8a`](https://github.com/itsuko-rt/dofus-companion/commit/25f2a8aa350af83ae40347a3eb46daa20fc02833) · 2026-11-20 18:03:05 +01:00

- Almanax: among entries of equal precision the one with fewer dates wins, so a
  season listing its days no longer replaces the day's offering (81 wrong days
  of 2026 -&gt; 0); the season stays a period bonus.
- Level page: XP 0 in the files means "not set": shown as "XP non renseignée";
  archmonsters, quest monsters, wanted targets, Dopeuls and summons left out of
  the zone lists only (game race names), kept in the database.
- Craft-demand ranking uses every unconditional drop, not each monster's top 3.
- Sitemap E2E split into 6 equal batches (full suite 6.0 -&gt; 4.1 min, green).
- Real-data regression tests for each; report §12, inventory and vault updated.

**Added (1):** `knowledge/09 - Development Memory/Session Summaries/2026-11-20 PR 2 pre-merge fixes.md`

<details><summary><strong>Modified (13)</strong></summary>

- `components/progression/LevelView.tsx`
- `docs/GAME_DATA_INVENTORY.md`
- `docs/PR2_TECHNICAL_REVIEW.md`
- `e2e/ui.spec.ts`
- `knowledge/00 - Dashboard/Current Status.md`
- `knowledge/01 - Project Management/Feature Backlog.md`
- `knowledge/09 - Development Memory/Session Summaries/2026-11-20 PR 2 technical review.md`
- `knowledge/09 - Development Memory/Session Summaries/Session Summaries.md`
- `src/almanax-shared.ts`
- `src/zones-shared.ts`
- `src/zones.ts`
- `tests/almanax.test.ts`
- `tests/data.test.ts`

</details>

**Bugs fixed (from the commit message):**
- Fix PR #2 pre-merge blockers: Almanax season tie, level page XP and zones, demand ranking, sitemap E2E

**Tests (from the commit message):**
- Sitemap E2E split into 6 equal batches (full suite 6.0 -&gt; 4.1 min, green).
- Real-data regression tests for each; report §12, inventory and vault updated.

<!-- /entry -->

<!-- entry sha=341559b12344f482564f5322f5f6ea0bae3242a6 date=2026-11-20T17:37:47+01:00 -->
### Docs: PR #2 technical review and knowledge base findings

[`341559b`](https://github.com/itsuko-rt/dofus-companion/commit/341559b12344f482564f5322f5f6ea0bae3242a6) · 2026-11-20 17:37:47 +01:00

Engineering review of develop -&gt; main: verification results, data
integrity queries, ranked findings (Almanax season tie, level page
XP and ranking, demand ranking, sitemap E2E budget), readiness of the
equipment optimizer and progression planner, roadmap. No application
code changed.

**Added (2):** `docs/PR2_TECHNICAL_REVIEW.md`, `knowledge/09 - Development Memory/Session Summaries/2026-11-20 PR 2 technical review.md`

**Modified (4):** `docs/GAME_DATA_INVENTORY.md`, `knowledge/00 - Dashboard/Current Status.md`, `knowledge/09 - Development Memory/Session Summaries/2026-11-20 Autonomous development session.md`, `knowledge/09 - Development Memory/Session Summaries/Session Summaries.md`

**Tests (from the commit message):**
- XP and ranking, demand ranking, sitemap E2E budget), readiness of the

<!-- /entry -->

<!-- entry sha=d3fb282b45c134fdf65f5e906a98b602d38f316d date=2026-11-20T09:58:45+01:00 -->
### Knowledge base: autonomous session summary, status, commands

[`d3fb282`](https://github.com/itsuko-rt/dofus-companion/commit/d3fb282b45c134fdf65f5e906a98b602d38f316d) · 2026-11-20 09:58:45 +01:00

**Added (1):** `knowledge/09 - Development Memory/Session Summaries/2026-11-20 Autonomous development session.md`

**Modified (3):** `knowledge/00 - Dashboard/Current Status.md`, `knowledge/00 - Dashboard/Quick Links.md`, `knowledge/09 - Development Memory/Session Summaries/Session Summaries.md`

<!-- /entry -->

<!-- entry sha=e6526020fb5d15e4d43bf038a6d196c63e8ff451 date=2026-11-20T09:58:09+01:00 -->
### Class pages titled with the class name

[`e652602`](https://github.com/itsuko-rt/dofus-companion/commit/e6526020fb5d15e4d43bf038a6d196c63e8ff451) · 2026-11-20 09:58:09 +01:00

**Modified (2):** `app/personnage/sorts/page.tsx`, `components/SpellGuide.tsx`

<!-- /entry -->

<!-- entry sha=b79780d5084b4698fbd8f6c191d1470649cfe2bf date=2026-11-20T09:56:12+01:00 -->
### Recipes « Avec vos métiers »: only recipes the character can supply with its own profession levels

[`b79780d`](https://github.com/itsuko-rt/dofus-companion/commit/b79780d5084b4698fbd8f6c191d1470649cfe2bf) · 2026-11-20 09:56:12 +01:00

**Added (1):** `tests/professions-shared.test.ts`

**Modified (4):** `components/professions/JobGuide.tsx`, `e2e/professions.spec.ts`, `knowledge/04 - Professions/Professions.md`, `src/professions-shared.ts`

<!-- /entry -->

<!-- entry sha=f75bb253dc39c938ef8d6dcf5e52569d06c5f111 date=2026-11-20T09:54:10+01:00 -->
### Level page: rank zone loot by craft demand (number of game recipes using it), no prices

[`f75bb25`](https://github.com/itsuko-rt/dofus-companion/commit/f75bb253dc39c938ef8d6dcf5e52569d06c5f111) · 2026-11-20 09:54:10 +01:00

**Modified (5):** `components/progression/LevelView.tsx`, `knowledge/03 - Builds and Progression/Kamas Routes/Kamas Routes.md`, `src/zones-shared.ts`, `src/zones.ts`, `tests/data.test.ts`

<!-- /entry -->

<!-- entry sha=cf68e4323cbe86ccfda16c817cf5edd8fe60e63d date=2026-11-20T09:52:11+01:00 -->
### Almanax du jour from the game calendar; home counts quests for the character's class

[`cf68e43`](https://github.com/itsuko-rt/dofus-companion/commit/cf68e4323cbe86ccfda16c817cf5edd8fe60e63d) · 2026-11-20 09:52:11 +01:00

Imports almanaxcalendarsdata (376 entries: date patterns, bonus, offering item and
quantity). Home card: today's offering with its source, bonus, period bonuses and
the next 6 days (Paris day). Every day of 2027 has an offering (data test).

**Added (4):** `app/api/almanax/route.ts`, `components/AlmanaxCard.tsx`, `src/almanax-shared.ts`, `tests/almanax.test.ts`

**Modified (9):** `components/Home.tsx`, `docs/GAME_DATA_INVENTORY.md`, `e2e/ui.spec.ts`, `knowledge/00 - Dashboard/Current Status.md`, `knowledge/01 - Project Management/Feature Backlog.md`, `knowledge/05 - Technical Documentation/Database Schema.md`, `scripts/creatures-import.ts`, `src/load.ts`, `tests/data.test.ts`

**Tests (from the commit message):**
- the next 6 days (Paris day). Every day of 2027 has an offering (data test).

<!-- /entry -->

<!-- entry sha=3314475babe94bb257c0e58c4916239c6246228b date=2026-11-20T09:48:33+01:00 -->
### Class pages: official description, class quests with links, linked achievements

[`3314475`](https://github.com/itsuko-rt/dofus-companion/commit/3314475babe94bb257c0e58c4916239c6246228b) · 2026-11-20 09:48:33 +01:00

**Modified (5):** `app/personnage/sorts/[id]/page.tsx`, `components/SpellGuide.tsx`, `e2e/ui.spec.ts`, `knowledge/00 - Dashboard/Current Status.md`, `src/load.ts`

<!-- /entry -->

<!-- entry sha=eea0e7fb209dbb4ec17cec09d4759185bf67d771 date=2026-11-20T09:46:18+01:00 -->
### Equipment cards: how to obtain each item (recipe with ingredients, or dropping monsters)

[`eea0e7f`](https://github.com/itsuko-rt/dofus-companion/commit/eea0e7fb209dbb4ec17cec09d4759185bf67d771) · 2026-11-20 09:46:18 +01:00

**Modified (4):** `components/equipment/EquipmentView.tsx`, `e2e/ui.spec.ts`, `knowledge/00 - Dashboard/Current Status.md`, `src/load.ts`

<!-- /entry -->

<!-- entry sha=a84ea90d765b2405613d595e81b86028073e7135 date=2026-11-20T09:43:34+01:00 -->
### Quest drawer: where objective monsters live and where objective items come from

[`a84ea90`](https://github.com/itsuko-rt/dofus-companion/commit/a84ea90d765b2405613d595e81b86028073e7135) · 2026-11-20 09:43:34 +01:00

Objectives rendered from the game templates are matched by exact name (~99%).
Item sources (harvest, recipe, drops) moved to itemSources() and SourceLabel,
shared with the profession pages.

**Added (3):** `components/professions/SourceLabel.tsx`, `src/objective-targets.ts`, `tests/objective-targets.test.ts`

**Modified (8):** `components/professions/JobGuide.tsx`, `components/quests/QuestDrawer.tsx`, `e2e/ui.spec.ts`, `knowledge/00 - Dashboard/Current Status.md`, `knowledge/02 - Game Knowledge/Quests/Quests.md`, `src/load.ts`, `src/professions.ts`, `tests/data.test.ts`

<!-- /entry -->

<!-- entry sha=0322ff3afbbbcad517a51f3566d89c6b4fc31f6e date=2026-11-20T07:08:09+01:00 -->
### Warm the quest graph and graph view on idle; no loading frame on revisits

[`0322ff3`](https://github.com/itsuko-rt/dofus-companion/commit/0322ff3afbbbcad517a51f3566d89c6b4fc31f6e) · 2026-11-20 07:08:09 +01:00

First Home → Quêtes at 4x CPU: 730 → 580 ms, blocked main thread 461 → 203 ms
(median of 3, same-time comparison). Skipped with data saver on.

**Modified (3):** `components/Nav.tsx`, `components/quests/useGame.ts`, `docs/GAME_DATA_AND_PRODUCT_AUDIT.md`

<!-- /entry -->

<!-- entry sha=bcf389e2def239529926ee76e168da1bc237241e date=2026-11-20T07:02:11+01:00 -->
### Sharper small favicon from the Emerald Egg; fade-in after loading

[`bcf389e`](https://github.com/itsuko-rt/dofus-companion/commit/bcf389e2def239529926ee76e168da1bc237241e) · 2026-11-20 07:02:11 +01:00

make-icons uses the simplified SVG up to 48 px and writes public/favicon.svg;
large icons unchanged. E2E covers first visit, classes, calculator, level page.

**Added (1):** `public/favicon.svg`

**Modified (9):** `app/globals.css`, `app/layout.tsx`, `brand/emerald-egg-small.svg`, `e2e/ui.spec.ts`, `public/favicon-16x16.png`, `public/favicon-32x32.png`, `public/favicon-48x48.png`, `public/favicon.ico`, `scripts/make-icons.ts`

**Tests (from the commit message):**
- large icons unchanged. E2E covers first visit, classes, calculator, level page.

<!-- /entry -->

<!-- entry sha=42049758befccf0e0e8b8c269d0d1218b92693ce date=2026-11-20T07:02:11+01:00 -->
### Knowledge base: phases 0–6 status, bugs, ADR-0007, session summaries

[`4204975`](https://github.com/itsuko-rt/dofus-companion/commit/42049758befccf0e0e8b8c269d0d1218b92693ce) · 2026-11-20 07:02:11 +01:00

**Added (9):** `knowledge/09 - Development Memory/Architecture Decision Records/ADR-0007 Profession XP comes from the player's screen.md`, `knowledge/09 - Development Memory/Bug History/Blank pages on a first visit.md`, `knowledge/09 - Development Memory/Bug History/Server-only objectives counted as met.md`, `knowledge/09 - Development Memory/Session Summaries/2026-11-20 Class-aware quests and achievements.md`, `knowledge/09 - Development Memory/Session Summaries/2026-11-20 Game data and product audit.md`, `knowledge/09 - Development Memory/Session Summaries/2026-11-20 Game data foundation and all classes.md`, `knowledge/09 - Development Memory/Session Summaries/2026-11-20 Level page for XP and loot.md`, `knowledge/09 - Development Memory/Session Summaries/2026-11-20 Profession calculator and drop sources.md`, `knowledge/09 - Development Memory/Session Summaries/2026-11-20 UX pass and favicon.md`

<details><summary><strong>Modified (18)</strong></summary>

- `knowledge/00 - Dashboard/Current Status.md`
- `knowledge/00 - Dashboard/Project Overview.md`
- `knowledge/00 - Dashboard/Quick Links.md`
- `knowledge/01 - Project Management/Feature Backlog.md`
- `knowledge/02 - Game Knowledge/Achievements/Achievements.md`
- `knowledge/02 - Game Knowledge/Classes/Cra.md`
- `knowledge/02 - Game Knowledge/Game Knowledge.md`
- `knowledge/02 - Game Knowledge/Monsters/Monsters.md`
- `knowledge/02 - Game Knowledge/Quests/Quests.md`
- `knowledge/03 - Builds and Progression/Kamas Routes/Kamas Routes.md`
- `knowledge/03 - Builds and Progression/XP Routes/XP Routes.md`
- `knowledge/04 - Professions/Professions.md`
- `knowledge/05 - Technical Documentation/Database Schema.md`
- `knowledge/07 - Design System/UI UX Guidelines.md`
- `knowledge/07 - Design System/Visual Identity.md`
- `knowledge/09 - Development Memory/Architecture Decision Records/Architecture Decision Records.md`
- `knowledge/09 - Development Memory/Bug History/Bug History.md`
- `knowledge/09 - Development Memory/Session Summaries/Session Summaries.md`

</details>

<!-- /entry -->

<!-- entry sha=71b05abd0f1128cfdba7702a72cd0968a49c966d date=2026-11-20T07:02:10+01:00 -->
### Level page: game suggestions, zones and monsters, dungeons for a level

[`71b05ab`](https://github.com/itsuko-rt/dofus-companion/commit/71b05abd0f1128cfdba7702a72cd0968a49c966d) · 2026-11-20 07:02:10 +01:00

/progression/niveau with a static /api/zones; base monster XP and
unconditional drops only, no prices or rates. Progression tabs fit 375 px.

**Added (5):** `app/api/zones/route.ts`, `app/progression/niveau/page.tsx`, `components/progression/LevelView.tsx`, `src/zones-shared.ts`, `src/zones.ts`

**Modified (3):** `app/sitemap.ts`, `components/progression/ProgressionTabs.tsx`, `tests/data.test.ts`

<!-- /entry -->

<!-- entry sha=4bbae2a21b0ac8351b2f62c6fabeeb2624d1545d date=2026-11-20T07:02:10+01:00 -->
### Profession XP calculator and monster drop sources for loot ingredients

[`4bbae2a`](https://github.com/itsuko-rt/dofus-companion/commit/4bbae2a21b0ac8351b2f62c6fabeeb2624d1545d) · 2026-11-20 07:02:10 +01:00

XP numbers come from the player's screen (no profession XP data in the game
files, ADR-0007); recipes and up to 3 dropping monsters come from game data.

**Added (2):** `src/craft-calc.ts`, `tests/craft-calc.test.ts`

**Modified (4):** `components/professions/JobGuide.tsx`, `e2e/professions.spec.ts`, `src/professions-shared.ts`, `src/professions.ts`

<!-- /entry -->

<!-- entry sha=44c8c4d6376bb663b83fc016a3c19fe30490d2f8 date=2026-11-20T07:02:10+01:00 -->
### Class-aware quests and achievements; server-only objectives no longer count as met

[`44c8c4d`](https://github.com/itsuko-rt/dofus-companion/commit/44c8c4d6376bb663b83fc016a3c19fe30490d2f8) · 2026-11-20 07:02:10 +01:00

- src/class-quests.ts: exclusive / per-class / general quests from PG conditions
- quest tracker: class quest panel, other classes' exclusive quests hidden and not counted
- achievements: 'Pour votre classe' panel; one category navigation with progress
- mobile quest header: one stats line and a Filtres button

**Added (1):** `src/class-quests.ts`

**Modified (5):** `components/progression/AchievementsView.tsx`, `components/quests/QuestTracker.tsx`, `src/achievements.ts`, `src/regions.ts`, `tests/achievements.test.ts`

<!-- /entry -->

<!-- entry sha=ca5d1abe92412cd9259f9a5c341b068f4b9550c1 date=2026-11-20T07:02:09+01:00 -->
### Support all 19 playable classes from game data

[`ca5d1ab`](https://github.com/itsuko-rt/dofus-companion/commit/ca5d1abe92412cd9259f9a5c341b068f4b9550c1) · 2026-11-20 07:02:09 +01:00

components/breeds.ts is built from src/breed-data.json (official title, roles,
complexity); presentation keeps colour and Fashionista name (all 19 checked).
Onboarding grid with complexity; builds route guards missing names.

**Added (1):** `tests/breeds.test.ts`

**Modified (5):** `app/api/builds/route.ts`, `components/Home.tsx`, `components/breeds.ts`, `components/character/ClassCard.tsx`, `components/character/Onboarding.tsx`

<!-- /entry -->

<!-- entry sha=b14ef2aca7628b2d87ddd07cebab88ae6b035a1d date=2026-11-20T07:02:09+01:00 -->
### Fix first-visit blank pages; batch achievement queries; build quest graph once

[`b14ef2a`](https://github.com/itsuko-rt/dofus-companion/commit/b14ef2aca7628b2d87ddd07cebab88ae6b035a1d) · 2026-11-20 07:02:09 +01:00

- useCharacter: a loaded empty store is a new object, ready derived from the snapshot
- loadAchievements: one query per table instead of two per achievement
- useGame: Graph and statuses memoised per page lifetime
- BuildsView: render function instead of a component declared in render

**Modified (4):** `components/builds/BuildsView.tsx`, `components/quests/useGame.ts`, `components/useCharacter.ts`, `src/load.ts`

**Bugs fixed (from the commit message):**
- Fix first-visit blank pages; batch achievement queries; build quest graph once

<!-- /entry -->

<!-- entry sha=77a772e04d7c076e52298649cb4f610878579cb1 date=2026-11-20T07:02:09+01:00 -->
### Import classes, monsters, drops, character XP and activity suggestions

[`77a772e`](https://github.com/itsuko-rt/dofus-companion/commit/77a772e04d7c076e52298649cb4f610878579cb1) · 2026-11-20 07:02:09 +01:00

scripts/creatures-import.ts (run by npm run import or standalone): breed_info,
monster, monster_grade, monster_subarea, monster_drop, xp_level, activity, plus
src/breed-data.json for client code. Achievement indexes added to the import.
The professions import no longer drops the monster table.

**Added (2):** `scripts/creatures-import.ts`, `src/breed-data.json`

**Modified (2):** `scripts/import.ts`, `scripts/professions-import.ts`

<!-- /entry -->

<!-- entry sha=e4bce5549214973e34a6e1dcb5a64f93fc9315d2 date=2026-11-20T07:02:08+01:00 -->
### Docs: game data and product audit, game data inventory

[`e4bce55`](https://github.com/itsuko-rt/dofus-companion/commit/e4bce5549214973e34a6e1dcb5a64f93fc9315d2) · 2026-11-20 07:02:08 +01:00

**Added (2):** `docs/GAME_DATA_AND_PRODUCT_AUDIT.md`, `docs/GAME_DATA_INVENTORY.md`

<!-- /entry -->

<!-- entry sha=ba0d1c82e97475ab81af31b50716e491fef953f5 date=2026-11-20T05:29:36+01:00 -->
### Merge branch 'docs/obsidian-setup': LF rule and permanent vault location

[`ba0d1c8`](https://github.com/itsuko-rt/dofus-companion/commit/ba0d1c82e97475ab81af31b50716e491fef953f5) · 2026-11-20 05:29:36 +01:00 · merge commit

_Merge commit: its changes are listed under the commits it merged._

<!-- /entry -->

<!-- entry sha=55c1052e33236e6553fbde683a9295cd80983c29 date=2026-11-20T05:28:18+01:00 -->
### Setup Report: PR #1 is merged; later commits on the branch

[`55c1052`](https://github.com/itsuko-rt/dofus-companion/commit/55c1052e33236e6553fbde683a9295cd80983c29) · 2026-11-20 05:28:18 +01:00

**Modified (1):** `knowledge/00 - Dashboard/Setup Report.md`

<!-- /entry -->

<!-- entry sha=def4b6a84a3efdab8a2fc7b579b40693664edbe5 date=2026-11-20T05:27:47+01:00 -->
### Knowledge base: record the permanent vault location

[`def4b6a`](https://github.com/itsuko-rt/dofus-companion/commit/def4b6a84a3efdab8a2fc7b579b40693664edbe5) · 2026-11-20 05:27:47 +01:00

**Modified (2):** `knowledge/00 - Dashboard/Setup Report.md`, `knowledge/09 - Development Memory/Session Summaries/2026-11-20 Obsidian setup.md`

<!-- /entry -->

<!-- entry sha=441d48a340ad1620a1058db21642c89f29ddba63 date=2026-11-20T05:26:45+01:00 -->
### Keep the Obsidian vault in LF line endings

[`441d48a`](https://github.com/itsuko-rt/dofus-companion/commit/441d48a340ad1620a1058db21642c89f29ddba63) · 2026-11-20 05:26:45 +01:00

Obsidian rewrites its .obsidian/*.json files with LF; on Windows checkouts
with core.autocrlf they then showed as modified with no content change.

**Added (1):** `.gitattributes`

<!-- /entry -->

<!-- entry sha=e31858b9740f3f84f851b8d54581249c81611129 date=2026-11-20T05:21:06+01:00 -->
### Merge pull request #1 from itsuko-rt/docs/obsidian-setup

[`e31858b`](https://github.com/itsuko-rt/dofus-companion/commit/e31858b9740f3f84f851b8d54581249c81611129) · 2026-11-20 05:21:06 +01:00 · merge commit

Obsidian setup: register vault, dashboard, research view, setup report

_Merge commit: its changes are listed under the commits it merged._

<!-- /entry -->

<!-- entry sha=2dd13fd115061b09ddd5b88568b766a19560b4b9 date=2026-11-20T05:16:06+01:00 -->
### Obsidian setup: register vault, dashboard, research view, setup report

[`2dd13fd`](https://github.com/itsuko-rt/dofus-companion/commit/2dd13fd115061b09ddd5b88568b766a19560b4b9) · 2026-11-20 05:16:06 +01:00

- Home dashboard with feature status, priorities and section links
- Research.base: native Bases table of research notes by label
- Architecture: installed versions and page routes
- Research frontmatter completed for XP and kamas routes
- NEEDS VERIFICATION marker; status words in progress / rejected
- CLAUDE.md: check known limitations and reuse research first
- check-knowledge resolves .base embeds
- Setup Report and session summary

**Added (4):** `knowledge/.obsidian/appearance.json`, `knowledge/00 - Dashboard/Setup Report.md`, `knowledge/06 - Research and Sources/Research.base`, `knowledge/09 - Development Memory/Session Summaries/2026-11-20 Obsidian setup.md`

<details><summary><strong>Modified (14)</strong></summary>

- `CLAUDE.md`
- `knowledge/.obsidian/core-plugins.json`
- `knowledge/00 - Dashboard/Current Status.md`
- `knowledge/00 - Dashboard/Home.md`
- `knowledge/01 - Project Management/Milestones.md`
- `knowledge/03 - Builds and Progression/Kamas Routes/Kamas Routes.md`
- `knowledge/03 - Builds and Progression/XP Routes/XP Routes.md`
- `knowledge/05 - Technical Documentation/Architecture.md`
- `knowledge/06 - Research and Sources/Verification Status.md`
- `knowledge/09 - Development Memory/Session Summaries/2026-11-20 Map removal and pre-launch security audit.md`
- `knowledge/09 - Development Memory/Session Summaries/Session Summaries.md`
- `knowledge/10 - Claude Code/Documentation Rules.md`
- `knowledge/10 - Claude Code/Operating Instructions.md`
- `scripts/check-knowledge.ts`

</details>

<!-- /entry -->

<!-- entry sha=b027176686af0aacbb6a935ce754c98c1b7bce9f date=2026-11-20T05:05:22+01:00 -->
### Knowledge base: record commits and the Windows long-path lesson

[`b027176`](https://github.com/itsuko-rt/dofus-companion/commit/b027176686af0aacbb6a935ce754c98c1b7bce9f) · 2026-11-20 05:05:22 +01:00

**Modified (5):** `knowledge/00 - Dashboard/Current Status.md`, `knowledge/01 - Project Management/Milestones.md`, `knowledge/09 - Development Memory/Development Logs/2026-11-20 log.md`, `knowledge/09 - Development Memory/Lessons Learned/Lessons Learned.md`, `knowledge/09 - Development Memory/Session Summaries/2026-11-20 Map removal and pre-launch security audit.md`

<!-- /entry -->

<!-- entry sha=8b16623f60604a19e25c0152ad91caee2317c05d date=2026-11-20T05:04:58+01:00 -->
### Obsidian knowledge base and Claude Code project instructions

[`8b16623`](https://github.com/itsuko-rt/dofus-companion/commit/8b16623f60604a19e25c0152ad91caee2317c05d) · 2026-11-20 05:04:58 +01:00

knowledge/ is an Obsidian vault populated from the docs, code and game
database (3.7.14.18), with verification labels, ADRs, bug history and
session summaries. CLAUDE.md tells Claude Code to read it before work and
keep it current. scripts/check-knowledge.ts checks links, paths and secrets.

<details><summary><strong>Added (90)</strong></summary>

- `CLAUDE.md`
- `knowledge/.obsidian/app.json`
- `knowledge/.obsidian/bookmarks.json`
- `knowledge/.obsidian/core-plugins.json`
- `knowledge/.obsidian/templates.json`
- `knowledge/00 - Dashboard/Current Status.md`
- `knowledge/00 - Dashboard/Home.md`
- `knowledge/00 - Dashboard/Project Overview.md`
- `knowledge/00 - Dashboard/Quick Links.md`
- `knowledge/01 - Project Management/Feature Backlog.md`
- `knowledge/01 - Project Management/Milestones.md`
- `knowledge/01 - Project Management/Priorities.md`
- `knowledge/01 - Project Management/Product Roadmap.md`
- `knowledge/01 - Project Management/Vision and Goals.md`
- `knowledge/02 - Game Knowledge/Achievements/Achievements.md`
- `knowledge/02 - Game Knowledge/Classes/Cra.md`
- `knowledge/02 - Game Knowledge/Classes/Pandawa.md`
- `knowledge/02 - Game Knowledge/Dungeons/Dungeons.md`
- `knowledge/02 - Game Knowledge/Game Knowledge.md`
- `knowledge/02 - Game Knowledge/Game Mechanics/Game Mechanics.md`
- `knowledge/02 - Game Knowledge/Monsters/Monsters.md`
- `knowledge/02 - Game Knowledge/Quests/Quests.md`
- `knowledge/02 - Game Knowledge/Spells/Spells.md`
- `knowledge/03 - Builds and Progression/Builds and Progression.md`
- `knowledge/03 - Builds and Progression/Cra/Cra Builds.md`
- `knowledge/03 - Builds and Progression/Equipment/Equipment.md`
- `knowledge/03 - Builds and Progression/Kamas Routes/Kamas Routes.md`
- `knowledge/03 - Builds and Progression/Pandawa/Pandawa Builds.md`
- `knowledge/03 - Builds and Progression/XP Routes/XP Routes.md`
- `knowledge/04 - Professions/Alchemist.md`
- `knowledge/04 - Professions/Farmer.md`
- `knowledge/04 - Professions/Fisherman.md`
- `knowledge/04 - Professions/Jeweller.md`
- `knowledge/04 - Professions/Lumberjack.md`
- `knowledge/04 - Professions/Miner.md`
- `knowledge/04 - Professions/Professions.md`
- `knowledge/04 - Professions/Shoemaker.md`
- `knowledge/04 - Professions/Tailor.md`
- `knowledge/05 - Technical Documentation/API Documentation.md`
- `knowledge/05 - Technical Documentation/Architecture.md`
- `knowledge/05 - Technical Documentation/Authentication.md`
- `knowledge/05 - Technical Documentation/Character Sync OCR.md`
- `knowledge/05 - Technical Documentation/Data Pipeline.md`
- `knowledge/05 - Technical Documentation/Database Schema.md`
- `knowledge/05 - Technical Documentation/Integrations.md`
- `knowledge/06 - Research and Sources/Community Sources.md`
- `knowledge/06 - Research and Sources/Official Sources.md`
- `knowledge/06 - Research and Sources/Research Archive/Research Archive.md`
- `knowledge/06 - Research and Sources/Research Log.md`
- `knowledge/06 - Research and Sources/Verification Status.md`
- `knowledge/07 - Design System/Components.md`
- `knowledge/07 - Design System/Design Decisions.md`
- `knowledge/07 - Design System/UI UX Guidelines.md`
- `knowledge/07 - Design System/Visual Identity.md`
- `knowledge/08 - Security and Deployment/GDPR and Privacy.md`
- `knowledge/08 - Security and Deployment/Infrastructure.md`
- `knowledge/08 - Security and Deployment/Release Checklist.md`
- `knowledge/08 - Security and Deployment/Security Audit.md`
- `knowledge/08 - Security and Deployment/Security Overview.md`
- `knowledge/09 - Development Memory/Architecture Decision Records/ADR-0001 Game data from the game files.md`
- `knowledge/09 - Development Memory/Architecture Decision Records/ADR-0002 SQLite for game and account data.md`
- `knowledge/09 - Development Memory/Architecture Decision Records/ADR-0003 Link community sites, never copy them.md`
- `knowledge/09 - Development Memory/Architecture Decision Records/ADR-0004 Scanner reads screenshots locally.md`
- `knowledge/09 - Development Memory/Architecture Decision Records/ADR-0005 Remove the in-site map.md`
- `knowledge/09 - Development Memory/Architecture Decision Records/ADR-0006 No ads or analytics without consent.md`
- `knowledge/09 - Development Memory/Architecture Decision Records/Architecture Decision Records.md`
- `knowledge/09 - Development Memory/Bug History/Bug History.md`
- `knowledge/09 - Development Memory/Bug History/Item effects lost through rounded ids.md`
- `knowledge/09 - Development Memory/Bug History/JSON-LD escape did nothing.md`
- `knowledge/09 - Development Memory/Bug History/Reset links in production logs.md`
- `knowledge/09 - Development Memory/Bug History/Throttle bypass with forged X-Forwarded-For.md`
- `knowledge/09 - Development Memory/Bug History/Wrong zone at [0, 0] on the removed map.md`
- `knowledge/09 - Development Memory/Development Logs/2026-11-19 log.md`
- `knowledge/09 - Development Memory/Development Logs/2026-11-20 log.md`
- `knowledge/09 - Development Memory/Development Logs/Development Logs.md`
- `knowledge/09 - Development Memory/Lessons Learned/Lessons Learned.md`
- `knowledge/09 - Development Memory/Session Summaries/2026-11-20 Knowledge base setup.md`
- `knowledge/09 - Development Memory/Session Summaries/2026-11-20 Map removal and pre-launch security audit.md`
- `knowledge/09 - Development Memory/Session Summaries/Session Summaries.md`
- `knowledge/10 - Claude Code/Coding Standards.md`
- `knowledge/10 - Claude Code/Documentation Rules.md`
- `knowledge/10 - Claude Code/Operating Instructions.md`
- `knowledge/10 - Claude Code/Project Context.md`
- `knowledge/README.md`
- `knowledge/Templates/Architecture Decision.md`
- `knowledge/Templates/Bug Report.md`
- `knowledge/Templates/Development Session.md`
- `knowledge/Templates/Feature Specification.md`
- `knowledge/Templates/Research Template.md`
- `scripts/check-knowledge.ts`

</details>

**Modified (2):** `.gitignore`, `README.md`

**Bugs fixed (from the commit message):**
- database (3.7.14.18), with verification labels, ADRs, bug history and

<!-- /entry -->

<!-- entry sha=72ad9618256207575233590f8ce2edd7fc20936d date=2026-11-20T05:04:56+01:00 -->
### Pre-launch security audit: fixes and reports

[`72ad961`](https://github.com/itsuko-rt/dofus-companion/commit/72ad9618256207575233590f8ce2edd7fc20936d) · 2026-11-20 05:04:56 +01:00

- Reset links and addresses are no longer written to production logs
- Password hashing capped at 4 running, 32 queued; beyond that 503
- JSON-LD escape now really escapes "&lt;" (tested)
- Achievement category list deduplicated and capped
- Probe extended (overwrite IDOR, logout, forged reset token)
- Privacy page lists DofusDB and Dofus Maps
- Reports: SECURITY_AUDIT, SECURITY_FIXES, PRIVACY_GDPR_REVIEW, RELEASE_READINESS

**Added (6):** `docs/PRIVACY_GDPR_REVIEW.md`, `docs/RELEASE_READINESS.md`, `docs/SECURITY_AUDIT.md`, `docs/SECURITY_FIXES.md`, `src/jsonld.ts`, `tests/security.test.ts`

**Modified (6):** `app/api/achievements/route.ts`, `app/api/auth/[action]/route.ts`, `app/confidentialite/page.tsx`, `components/JsonLd.tsx`, `scripts/security-probe.mjs`, `src/server/auth.ts`

**Bugs fixed (from the commit message):**
- Pre-launch security audit: fixes and reports

<!-- /entry -->

<!-- entry sha=02b400a06d8c5c64e2727eb7f2e9a98d85dee2ac date=2026-11-20T05:04:56+01:00 -->
### Remove the in-site world map; /carte links to DofusDB and Dofus Maps

[`02b400a`](https://github.com/itsuko-rt/dofus-companion/commit/02b400a06d8c5c64e2727eb7f2e9a98d85dee2ac) · 2026-11-20 05:04:56 +01:00

The map UI, /api/world, the artwork download, map-only tables and saved
gathering routes are removed. Professions keep their zone data, now in
src/professions*.ts and scripts/professions-import.ts. /carte is a static
directory of two external tools (new tab, noopener noreferrer, no iframe).

**Added (6):** `docs/MAP_REMOVAL_REPORT.md`, `e2e/professions.spec.ts`, `scripts/professions-import.ts`, `src/professions-shared.ts`, `src/professions.ts`, `tests/professions.test.ts`

<details><summary><strong>Modified (17)</strong></summary>

- `app/api/professions/[slug]/route.ts`
- `app/carte/page.tsx`
- `app/metiers/[slug]/page.tsx`
- `app/metiers/page.tsx`
- `app/sitemap.ts`
- `components/Nav.tsx`
- `components/character/CharacterProfile.tsx`
- `components/professions/JobGuide.tsx`
- `components/professions/ProfessionsIndex.tsx`
- `components/useCharacter.ts`
- `docs/INTEGRATION_PLAN.md`
- `docs/INTEGRATION_RESULTS.md`
- `docs/PROFESSIONS_SYSTEM.md`
- `package.json`
- `scripts/fetch-assets.ts`
- `scripts/import.ts`
- `src/character.ts`

</details>

<details><summary><strong>Removed (14)</strong></summary>

- `app/api/world/[map]/route.ts`
- `components/world/MapCanvas.tsx`
- `components/world/MapDetails.tsx`
- `components/world/MapFilters.tsx`
- `components/world/MapSearch.tsx`
- `components/world/WorldMap.tsx`
- `components/world/layers.tsx`
- `docs/WORLD_MAP_IMPLEMENTATION.md`
- `e2e/world.spec.ts`
- `scripts/fetch-worldmap.ts`
- `scripts/world-import.ts`
- `src/world-shared.ts`
- `src/world.ts`
- `tests/world.test.ts`

</details>

<!-- /entry -->

<!-- entry sha=97381f835a2a89f153ba20de60a3d3a3a9da32dd date=2026-11-20T02:10:50+01:00 -->
### World map: official artwork, profession filters, POI layers, map details, search

[`97381f8`](https://github.com/itsuko-rt/dofus-companion/commit/97381f835a2a89f153ba20de60a3d3a3a9da32dd) · 2026-11-20 02:10:50 +01:00

- scripts/fetch-worldmap.ts copies the game's world-map tiles (git-ignored, © Ankama);
  map drawn in the artwork's pixel geometry from worldmapsdata
- Resource filters per gathering profession with level limit, multi-select, clustering
- Layers: zaaps, transports, dungeon entrances with level, workshops, sale halls, class
  temples, quest givers at their map, mines and caves, other markers
- Map details: coordinates, copy and /travel (C), POIs on the map, zone resources,
  nearby alternatives, monsters, quests; selected map kept in the URL
- Search palette (Ctrl+K, /, Escape): coordinates, regions, zones, professions,
  resources, monsters, POIs
- Unit and E2E tests; docs/WORLD_MAP_IMPLEMENTATION.md updated

**Added (5):** `components/world/MapDetails.tsx`, `components/world/MapFilters.tsx`, `components/world/MapSearch.tsx`, `components/world/layers.tsx`, `scripts/fetch-worldmap.ts`

**Modified (9):** `components/world/MapCanvas.tsx`, `components/world/WorldMap.tsx`, `docs/WORLD_MAP_IMPLEMENTATION.md`, `e2e/world.spec.ts`, `package.json`, `scripts/world-import.ts`, `src/world-shared.ts`, `src/world.ts`, `tests/world.test.ts`

**Tests (from the commit message):**
- Unit and E2E tests; docs/WORLD_MAP_IMPLEMENTATION.md updated

<!-- /entry -->

<!-- entry sha=3f64221a1443150f56123ef2711e5928412242d4 date=2026-11-20T01:45:21+01:00 -->
### World map and professions guide from the game data

[`3f64221`](https://github.com/itsuko-rt/dofus-companion/commit/3f64221a1443150f56123ef2711e5928412242d4) · 2026-11-20 01:45:21 +01:00

- scripts/world-import.ts: map cells, zones, official markers, zaaps, professions,
  harvesting tiers, recipes and zone monsters (also run by npm run import)
- /carte: SVG world map with layers, search, zone details, route planner saved per
  character, deep links; /metiers: tiers by level, zones, recipes with ingredient origin
- Character keeps profession levels and routes; profile lists saved routes
- Unit and E2E tests; docs/REFERENCE_REPOSITORY_AUDIT.md, INTEGRATION_*, WORLD_MAP_*, PROFESSIONS_SYSTEM.md

<details><summary><strong>Added (20)</strong></summary>

- `app/api/professions/[slug]/route.ts`
- `app/api/world/[map]/route.ts`
- `app/carte/page.tsx`
- `app/metiers/[slug]/page.tsx`
- `app/metiers/page.tsx`
- `components/professions/JobGuide.tsx`
- `components/professions/ProfessionsIndex.tsx`
- `components/professions/jobIcons.tsx`
- `components/world/MapCanvas.tsx`
- `components/world/WorldMap.tsx`
- `docs/INTEGRATION_PLAN.md`
- `docs/INTEGRATION_RESULTS.md`
- `docs/PROFESSIONS_SYSTEM.md`
- `docs/REFERENCE_REPOSITORY_AUDIT.md`
- `docs/WORLD_MAP_IMPLEMENTATION.md`
- `e2e/world.spec.ts`
- `scripts/world-import.ts`
- `src/world-shared.ts`
- `src/world.ts`
- `tests/world.test.ts`

</details>

**Modified (9):** `app/sitemap.ts`, `components/Nav.tsx`, `components/character/CharacterProfile.tsx`, `components/useCharacter.ts`, `playwright.config.ts`, `scripts/fetch-assets.ts`, `scripts/import.ts`, `src/character.ts`, `src/load.ts`

**Tests (from the commit message):**
- Unit and E2E tests; docs/REFERENCE_REPOSITORY_AUDIT.md, INTEGRATION_*, WORLD_MAP_*, PROFESSIONS_SYSTEM.md

<!-- /entry -->

<!-- entry sha=6f38cc675dea33bbcb62ae6abd7269526159cb84 date=2026-11-20T00:13:30+01:00 -->
### Audit follow-up: Playwright E2E suite, Lighthouse fixes, security probe

[`6f38cc6`](https://github.com/itsuko-rt/dofus-companion/commit/6f38cc675dea33bbcb62ae6abd7269526159cb84) · 2026-11-20 00:13:30 +01:00

- e2e/: 18 Edge tests (accounts, isolation, deletion, every sitemap page, navigation,
  quest map, achievements, characters, scanner, builds)
- Server-rendered titles on home, achievements and builds; no nested &lt;main&gt;
- WCAG AA contrast for faint text and the primary button
- Achievements list paged by 100 (TBT 910 -&gt; 240 ms on mobile)
- scripts/security-probe.mjs; report updated in docs/AUDIT_SECURITE.md

**Added (5):** `e2e/account.spec.ts`, `e2e/helpers.ts`, `e2e/ui.spec.ts`, `playwright.config.ts`, `scripts/security-probe.mjs`

**Modified (9):** `.gitignore`, `app/globals.css`, `components/Home.tsx`, `components/builds/BuildsView.tsx`, `components/progression/AchievementsView.tsx`, `components/quests/QuestTracker.tsx`, `docs/AUDIT_SECURITE.md`, `package-lock.json`, `package.json`

**Bugs fixed (from the commit message):**
- Audit follow-up: Playwright E2E suite, Lighthouse fixes, security probe

**Tests (from the commit message):**
- e2e/: 18 Edge tests (accounts, isolation, deletion, every sitemap page, navigation,

<!-- /entry -->

## 2026-11-19

<!-- entry sha=320c1ef5479d286e4aca91a874c11e02f97a00ce date=2026-11-19T21:19:19+01:00 -->
### Security audit fixes: throttle bypass, shared-browser merge, body limits, account deletion, CSP

[`320c1ef`](https://github.com/itsuko-rt/dofus-companion/commit/320c1ef5479d286e4aca91a874c11e02f97a00ce) · 2026-11-19 21:19:19 +01:00

See docs/AUDIT_SECURITE.md.

**Added (1):** `docs/AUDIT_SECURITE.md`

**Modified (11):** `.env.example`, `app/api/auth/[action]/route.ts`, `app/api/builds/route.ts`, `app/confidentialite/page.tsx`, `components/account/AccountView.tsx`, `components/account/useSession.ts`, `components/scan/ScanView.tsx`, `components/useCharacter.ts`, `next.config.ts`, `src/server/auth.ts`, `tests/auth.test.ts`

**Bugs fixed (from the commit message):**
- Security audit fixes: throttle bypass, shared-browser merge, body limits, account deletion, CSP

<!-- /entry -->

<!-- entry sha=1d80bedec1a99d026cc76f885a855034ae16b2a3 date=2026-11-19T20:27:06+01:00 -->
### Design restraint pass: flat panels, one elevation, purposeful icons

[`1d80bed`](https://github.com/itsuko-rt/dofus-companion/commit/1d80bedec1a99d026cc76f885a855034ae16b2a3) · 2026-11-19 20:27:06 +01:00

- Nav shows the Emerald Egg instead of the old "12" diamond
- Remove page glow, double hero gradients, glossy diamonds, glass panels,
  hover lifts, gradient progress bars and decorative Sparkles icons
- Cap radii and shadows at the token level; tags become square-ish
- Achievements list becomes one ruled journal page; drop redundant totals
- docs/DESIGN_SYSTEM.md records the audit and the rules

**Added (1):** `docs/DESIGN_SYSTEM.md`

<details><summary><strong>Modified (16)</strong></summary>

- `app/globals.css`
- `app/guides/dofus/[slug]/page.tsx`
- `app/guides/page.tsx`
- `components/FlowCanvas.tsx`
- `components/Home.tsx`
- `components/Nav.tsx`
- `components/SpellGuide.tsx`
- `components/builds/BuildsView.tsx`
- `components/character/ClassCard.tsx`
- `components/progression/AchievementsView.tsx`
- `components/progression/DofusView.tsx`
- `components/quests/QuestDrawer.tsx`
- `components/quests/QuestTracker.tsx`
- `components/scan/ScanView.tsx`
- `components/ui.tsx`
- `src/brand.ts`

</details>

**Tests (from the commit message):**
- docs/DESIGN_SYSTEM.md records the audit and the rules

<!-- /entry -->

<!-- entry sha=f558185244b1890fd65a72ff25c6409ee5466538 date=2026-11-19T20:14:31+01:00 -->
### Branding: Emerald Egg replaces the golden egg

[`f558185`](https://github.com/itsuko-rt/dofus-companion/commit/f558185244b1890fd65a72ff25c6409ee5466538) · 2026-11-19 20:14:31 +01:00

- Source artwork from the supplied package kept in brand/ (master 1254 px);
  every size regenerated by scripts/make-icons.ts
- 16 px uses a simplified Emerald Egg (gold ring, egg, cream sun, no rocks or
  facets) since the full artwork blurs at that size; 32 px and up use the artwork
- favicon.ico with 16/32/48 entries (5.6 KB vs 157 KB in the package),
  apple-touch-icon and maskable icon on an opaque background, social image updated
- Icon declarations trimmed to .ico + 16/32 PNG + apple; 192/512 stay in the
  manifest; obsolete golden SVG and duplicate 180 px file removed
- docs/comparaison-favicon.png: old vs new at 16, 32, 48 and 512 px
- Fix: scripts/check-links.ts was not a module (typecheck error)

**Added (3):** `brand/emerald-egg-master.png`, `brand/emerald-egg-small.svg`, `docs/comparaison-favicon.png`

<details><summary><strong>Modified (15)</strong></summary>

- `app/a-propos/page.tsx`
- `app/layout.tsx`
- `docs/LANCEMENT_PUBLIC.md`
- `public/apple-touch-icon.png`
- `public/favicon-16x16.png`
- `public/favicon-192x192.png`
- `public/favicon-32x32.png`
- `public/favicon-48x48.png`
- `public/favicon-512x512.png`
- `public/favicon-96x96.png`
- `public/favicon.ico`
- `public/icon-maskable-512.png`
- `public/og-image.png`
- `scripts/check-links.ts`
- `scripts/make-icons.ts`

</details>

**Removed (3):** `public/brand/logo-small.svg`, `public/brand/logo.svg`, `public/favicon-180x180.png`

**Bugs fixed (from the commit message):**
- Fix: scripts/check-links.ts was not a module (typecheck error)

**Tests (from the commit message):**
- Fix: scripts/check-links.ts was not a module (typecheck error)

<!-- /entry -->

<!-- entry sha=71e79b0ebde43d96564cf716cb836ec09959e3e7 date=2026-11-19T20:04:07+01:00 -->
### Public launch prep: brand icons, SEO, guides, legal pages, ads and plans scaffolding

[`71e79b0`](https://github.com/itsuko-rt/dofus-companion/commit/71e79b0ebde43d96564cf716cb836ec09959e3e7) · 2026-11-19 20:04:07 +01:00

- Original logo (golden egg, twelve-ray sun) + favicon.ico, PNG sizes, apple/maskable
  icons, manifest, theme colour, 1200x630 social image (scripts/make-icons.ts)
- SEO: metadataBase, unique titles/descriptions, canonicals, Open Graph/Twitter on every
  page; sitemap.xml (138 URLs) and robots.txt; WebSite/Organization/BreadcrumbList JSON-LD;
  &lt;main&gt;, skip link, breadcrumbs, footer
- Readable URLs: /progression/quetes/incarnam, /personnage/sorts/cra; numeric URLs 308
- Crawlable guides built from game data: /guides, 45 region pages, 34 Dofus pages
- Privacy & cookies, legal notice (publisher via env, not committed), about page,
  consent button (Google CMP when ads are on)
- Free/premium architecture (src/plans.ts, users.plan migration); AdSlot and ads.txt
  inert until AdSense is configured; Cloudflare Web Analytics behind a token
- D1 migration files generated from the app migrations; .env.example
- Fix: failed-login records now purged after 15 minutes
- scripts/check-links.ts: broken links, canonicals, descriptions, JSON-LD
- docs/LANCEMENT_PUBLIC.md: audit, Cloudflare compatibility (node:sqlite and scrypt
  CPU block Workers Free), ad networks, analytics, manual steps, deployment

<details><summary><strong>Added (42)</strong></summary>

- `.env.example`
- `app/a-propos/page.tsx`
- `app/ads.txt/route.ts`
- `app/confidentialite/page.tsx`
- `app/guides/dofus/[slug]/page.tsx`
- `app/guides/dofus/page.tsx`
- `app/guides/page.tsx`
- `app/guides/quetes/[region]/page.tsx`
- `app/guides/quetes/page.tsx`
- `app/manifest.ts`
- `app/mentions-legales/page.tsx`
- `app/robots.ts`
- `app/sitemap.ts`
- `components/AdSlot.tsx`
- `components/Breadcrumbs.tsx`
- `components/ConsentButton.tsx`
- `components/JsonLd.tsx`
- `docs/LANCEMENT_PUBLIC.md`
- `migrations/0001_app.sql`
- `migrations/0002_app.sql`
- `public/apple-touch-icon.png`
- `public/brand/logo-small.svg`
- `public/brand/logo.svg`
- `public/favicon-16x16.png`
- `public/favicon-180x180.png`
- `public/favicon-192x192.png`
- `public/favicon-32x32.png`
- `public/favicon-48x48.png`
- `public/favicon-512x512.png`
- `public/favicon-96x96.png`
- `public/favicon.ico`
- `public/icon-maskable-512.png`
- `public/og-image.png`
- `scripts/check-links.ts`
- `scripts/export-d1-migrations.ts`
- `scripts/make-icons.ts`
- `src/guides-data.ts`
- `src/plans.ts`
- `src/seo.ts`
- `src/site.ts`
- `tests/guides.test.ts`
- `tests/plans.test.ts`

</details>

<details><summary><strong>Modified (26)</strong></summary>

- `.gitignore`
- `README.md`
- `app/builds/page.tsx`
- `app/compte/page.tsx`
- `app/equipement/page.tsx`
- `app/layout.tsx`
- `app/personnage/page.tsx`
- `app/personnage/sorts/[id]/page.tsx`
- `app/personnage/sorts/page.tsx`
- `app/progression/dofus/page.tsx`
- `app/progression/quetes/[region]/page.tsx`
- `app/progression/quetes/page.tsx`
- `app/progression/scan/page.tsx`
- `app/progression/succes/page.tsx`
- `components/Home.tsx`
- `components/account/useSession.ts`
- `components/breeds.ts`
- `components/progression/DofusView.tsx`
- `components/quests/NextSteps.tsx`
- `components/quests/QuestTracker.tsx`
- `components/quests/useGame.ts`
- `scripts/smoke.ts`
- `src/regions.ts`
- `src/server/appdb.ts`
- `src/server/auth.ts`
- `tests/auth.test.ts`

</details>

**Bugs fixed (from the commit message):**
- Fix: failed-login records now purged after 15 minutes

**Tests (from the commit message):**
- docs/LANCEMENT_PUBLIC.md: audit, Cloudflare compatibility (node:sqlite and scrypt

<!-- /entry -->

<!-- entry sha=4b03bf1c2e5ffe6418f14b3cd687234aa2150389 date=2026-11-19T19:42:18+01:00 -->
### Visual redesign in the World of Twelve style

[`4b03bf1`](https://github.com/itsuko-rt/dofus-companion/commit/4b03bf1c2e5ffe6418f14b3cd687234aa2150389) · 2026-11-19 19:42:18 +01:00

- Design tokens: warm night palette, gold for available, green calls to action,
  one hue per section; Rowdies + Roboto (OFL, self-hosted by next/font); CSS paper grain
- Parchment scope (.parchment) re-maps the same tokens to ink on paper: achievement
  journal, quest sheet, home achievements
- New components: PageHero, Diamond, ClassCard, Card paper variant, shared
  useAchievementProgress; redesigned Nav, tabs, buttons, progress bars, drawer
- Home: character in its class scene with portrait and progress gauges, current
  objectives, almost-done and recent achievements
- Class cards with official titles and roles; Dofus egg icons
- Official artwork fetched by `npm run assets` into git-ignored public/ankama/
  (manifest of sources, graceful fallback when absent)
- Fix: /personnage/sorts returned 500 (event handler in a server component);
  nonexistent text-text0 class in SpellGuide

**Added (4):** `components/character/ClassCard.tsx`, `components/progression/useAchievementProgress.ts`, `docs/RAPPORT_REFONTE_VISUELLE.md`, `scripts/fetch-assets.ts`

<details><summary><strong>Modified (24)</strong></summary>

- `.gitignore`
- `README.md`
- `app/globals.css`
- `app/layout.tsx`
- `app/personnage/sorts/page.tsx`
- `components/FlowCanvas.tsx`
- `components/Home.tsx`
- `components/Nav.tsx`
- `components/SpellGuide.tsx`
- `components/account/AccountView.tsx`
- `components/breeds.ts`
- `components/builds/BuildsView.tsx`
- `components/character/CharacterProfile.tsx`
- `components/character/Onboarding.tsx`
- `components/character/PersonnageTabs.tsx`
- `components/equipment/EquipmentView.tsx`
- `components/progression/AchievementsView.tsx`
- `components/progression/DofusView.tsx`
- `components/progression/ProgressionTabs.tsx`
- `components/quests/QuestTracker.tsx`
- `components/scan/ScanView.tsx`
- `components/ui.tsx`
- `package.json`
- `src/load.ts`

</details>

**Bugs fixed (from the commit message):**
- Fix: /personnage/sorts returned 500 (event handler in a server component);

<!-- /entry -->

<!-- entry sha=576570026b29cbf170fb29209e5f77aa727f6947 date=2026-11-19T18:28:28+01:00 -->
### Achievement tracker with objectives, provenance history, and assisted screenshot scan

[`5765700`](https://github.com/itsuko-rt/dofus-companion/commit/576570026b29cbf170fb29209e5f77aa727f6947) · 2026-11-19 18:28:28 +01:00

- Achievements: dashboard (obtained, to confirm, in progress, per category,
  almost done, recently obtained), state filters, search across all 2777
- Objectives tracked one by one: inferred from official conditions (quests,
  achievements, level, points) or ticked; an achievement is never marked
  obtained without the player's confirmation
- Import: achievement rewards and DPLN guide links (exact title match)
- Character history: every progress change keeps its source (manual, import,
  scan, prerequisites), date and label; any entry can be undone; validated
  server-side
- Scan page: window capture / file / paste, Tesseract OCR in the browser,
  name matching (src/recognize.ts), review screen with confidence, deduced
  prerequisites kept separate and unticked
- Synthetic OCR benchmark: 317/318 names found, 0 wrong matches; real Dofus
  screenshots not tested yet (docs/RAPPORT_SUCCES_SCAN.md)

**Added (10):** `app/api/achievements/objectives/route.ts`, `app/progression/scan/page.tsx`, `components/scan/ScanView.tsx`, `components/scan/ocr.ts`, `docs/RAPPORT_SUCCES_SCAN.md`, `src/achievements.ts`, `src/recognize.ts`, `tests/achievements.test.ts`, `tests/character.test.ts`, `tests/recognize.test.ts`

**Modified (11):** `README.md`, `components/progression/AchievementsView.tsx`, `components/progression/ProgressionTabs.tsx`, `components/quests/QuestTracker.tsx`, `components/useCharacter.ts`, `package-lock.json`, `package.json`, `scripts/import.ts`, `scripts/smoke.ts`, `src/character.ts`, `src/load.ts`

<!-- /entry -->

<!-- entry sha=1ab8c096fa3a8e0c90ade2580d55389c45533ed7 date=2026-11-19T18:08:54+01:00 -->
### Quest tracker redesign: single tracker screen, compact chain layout, N1ark-style controls

[`1ab8c09`](https://github.com/itsuko-rt/dofus-companion/commit/1ab8c096fa3a8e0c90ade2580d55389c45533ed7) · 2026-11-19 18:08:54 +01:00

- One tracker screen: collapsible region groups, profile switcher, filter bar
  (search across regions, level, class, status, hide completed, up to my level),
  compact progress dashboard
- Graph: each quest chain in its own foldable frame, chains packed by level;
  fan-outs of short questlines drawn as grids; quests with many prerequisites no
  longer force one endless row (Astrub 4632 -&gt; 1540 px, Frigost 11065 -&gt; 5060 px)
- Selection highlights prerequisites and follow-ups; "in progress" status shown
- Right-click completes, Shift/Ctrl+right-click completes with prerequisites,
  undo banner and Ctrl+Z
- Quest panel: level, related achievements, "complete with prerequisites",
  "Lire le guide complet" when a DPLN link exists
- JSON backup export/import of all characters
- Graph validation (missing references, cycles): none in the real data
- Fix game UI markup ({{ui,...::text}}) shown in quest and spell texts

**Added (4):** `components/quests/QuestTracker.tsx`, `docs/RAPPORT_SUIVI_QUETES.md`, `scripts/layout-report.ts`, `src/layout.ts`

<details><summary><strong>Modified (14)</strong></summary>

- `README.md`
- `app/globals.css`
- `app/progression/quetes/[region]/page.tsx`
- `app/progression/quetes/page.tsx`
- `components/FlowCanvas.tsx`
- `components/character/CharacterProfile.tsx`
- `components/quests/QuestDrawer.tsx`
- `components/useCharacter.ts`
- `src/load.ts`
- `src/regions.ts`
- `src/views.ts`
- `tests/data.test.ts`
- `tests/effects.test.ts`
- `tests/views.test.ts`

</details>

**Removed (2):** `components/quests/RegionView.tsx`, `components/quests/WorldView.tsx`

**Bugs fixed (from the commit message):**
- Fix game UI markup ({{ui,...::text}}) shown in quest and spell texts

<!-- /entry -->

<!-- entry sha=e4ec88621a1bba16da4ce9dfc470d562cf2e3a22 date=2026-11-19T07:40:14+01:00 -->
### Smoke test script, README and development report

[`e4ec886`](https://github.com/itsuko-rt/dofus-companion/commit/e4ec88621a1bba16da4ce9dfc470d562cf2e3a22) · 2026-11-19 07:40:14 +01:00

- scripts/smoke.ts: end-to-end checks against a running server (pages,
  redirects, security headers, APIs, account flow) — 22/22 on next start
- README: new pages, accounts database, production run, smoke test
- docs/RAPPORT_DEVELOPPEMENT.md: what was built, tested, and what needs a
  human (e-mail provider, hosting, trademark check, GitHub push)

**Added (2):** `docs/RAPPORT_DEVELOPPEMENT.md`, `scripts/smoke.ts`

**Modified (1):** `README.md`

**Tests (from the commit message):**
- README: new pages, accounts database, production run, smoke test

<!-- /entry -->

<!-- entry sha=58211a85373836e2467ad123371c1d8ff8f82f1e date=2026-11-19T07:37:33+01:00 -->
### Characters page, Dofus badges, class colours, security headers, cleanup

[`58211a8`](https://github.com/itsuko-rt/dofus-companion/commit/58211a85373836e2467ad123371c1d8ff8f82f1e) · 2026-11-19 07:37:33 +01:00

- Personnages: saved builds (wear / remove), personal notes, quest and
  achievement counts
- Quests rewarding a Dofus get a badge on the map and in the drawer
  (dofusQuests in the graph payload)
- Class colour tokens (Crâ, Pandawa) used for the character avatar
- Security headers on every response (nosniff, frame deny, referrer and
  permissions policies)
- Removed regionView (superseded by regionLayout) and its test

**Modified (12):** `app/globals.css`, `components/FlowCanvas.tsx`, `components/Home.tsx`, `components/breeds.ts`, `components/character/CharacterProfile.tsx`, `components/quests/QuestDrawer.tsx`, `components/quests/RegionView.tsx`, `components/quests/useGame.ts`, `next.config.ts`, `src/load.ts`, `src/views.ts`, `tests/views.test.ts`

**Tests (from the commit message):**
- Removed regionView (superseded by regionLayout) and its test

<!-- /entry -->

<!-- entry sha=89e08aa7d0267211b026f48fc446427631c77b90 date=2026-11-19T07:36:22+01:00 -->
### Builder: wider build pool, sorting, slots, spells, saved builds

[`89e08aa`](https://github.com/itsuko-rt/dofus-companion/commit/89e08aa7d0267211b026f48fc446427631c77b90) · 2026-11-19 07:36:22 +01:00

- Pool = Fashionista tier list + recent shared builds of the class (cached
  1 h): 40 Crâ / 38 Pandawa builds, 22 / 19 up to date (was 2 / 1)
- Filters: class, level, element; playstyle and game version shown as not
  filterable (no source); sort by best match, likes, views, last update;
  budget and verified damage listed as unavailable rather than invented
- Equipment grouped by in-game slot, set bonuses, stat groups, spells of the
  build's element with a link to the spell guide
- Save a build to the character, mark the one worn now (synced to the
  account when signed in)

**Modified (4):** `app/api/builds/route.ts`, `components/builds/BuildsView.tsx`, `src/load.ts`, `src/stats.ts`

<!-- /entry -->

<!-- entry sha=2abb5897e1b38f352fff7799a246cb72d454546a date=2026-11-19T07:33:43+01:00 -->
### Achievements, Dofus and Equipment pages

[`2abb589`](https://github.com/itsuko-rt/dofus-companion/commit/2abb5897e1b38f352fff7799a246cb72d454546a) · 2026-11-19 07:33:43 +01:00

- /progression/succes: achievements by category and sub-category, search,
  progress and points, mark as obtained (feeds quest/Dofus conditions)
- /progression/dofus: the 34 Dofus with the quest or achievement rewarding
  them, status and link to the source quest chain
- /equipement: searchable encyclopedia of wearable items (type, wearable at
  my level) with official effects; no rarity shown (not in the game data)

**Added (8):** `app/api/achievements/route.ts`, `app/api/items/search/route.ts`, `app/equipement/page.tsx`, `app/progression/dofus/page.tsx`, `app/progression/succes/page.tsx`, `components/equipment/EquipmentView.tsx`, `components/progression/AchievementsView.tsx`, `components/progression/DofusView.tsx`

**Modified (1):** `src/load.ts`

<!-- /entry -->

<!-- entry sha=2cfed11c8851ad3b41b6d8ecdc3ea1471c64cfdd date=2026-11-19T07:31:20+01:00 -->
### Quest drawer: description, start NPC, objectives, rewards, DPLN guide

[`2cfed11`](https://github.com/itsuko-rt/dofus-companion/commit/2cfed11c8851ad3b41b6d8ecdc3ea1471c64cfdd) · 2026-11-19 07:31:20 +01:00

- /api/quests/[id] serves step texts, rendered objectives, rewards, starting
  NPC/zone and external guides (browser-cacheable)
- Drawer shows them in plain language, a 'Besoin d'aide ?' section linking to
  the matching Dofus Pour Les Noobs tutorial (or saying none was found), and
  the quests unlocked right after marking one as done

**Added (1):** `app/api/quests/[id]/route.ts`

**Modified (2):** `components/quests/QuestDrawer.tsx`, `src/load.ts`

<!-- /entry -->

<!-- entry sha=b951872f4170ca477a5f97c263e958437b85fec0 date=2026-11-19T07:29:32+01:00 -->
### Accounts: registration, login, sessions, password reset, synced characters

[`b951872`](https://github.com/itsuko-rt/dofus-companion/commit/b951872f4170ca477a5f97c263e958437b85fec0) · 2026-11-19 07:29:32 +01:00

- Separate user database (data/app.sqlite) with numbered migrations; the
  game database rebuild never touches it
- scrypt password hashing (node:crypto), random session tokens stored as
  SHA-256 hashes in an HttpOnly SameSite=Lax cookie, same-origin check on
  every state-changing request, login throttling, one-time reset links
  (printed in the server log until an e-mail provider is configured)
- Characters saved per user (owner-scoped queries, validated payloads,
  newer-version conflict detection); local characters uploaded on sign-in,
  every change synced
- Shared character model (src/character.ts): saved builds, current build,
  notes
- Navigation: Accueil, Progression (Quêtes/Succès/Dofus), Builds,
  Équipement, Personnages, Compte; product name configurable (src/brand.ts)
- Handlers tested end to end on an in-memory database (tests/auth.test.ts)

<details><summary><strong>Added (15)</strong></summary>

- `app/api/auth/[action]/route.ts`
- `app/api/characters/[id]/route.ts`
- `app/api/characters/route.ts`
- `app/builds/page.tsx`
- `app/compte/page.tsx`
- `app/compte/reinitialiser/page.tsx`
- `app/progression/layout.tsx`
- `components/account/AccountView.tsx`
- `components/account/useSession.ts`
- `components/progression/ProgressionTabs.tsx`
- `src/brand.ts`
- `src/character.ts`
- `src/server/appdb.ts`
- `src/server/auth.ts`
- `tests/auth.test.ts`

</details>

**Modified (11):** `app/layout.tsx`, `app/personnage/page.tsx`, `app/personnage/sorts/[id]/page.tsx`, `app/personnage/sorts/page.tsx`, `app/progression/quetes/[region]/page.tsx`, `app/progression/quetes/page.tsx`, `components/Home.tsx`, `components/Nav.tsx`, `components/character/PersonnageTabs.tsx`, `components/useCharacter.ts`, `next.config.ts`

**Removed (1):** `app/personnage/builds/page.tsx`

**Tests (from the commit message):**
- Handlers tested end to end on an in-memory database (tests/auth.test.ts)

<!-- /entry -->

<!-- entry sha=340e91615967509f320f156abca3e9b878ab0dc7 date=2026-11-19T07:24:19+01:00 -->
### Import quest details, Dofus sources and DPLN guide links

[`340e916`](https://github.com/itsuko-rt/dofus-companion/commit/340e91615967509f320f156abca3e9b878ab0dc7) · 2026-11-19 07:24:19 +01:00

- Quest steps: French description, objectives rendered from the game's
  templates (src/objectives.ts), rewards (items, XP/kamas, spells)
- Starting NPC and zone per quest
- Dofus table: Dofus items with the quests / achievements rewarding them
- external_guide: Dofus Pour Les Noobs links matched by exact title against
  its public sitemap (1390/1984 quests), ambiguous titles skipped
  (src/guides.ts, tested); link only, no content copied

**Added (3):** `src/guides.ts`, `src/objectives.ts`, `tests/objectives-guides.test.ts`

**Modified (1):** `scripts/import.ts`

<!-- /entry -->

<!-- entry sha=e3352495a07033b042c923680e9f52eff4a9995e date=2026-11-19T07:04:01+01:00 -->
### Builds from Fashionista with real items, responsive fixes, README

[`e335249`](https://github.com/itsuko-rt/dofus-companion/commit/e3352495a07033b042c923680e9f52eff4a9995e) · 2026-11-19 07:04:01 +01:00

- Import items (21 622) and sets (941) from dofusdude's release of the same
  game version (dofus-sqlite JSON rounds 64-bit Unity rids), with item effects
  rendered in French and linked to characteristics; data_source provenance
- Build stats engine (src/stats.ts, tested): items at max roll, set bonus for
  n pieces, characteristic points, scrolls, exos, base AP/MP; element from
  the build's real stat focus
- /api/builds: Fashionista tier-list + shared builds (public read-only API,
  cached 1 h), resolved against our item data
- /personnage/builds: builds grouped by patch (current / previous / older),
  sorted by the character's level, element filter, equipment detail, set
  bonuses, stat groups with glossary, side-by-side comparison
- Seasonal islands and Temporis moved to side content; nav links keep an
  accessible name on mobile; README rewritten for Atlas des Douze

**Added (5):** `app/api/builds/route.ts`, `app/personnage/builds/page.tsx`, `components/builds/BuildsView.tsx`, `src/stats.ts`, `tests/stats.test.ts`

**Modified (5):** `README.md`, `components/Nav.tsx`, `components/breeds.ts`, `scripts/import.ts`, `src/load.ts`

**Bugs fixed (from the commit message):**
- Builds from Fashionista with real items, responsive fixes, README

<!-- /entry -->

<!-- entry sha=0f9d234caaed01bde25e4d92afa6efc62ca48727 date=2026-11-19T06:55:11+01:00 -->
### Redesign: design system, navigation, home, quest journey, characters

[`0f9d234`](https://github.com/itsuko-rt/dofus-companion/commit/0f9d234caaed01bde25e4d92afa6efc62ca48727) · 2026-11-19 06:55:11 +01:00

- Design tokens (dark premium palette, element colours), Sora + Inter via
  next/font, lucide icons, shared UI primitives (Button, Card, StatusPill,
  Drawer, Term…); status shown with icon + text, not colour alone
- New navigation (Accueil, Progression, Personnage) under the name
  "Atlas des Douze"; old URLs redirect (/quetes, /classes, /classes/:id)
- Home: guided onboarding (class, level, playstyle, element) or dashboard
  with progression, recommended regions and next steps
- Quest map as a journey: regions sorted by level with progress, storylines
  read top-to-bottom, plain-language quest drawer, "next steps" and
  "almost unlocked" suggestions (src/regions.ts, tested)
- Multiple local characters in one shared store; v1 character migrated

<details><summary><strong>Added (18)</strong></summary>

- `app/personnage/layout.tsx`
- `app/personnage/page.tsx`
- `app/personnage/sorts/page.tsx`
- `app/progression/quetes/[region]/page.tsx`
- `app/progression/quetes/page.tsx`
- `components/Home.tsx`
- `components/character/CharacterProfile.tsx`
- `components/character/Onboarding.tsx`
- `components/character/PersonnageTabs.tsx`
- `components/quests/NextSteps.tsx`
- `components/quests/QuestDrawer.tsx`
- `components/quests/RegionView.tsx`
- `components/quests/WorldView.tsx`
- `components/quests/useGame.ts`
- `components/ui.tsx`
- `docs/AUDIT_UX.md`
- `src/regions.ts`
- `tests/regions.test.ts`

</details>

**Modified (10):** `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `components/FlowCanvas.tsx`, `components/Nav.tsx`, `components/SpellGuide.tsx`, `components/useCharacter.ts`, `next.config.ts`, `package-lock.json`, `package.json`

**Removed (3):** `app/classes/page.tsx`, `app/quetes/page.tsx`, `components/QuestMap.tsx`

**Renamed (1):** `app/classes/[id]/page.tsx` → `app/personnage/sorts/[id]/page.tsx`

<!-- /entry -->

<!-- entry sha=62aaffd29cb08e47e4d86e56246375369eb65464 date=2026-11-19T06:31:23+01:00 -->
### Add Crâ and Pandawa spell guides from game data

[`62aaffd`](https://github.com/itsuko-rt/dofus-companion/commit/62aaffd29cb08e47e4d86e56246375369eb65464) · 2026-11-19 06:31:23 +01:00

- Import class spells for all 19 classes (SpellVariantData slots, spell levels)
  and render their effects in French with the game's own templates
  (src/effects.ts), resolving spell, state and summon names
- Class pages /classes/9 and /classes/12: 22 slots x 2 variants, grade for the
  character's level, AP/range/crit/cast limits, element filter, and the states
  each spell applies or removes
- Shared nav bar; quest map and spell guide share the character level
- Architecture report: Pandawa mechanics (Sobre, Saoul, Karcham, Chamrak,
  Tonneau) verified against 3.7.14.18 data

**Added (9):** `app/classes/[id]/page.tsx`, `app/classes/page.tsx`, `components/Nav.tsx`, `components/SpellGuide.tsx`, `components/breeds.ts`, `src/effects.ts`, `src/spells.ts`, `tests/effects.test.ts`, `tests/spells.test.ts`

**Modified (7):** `README.md`, `app/layout.tsx`, `components/QuestMap.tsx`, `docs/RAPPORT_ARCHITECTURE.md`, `package.json`, `scripts/import.ts`, `src/load.ts`

<!-- /entry -->

<!-- entry sha=1c8b1c33aba3e5ead9b71d17d1766596413883f9 date=2026-11-19T06:09:15+01:00 -->
### Initial commit: Dofus quest graph and quest map

[`1c8b1c3`](https://github.com/itsuko-rt/dofus-companion/commit/1c8b1c33aba3e5ead9b71d17d1766596413883f9) · 2026-11-19 06:09:15 +01:00

- Import official game data (dofus-sqlite release) into data/game-&lt;version&gt;.sqlite
  with a control report (scripts/import.ts)
- Parser and three-valued evaluator for Ankama criteria; code meanings sourced
  from dodumap and DofusDB, one inferred code (BT) flagged as such (src/codes.ts)
- Dependency graph: requires / any_of gates / excludes edges, status and unlocks
- Quest map UI (Next.js, React Flow, dagre): region and focused views, detail
  panel, local character profile and progress
- Research report and architecture in docs/RAPPORT_ARCHITECTURE.md

<details><summary><strong>Added (28)</strong></summary>

- `.claude/launch.json`
- `.gitignore`
- `README.md`
- `app/api/graph/route.ts`
- `app/globals.css`
- `app/layout.tsx`
- `app/page.tsx`
- `app/quetes/page.tsx`
- `components/FlowCanvas.tsx`
- `components/QuestMap.tsx`
- `components/useCharacter.ts`
- `docs/RAPPORT_ARCHITECTURE.md`
- `next.config.ts`
- `package-lock.json`
- `package.json`
- `postcss.config.mjs`
- `scripts/import.ts`
- `scripts/profile-codes.ts`
- `src/codes.ts`
- `src/criteria.ts`
- `src/graph.ts`
- `src/load.ts`
- `src/views.ts`
- `tests/criteria.test.ts`
- `tests/data.test.ts`
- `tests/graph.test.ts`
- `tests/views.test.ts`
- `tsconfig.json`

</details>

<!-- /entry -->
